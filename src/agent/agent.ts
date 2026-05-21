/**
 * Public Agent facade and runtime orchestrator.
 *
 * The class intentionally owns the public fluent API while delegating extracted
 * policy, cache, validation, and prompt-compression concerns to smaller modules.
 * Keep new behavior behind focused helpers so this file remains an orchestrator
 * instead of accumulating backend-specific implementation details.
 */
import {
  ConfigurationError,
  UnsupportedInputError,
} from "../errors/index.js";
import { modelRegistry } from "../model-registry/registry.js";
import { ProviderFactory } from "../provider-registry/factory.js";
import { PROVIDER_REGISTRY } from "../provider-registry/registry.js";
import type { ProviderDefinition } from "../provider-registry/registry.js";
import type { BaseLLMProvider } from "../providers/base.provider.js";
import type { ToolDefinition } from "../protocols/types.js";
import type { ModelConfig, ProviderType } from "../types/config.types.js";
import { ConsoleLogger } from "../types/logger.js";
import type { Logger } from "../types/logger.js";
import { parseModelString } from "../types/model-parser.js";
import type { ModelCapabilities, StreamChunk } from "../types/provider.types.js";
import type { ResolvedRetryStrategy } from "../types/retry.types.js";
import type { AgentAdapter } from "./adapters/types.js";
import type { CreatorPack } from "./creator/types.js";
import {
  mergeToolPolicies,
  type ToolPolicy,
} from "./adapters/tool-policy.js";
import { AGENT_DEFAULTS, AgentConfigSchema } from "./config.js";
import type { AgentCreateConfig, ValidatedAgentConfig } from "./config.js";
import { registerAgentForProcessCleanup, unregisterAgentForProcessCleanup } from "./lifecycle.js";
import {
  createRunAdapterScope as createScopedRunAdapters,
  type RunAdapterScope,
} from "./adapters/run-scope.js";
import { attachAgentAdapter } from "./adapters/attachment-manager.js";
import {
  cleanupAttachedAdapters,
  cleanupRunOnlyAdapters,
  initializeAttachedAdapters,
  initializeRunOnlyAdapters,
  type PendingAdapterInit,
} from "./adapters/lifecycle-manager.js";
import type { AgentEventEmitter } from "./events.js";
import { type AgentMemoryStore } from "./memory/index.js";
import { estimateRunCost, type CostEstimate } from "./budgets.js";
import {
  estimateModelRunCost,
  inspectModel,
  listModelCatalog,
  modelSupports,
} from "./model-catalog-service.js";
import type {
  AgentResponse,
  AgentRunParams,
  CatalogFilter,
  ModelInfo,
  RetryConfig,
} from "./types.js";
import {
  runAgentRuntime,
  streamAgentRuntime,
  type AgentRuntimeContext,
} from "./runtime/agent-runtime.js";
import { buildAgentRuntimeContext } from "./runtime/context-builder.js";
import { createToolExecutionBudget } from "./tools/tool-budget.js";
import type { AgentWorkspaceInstance } from "./workspace.js";

export class Agent {
  readonly name: string | undefined;
  private readonly unifiedProvider: BaseLLMProvider;
  private readonly adapters: AgentAdapter[] = [];
  private readonly pendingInits: PendingAdapterInit[] = [];
  private readonly pendingConflictChecks: Array<() => Promise<void>> = [];
  private readonly resolvedDynamicToolNames = new Set<string>();
  private readonly externallyManagedAdapters = new Set<AgentAdapter>();
  private readonly cacheInflight = new Map<string, Promise<unknown>>();
  private events: AgentEventEmitter | undefined;
  private memory: AgentMemoryStore | undefined;
  private initialized = false;
  private disposed = false;
  private cacheStats = {
    hits: 0,
    misses: 0,
    writes: 0,
    skippedUnsafe: 0,
    stale: 0,
    corrupt: 0,
    oversized: 0,
    toolCallsAvoided: 0,
    estimatedSavedTokens: 0,
  };

  private constructor(
    readonly provider: string,
    readonly model: string,
    private readonly config: ValidatedAgentConfig,
    private readonly logger: Logger,
    private readonly retry: ResolvedRetryStrategy,
    private readonly costFactor: number,
  ) {
    this.name = config.name;
    this.unifiedProvider = ProviderFactory.build(
      config as ModelConfig,
      logger,
      retry,
    );
    registerAgentForProcessCleanup(this);
  }

