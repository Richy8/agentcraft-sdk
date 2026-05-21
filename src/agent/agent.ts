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
import type { ToolDefinition } from "../protocols/types.js";
import type { BaseLLMProvider } from "../providers/base.provider.js";
import type { ModelConfig, ProviderType } from "../types/config.types.js";
import { ConsoleLogger } from "../types/logger.js";
import type { Logger } from "../types/logger.js";
import { parseModelString } from "../types/model-parser.js";
import type {
  LLMCallParams,
  LLMResponse,
  ModelCapabilities,
  StreamChunk,
} from "../types/provider.types.js";
import type { ResolvedRetryStrategy } from "../types/retry.types.js";
import type { AgentAdapter } from "./adapters/types.js";
import type { CreatorPack } from "./creator/types.js";
import {
  mergeToolPolicies,
  type ToolAuditEvent,
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
import type { RunTracer } from "./observability.js";
import type { AgentEventEmitter } from "./events.js";
import { type AgentMemoryStore } from "./memory/index.js";
import { estimateRunCost, type CostEstimate } from "./budgets.js";
import type { AgentSkill } from "./skills/types.js";
import {
  selectActiveSkillMatches as selectActiveSkillMatchesForRun,
  selectActiveSkills as selectActiveSkillsForRun,
} from "./skills/activation-engine.js";
import {
  estimateModelRunCost,
  inspectModel,
  listModelCatalog,
  modelSupports,
} from "./model-catalog-service.js";
import {
  assembleSkillPromptForRun,
  compileSkillRuntimeContext,
  inspectSkillPromptAssembly,
  type SkillPromptAssemblyContext,
} from "./skills/prompt-assembler.js";
import type {
  AgentResponse,
  AgentRunParams,
  CatalogFilter,
  ModelInfo,
  PromptCompressionMode,
  RetryConfig,
  SkillPromptAssemblyMode,
  SkillPromptAssemblyRecord,
} from "./types.js";
import { preprocessDirectives } from "./utils/directives.js";
import { compressSkillPromptSystem } from "./runtime/prompt-compression.js";
import { callModelStructuredOutputFlow } from "./runtime/structured-output-flow.js";
import type { StructuredOutputToolState } from "./runtime/structured-output-handler.js";
import { createToolExecutionBudget, type ToolExecutionBudget } from "./tools/tool-budget.js";
import { validateCachePolicy as validateToolCachePolicy } from "./tools/tool-cache-manager.js";
import { collectToolsForRun } from "./tools/tool-manager.js";
import { selectToolAdaptersForActiveSkills } from "./tools/tool-selection.js";
import {
  runAgentRuntime,
  streamAgentRuntime,
  type AgentRuntimeContext,
} from "./runtime/agent-runtime.js";
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
    return {
      provider: this.provider,
      model: this.model,
      costFactor: this.costFactor,
      unifiedProvider: this.unifiedProvider,
      attachedAdapters: this.adapters,
      skillActivationMode: this.config.skillActivation ?? "always",
      toolSelectionMode: this.config.toolSelection ?? "all",
      getCacheStats: () => this.cacheStats,
      getCapabilities: () => this.getCapabilities(),
      resetCacheStats: () => this.resetCacheStats(),
      validateInputs: (params) => this.validateInputs(params),
      validateCachePolicy: (params) => this.validateCachePolicy(params),
      ensureAttachedAdaptersInitialized: async () => {
        if (!this.initialized) await this.initAdapters();
      },
      createRunAdapterScope: (params) => this.createRunAdapterScope(params),
      initRunAdapters: (adapters) => this.initRunAdapters(adapters),
      cleanupRunAdapters: (adapters) => this.cleanupRunAdapters(adapters),
      applySkillSystemPrompts: (params, adapters, records) =>
        this.applySkillSystemPrompts(params, adapters, records),
      resolvePromptCompression: (params) => this.resolvePromptCompression(params),
      resolveSkillPromptAssembly: (params) => this.resolveSkillPromptAssembly(params),
      selectActiveSkillMatches: (params, adapters) =>
        this.selectActiveSkillMatches(params, adapters),
      applyPromptCompression: (params, mode) => this.applyPromptCompression(params, mode),
      preprocessDirectives: (params, adapters, records) =>
        this.preprocessDirectives(params, adapters, records),
      collectTools: (params, traceContext, adapters, executionBudget) =>
        this.collectTools(params, traceContext, adapters, executionBudget),
      toLLMParams: (params) => this.toLLMParams(params),
      callModelWithStructuredOutput: (
        llmParams,
        tools,
        runParams,
        structuredTool,
        tracer,
        parentSpanId,
      ) =>
        this.callModelWithStructuredOutput(
          llmParams,
          tools,
          runParams,
          structuredTool,
          tracer,
          parentSpanId,
        ),
      isCacheBypassed: (params) => this.isCacheBypassed(params),
      ...(this.events !== undefined && { events: this.events }),
      ...(this.memory !== undefined && { memory: this.memory }),
    };
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

  private applySkillSystemPrompts(
    params: AgentRunParams,
    adapters: readonly AgentAdapter[] = this.adapters,
    assemblyRecords: SkillPromptAssemblyRecord[] = [],
  ): AgentRunParams {
    const seen = new Set<string>();
    const assemblyMode = this.resolveSkillPromptAssembly(params);
    const matches = this.selectActiveSkillMatches(params, adapters);
    const directiveOnlyBoundarySkills = new Set(
      matches
        .filter((match) => match.reason === "directive")
        .map((match) => match.skill.name),
    );
    const extensions = matches.flatMap((match) => {
      const skill = match.skill;
      if (seen.has(skill.name)) return [];
      seen.add(skill.name);
      if (
        directiveOnlyBoundarySkills.has(skill.name) &&
        (this.config.skillActivation ?? "always") === "directive-only"
      ) {
        return [];
      }
      const assemblyContext = {
        prompt: params.prompt ?? "",
        adapters,
        activeSkillCount: matches.length,
        activationMode: this.config.skillActivation ?? "always",
        assemblyMode,
      } satisfies SkillPromptAssemblyContext;
      const promptExtension = assembleSkillPromptForRun(skill, assemblyContext);
      const runtimeContext = compileSkillRuntimeContext(skill, params.prompt ?? "", adapters);
      if (promptExtension) {
        assemblyRecords.push(
          inspectSkillPromptAssembly(skill, assemblyContext, {
            promptExtension,
            runtimeContext,
            directiveBoundary: false,
          }),
        );
      }
      return [
        promptExtension,
        runtimeContext,
      ].filter((item): item is string => item !== undefined && item.trim().length > 0);
    });

    if (extensions.length === 0) return params;
    return {
      ...params,
      system: [params.system, ...extensions].filter(Boolean).join("\n\n"),
    };
  }

  private applyPromptCompression(
    params: AgentRunParams,
    mode: PromptCompressionMode,
  ): AgentRunParams {
    if (mode === "none" || !params.system) return params;
    return { ...params, system: compressSkillPromptSystem(params.system, mode) };
  }

  private resolvePromptCompression(params: AgentRunParams): PromptCompressionMode {
    return params.promptCompression ?? this.config.promptCompression ?? "none";
  }

  private resolveSkillPromptAssembly(params: AgentRunParams): SkillPromptAssemblyMode {
    return params.skillPromptAssembly ?? this.config.skillPromptAssembly ?? "adaptive-safe";
  }

  private async collectTools(
    params: AgentRunParams,
    traceContext?: { tracer: RunTracer; parentSpanId: string },
    adapters: readonly AgentAdapter[] = this.adapters,
    executionBudget: ToolExecutionBudget = createToolExecutionBudget(params),
  ): Promise<ToolDefinition[]> {
    const toolAdapters =
      this.config.toolSelection === "auto"
        ? this.selectToolAdapters(params, adapters)
        : adapters.filter((item) => item.getTools);
    return await collectToolsForRun({
      params,
      toolAdapters,
      ...(traceContext !== undefined && { traceContext }),
      executionBudget,
      cacheContext: {
        provider: this.provider,
        model: this.model,
        cache: this.config.cache,
        cacheStats: this.cacheStats,
        cacheInflight: this.cacheInflight,
        ...(this.events !== undefined && { events: this.events }),
      },
      ...(this.config.toolPolicy !== undefined && { baseToolPolicy: this.config.toolPolicy }),
      applyEventPolicy: (policy) => this.withEventPolicy(policy),
    });
  }

  private validateCachePolicy(params: AgentRunParams): void {
    validateToolCachePolicy(params, this.config.cache);
  }

  private isCacheBypassed(params: AgentRunParams): boolean {
    return (
      this.config.cache?.config.type === "disabled" ||
      params.cache === false ||
      params.cache?.bypass === true
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

  private withEventPolicy(policy: ToolPolicy | undefined): ToolPolicy | undefined {
    if (!policy && !this.events) return undefined;
    if (!this.events) return policy;
    const userAudit = policy?.onAuditEvent;
    return {
      ...(policy ?? {}),
      onAuditEvent: async (event: ToolAuditEvent) => {
        await userAudit?.(event);
        if (event.type === "approval_required") {
          this.events?.emit("approval.requested", {
            toolName: event.toolName,
            ...(event.sideEffect !== undefined && { sideEffect: event.sideEffect }),
          });
        }
        if (event.type === "approval_granted")
          this.events?.emit("approval.granted", { toolName: event.toolName });
        if (event.type === "approval_denied")
          this.events?.emit("approval.denied", { toolName: event.toolName });
        if (event.type === "approval_queued")
          this.events?.emit("approval.queued", {
            toolName: event.toolName,
            requestId: event.requestId,
            ...(event.reviewer !== undefined && { reviewer: event.reviewer }),
            ...(event.expiresAt !== undefined && { expiresAt: event.expiresAt }),
          });
        if (event.type === "approval_expired")
          this.events?.emit("approval.expired", {
            toolName: event.toolName,
            requestId: event.requestId,
          });
      },
    };
  }

  private preprocessDirectives(
    params: AgentRunParams,
    adapters: readonly AgentAdapter[] = this.adapters,
    assemblyRecords: SkillPromptAssemblyRecord[] = [],
  ): AgentRunParams {
    const assemblyMode = this.resolveSkillPromptAssembly(params);
    const result = preprocessDirectives(params.prompt!, [...adapters], {
      promptForSkill: (skill) => {
        const assemblyContext = {
          prompt: params.prompt ?? "",
          adapters,
          activeSkillCount: this.selectActiveSkillMatches(params, adapters).length || 1,
          activationMode: this.config.skillActivation ?? "always",
          assemblyMode,
        } satisfies SkillPromptAssemblyContext;
        const promptExtension = assembleSkillPromptForRun(skill, assemblyContext);
        const runtimeContext = compileSkillRuntimeContext(skill, params.prompt ?? "", adapters);
        if (promptExtension) {
          assemblyRecords.push(
            inspectSkillPromptAssembly(skill, assemblyContext, {
              promptExtension,
              runtimeContext,
              directiveBoundary: true,
            }),
          );
        }
        return [
          promptExtension,
          runtimeContext,
        ]
          .filter((item): item is string => item !== undefined && item.trim().length > 0)
          .join("\n\n");
      },
    });
    return {
      ...params,
      prompt: result.processedPrompt,
      system: [params.system, result.additionalSystemContent.trim()]
        .filter(Boolean)
        .join("\n\n"),
    };
  }

  private selectActiveSkills(
    params: AgentRunParams,
    adapters: readonly AgentAdapter[] = this.adapters,
  ): AgentSkill[] {
    return selectActiveSkillsForRun({
      params,
      adapters,
      mode: this.config.skillActivation ?? "always",
    });
  }

  private selectActiveSkillMatches(
    params: AgentRunParams,
    adapters: readonly AgentAdapter[] = this.adapters,
  ) {
    return selectActiveSkillMatchesForRun({
      params,
      adapters,
      mode: this.config.skillActivation ?? "always",
    });
  }

  private selectToolAdapters(
    params: AgentRunParams,
    adapters: readonly AgentAdapter[] = this.adapters,
  ): AgentAdapter[] {
    return selectToolAdaptersForActiveSkills({
      adapters,
      activeSkills: this.selectActiveSkills(params, adapters),
    });
  }

  private toLLMParams(runParams: AgentRunParams): LLMCallParams {
    return {
      prompt: runParams.prompt!,
      ...optional("systemMessage", runParams.system ?? this.config.system),
      ...optional(
        "temperature",
        runParams.temperature ?? this.config.temperature,
      ),
      ...optional("maxTokens", runParams.maxTokens ?? this.config.maxTokens),
      ...optional("topP", runParams.topP ?? this.config.topP),
      ...optional(
        "frequencyPenalty",
        runParams.frequencyPenalty ?? this.config.frequencyPenalty,
      ),
      ...optional(
        "presencePenalty",
        runParams.presencePenalty ?? this.config.presencePenalty,
      ),
      ...optional(
        "stopSequences",
        runParams.stopSequences ?? this.config.stopSequences,
      ),
      ...optional(
        "responseFormat",
        runParams.responseFormat ?? this.config.responseFormat,
      ),
      ...optional("signal", runParams.signal),
    };
  }

  private async callModelWithStructuredOutput(
    llmParams: LLMCallParams,
    allTools: readonly ToolDefinition[],
    params: AgentRunParams,
    structuredTool?: StructuredOutputToolState,
    tracer?: RunTracer,
    parentSpanId?: string,
  ): Promise<{ raw: LLMResponse; structuredResponse?: unknown }> {
    return await callModelStructuredOutputFlow({
      provider: this.unifiedProvider,
      llmParams,
      tools: allTools,
      params,
      ...(structuredTool !== undefined && { structuredTool }),
      ...(tracer !== undefined && { tracer }),
      ...(parentSpanId !== undefined && { parentSpanId }),
    });
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

function optional<T extends string, V>(
  key: T,
  value: V | undefined,
): { [K in T]: V } | Record<string, never> {
  return value === undefined ? {} : ({ [key]: value } as { [K in T]: V });
}