  static create(config: AgentCreateConfig): Agent {
    const { provider, modelId } = parseModelString(config.model);
    const merged = { ...AGENT_DEFAULTS, ...config };

    if (!merged.maxTokens) {
      const caps = modelRegistry.lookup(provider, modelId);
      merged.maxTokens = caps.maxOutputTokens;
    }

    const result = AgentConfigSchema.safeParse({
      provider,
      ...merged,
      model: modelId,
    });
    if (!result.success) {
      throw new ConfigurationError(
        result.error.issues.map((issue) => issue.message).join("; "),
      );
    }

    const definition = (
      PROVIDER_REGISTRY as Record<string, ProviderDefinition | undefined>
    )[provider];
    const costFactor = definition?.costFactor ?? 1;
    const logger = merged.logger ?? new ConsoleLogger();
    const retry = toResolvedRetry(merged.retry ?? AGENT_DEFAULTS.retry);

    const agent = new Agent(provider, modelId, result.data, logger, retry, costFactor);
    if (merged.workspace) agent.applyWorkspace(merged.workspace);
    if (merged.memory) agent.setMemory(merged.memory);
    return agent;
  }

  async run(params: AgentRunParams): Promise<AgentResponse> {
    return await runAgentRuntime(this.createRuntimeContext(), params);
  }

  async *stream(params: AgentRunParams): AsyncGenerator<StreamChunk> {
    yield* streamAgentRuntime(this.createRuntimeContext(), params);
  }

  use(adapter: AgentAdapter | CreatorPack): this {
    const changed = attachAgentAdapter(adapter, {
      adapters: this.adapters,
      pendingInits: this.pendingInits,
      pendingConflictChecks: this.pendingConflictChecks,
      resolvedDynamicToolNames: this.resolvedDynamicToolNames,
      capabilities: this.getCapabilities(),
      model: this.model,
    });
    if (changed) this.initialized = false;
    return this;
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    unregisterAgentForProcessCleanup(this);

    await cleanupAttachedAdapters({
      adapters: this.adapters,
      externallyManagedAdapters: this.externallyManagedAdapters,
    });
  }

  static inspect(model: string): ModelInfo {
    return inspectModel(model);
  }

  static supports(
    model: string,
    capability: keyof ModelInfo["capabilities"],
  ): boolean {
    return modelSupports(model, capability);
  }

  static catalog(filter?: CatalogFilter): ModelInfo[] {
    return listModelCatalog(filter);
  }

  static estimateCost(
    model: string,
    params: Pick<
      AgentRunParams,
      "prompt" | "system" | "maxTokens" | "tools" | "budget"
    >,
  ): CostEstimate {
    return estimateModelRunCost(model, params);
  }

  estimateCost(
    params: Pick<
      AgentRunParams,
      "prompt" | "system" | "maxTokens" | "tools" | "budget"
    >,
  ): CostEstimate {
    return estimateRunCost(
      params,
      this.getCapabilities(),
      params.budget?.costOptions,
    );
  }

  getCapabilities(): ModelCapabilities {
    return modelRegistry.lookup(this.provider, this.model);
  }

  getAttachedAdapters(): readonly AgentAdapter[] {
    return this.adapters;
  }

  markAdaptersExternallyManaged(adapters: readonly AgentAdapter[]): void {
    const external = new Set(adapters);
    for (const adapter of adapters) this.externallyManagedAdapters.add(adapter);
    for (let index = this.pendingInits.length - 1; index >= 0; index--) {
      if (external.has(this.pendingInits[index]!.adapter)) {
        this.pendingInits.splice(index, 1);
      }
    }
  }

  setCache(cache: ValidatedAgentConfig["cache"]): void {
    this.config.cache = cache;
  }

  setToolPolicy(policy: ToolPolicy | undefined): void {
    this.config.toolPolicy = policy;
  }

  mergeToolPolicy(policy: ToolPolicy | undefined): void {
    this.config.toolPolicy = mergeToolPolicies(this.config.toolPolicy, policy);
  }

  setEventEmitter(events: AgentEventEmitter | undefined): void {
    this.events = events;
    this.memory?.setEventEmitter?.(events);
  }

  setMemory(memory: AgentMemoryStore | undefined): void {
    this.memory = memory;
    this.memory?.setEventEmitter?.(this.events);
  }

  applyWorkspace(workspace: AgentWorkspaceInstance): void {
    if (workspace.cache) this.setCache(workspace.cache);
    this.setEventEmitter(workspace.events);
    this.mergeToolPolicy(workspace.toolPolicy);
    this.setMemory(workspace.memory);
    for (const adapter of workspace.adapters) this.use(adapter);
    for (const mcp of workspace.mcps) this.use(mcp);
  }

  cloneWithSystem(system: string, name?: string): Agent {
    const config = {
      ...this.config,
      system,
      ...(name !== undefined && { name }),
    } as ValidatedAgentConfig;
    const clone = new Agent(
      this.provider,
      this.model,
      config,
      this.logger,
      this.retry,
      this.costFactor,
    );
    for (const adapter of this.adapters) clone.use(adapter);
    if (Object.prototype.hasOwnProperty.call(this, "run")) {
      clone.run = this.run.bind(clone);
    }
    clone.setEventEmitter(this.events);
    return clone;
  }

  private createRuntimeContext(): AgentRuntimeContext {
    return buildAgentRuntimeContext({
      provider: this.provider,
      model: this.model,
      costFactor: this.costFactor,
      unifiedProvider: this.unifiedProvider,
      attachedAdapters: this.adapters,
      config: this.config,
      getCacheStats: () => this.cacheStats,
      cacheInflight: this.cacheInflight,
      getCapabilities: () => this.getCapabilities(),
      resetCacheStats: () => this.resetCacheStats(),
      validateInputs: (params) => this.validateInputs(params),
      ensureAttachedAdaptersInitialized: async () => {
        if (!this.initialized) await this.initAdapters();
      },
      createRunAdapterScope: (params) => this.createRunAdapterScope(params),
      initRunAdapters: (adapters) => this.initRunAdapters(adapters),
      cleanupRunAdapters: (adapters) => this.cleanupRunAdapters(adapters),
      ...(this.events !== undefined && { events: this.events }),
      ...(this.memory !== undefined && { memory: this.memory }),
    });
  }

  private validateInputs(params: AgentRunParams): void {
    const caps = this.getCapabilities();
    if (params.images?.length && !caps.supportsVision)
      throw new UnsupportedInputError("images", this.model);
    if (params.audio?.length && !caps.supportsAudio)
      throw new UnsupportedInputError("audio", this.model);
    if (params.video?.length && !caps.supportsVideo)
      throw new UnsupportedInputError("video", this.model);
    if (params.files?.length && !caps.supportsFiles)
      throw new UnsupportedInputError("files", this.model);
  }

  private async initAdapters(): Promise<void> {
    await initializeAttachedAdapters(this.pendingInits, this.pendingConflictChecks);
    this.initialized = true;
  }

  private async collectTools(params: AgentRunParams): Promise<ToolDefinition[]> {
    return await this.createRuntimeContext().collectTools(
      params,
      undefined,
      this.adapters,
      createToolExecutionBudget(params),
    );
  }

  private resetCacheStats(): void {
    this.cacheStats = {
      hits: 0,
      misses: 0,
      writes: 0,
      skippedUnsafe: 0,
      stale: 0,
      corrupt: 0,
      oversized: 0,
      toolCallsAvoided: 0,
      estimatedSavedTokens: 0,
    };
  }

  private createRunAdapterScope(params: AgentRunParams): RunAdapterScope {
    return createScopedRunAdapters({
      currentAdapters: this.adapters,
      params,
      capabilities: this.getCapabilities(),
      model: this.model,
    });
  }

  private async initRunAdapters(
    adapters: readonly AgentAdapter[],
  ): Promise<void> {
    await initializeRunOnlyAdapters(adapters);
  }

  private async cleanupRunAdapters(
    adapters: readonly AgentAdapter[],
  ): Promise<void> {
    await cleanupRunOnlyAdapters(adapters);
  }
}

function toResolvedRetry(config: RetryConfig): ResolvedRetryStrategy {
  const multiplier =
    config.backoff === "fixed" ? 1 : config.backoff === "linear" ? 1 : 2;
  return {
    maxAttempts: config.maxAttempts,
    initialDelay: config.initialDelay,
    backoffMultiplier: multiplier,
    maxDelay: config.maxDelay,
    jitter: true,
  };
}
