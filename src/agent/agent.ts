import { costCalculator } from "../cost-calculator/index.js";
import {
  AdapterRequirementError,
  AdapterToolConflictError,
  ConfigurationError,
  QuotaExceededError,
  UnsupportedInputError,
} from "../errors/index.js";
import { MODEL_CATALOG } from "../model-registry/catalog.js";
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
import { isCreatorPack } from "./creator/types.js";
import type { CreatorPack, CreatorSkillManifest } from "./creator/types.js";
import {
  mergeToolPolicies,
  runToolWithPolicy,
  type ToolAuditEvent,
  type ToolPolicy,
} from "./adapters/tool-policy.js";
import { AGENT_DEFAULTS, AgentConfigSchema } from "./config.js";
import type { AgentCreateConfig, ValidatedAgentConfig } from "./config.js";
import { createCacheKey, type AgentCacheLookup } from "./cache.js";
import { RunTracer, type TraceSink } from "./observability.js";
import type { AgentEventEmitter } from "./events.js";
import {
  enforcePostRunBudget,
  enforcePreflight,
  estimateRunCost,
  type CostEstimate,
} from "./budgets.js";
import type { AdapterRef, AgentSkill } from "./skills/types.js";
import {
  parseAndValidateStructuredOutput,
  structuredOutputInstruction,
  type JsonSchema,
} from "./structured-output.js";
import type {
  AgentResponse,
  AgentRunParams,
  CatalogFilter,
  ModelInfo,
  RetryConfig,
} from "./types.js";
import { assembleResponse } from "./utils/assemble-response.js";
import { preprocessDirectives } from "./utils/directives.js";
import { resolvePrompt } from "./utils/resolve-prompt.js";

export class Agent {
  readonly name: string | undefined;
  private readonly unifiedProvider: BaseLLMProvider;
  private readonly adapters: AgentAdapter[] = [];
  private readonly pendingInits: Array<{
    adapter: AgentAdapter;
    init: () => Promise<void>;
  }> = [];
  private readonly pendingConflictChecks: Array<() => Promise<void>> = [];
  private readonly resolvedDynamicToolNames = new Set<string>();
  private readonly externallyManagedAdapters = new Set<AgentAdapter>();
  private readonly cacheInflight = new Map<string, Promise<unknown>>();
  private events: AgentEventEmitter | undefined;
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

    return new Agent(provider, modelId, result.data, logger, retry, costFactor);
  }

  async run(params: AgentRunParams): Promise<AgentResponse> {
    const replayed = resolveReplay(params);
    if (replayed) return replayed;
    this.resetCacheStats();
    const tracer = new RunTracer(toTraceSink(params.trace));
    const agentSpan = tracer.start("agent", "agent.run", {
      model: this.model,
      provider: this.provider,
    });
    params = { ...params, prompt: await resolvePrompt(params) };
    const runScope = this.createRunAdapterScope(params);
    this.validateInputs(params);
    this.validateCachePolicy(params);
    enforcePreflight(
      params,
      this.getCapabilities(),
      this.model,
      this.provider,
      params.budget,
    );
    if (!this.initialized) await this.initAdapters();
    await this.initRunAdapters(runScope.runOnlyAdapters);

    try {
      const executionBudget = createToolExecutionBudget(params);
      params = this.applySkillSystemPrompts(params, runScope.adapters);
      params = this.preprocessDirectives(params, runScope.adapters);
      params = this.applyStructuredOutputPrompt(params);
      const allTools = await this.collectTools(
        params,
        { tracer, parentSpanId: agentSpan.spanId },
        runScope.adapters,
        executionBudget,
      );
      const structuredTool = this.createStructuredOutputTool(params);
      const modelTools = structuredTool
        ? [
            ...allTools,
            this.wrapToolExecutionBudget(structuredTool.tool, executionBudget),
          ]
        : allTools;
      let runParams = params;
      for (const adapter of runScope.adapters) {
        const adapterSpan = tracer.start(
          "adapter",
          `${adapter.name}.onBeforeRun`,
          undefined,
          agentSpan.spanId,
        );
        if (adapter.onBeforeRun)
          runParams = await adapter.onBeforeRun(runParams);
        tracer.end(adapterSpan);
      }

      const llmParams = this.toLLMParams(runParams);
      const modelSpan = tracer.start(
        "model",
        "model.call",
        { tools: modelTools.length },
        agentSpan.spanId,
      );
      const { raw, structuredResponse } =
        await this.callModelWithStructuredOutput(
          llmParams,
          modelTools,
          params,
          structuredTool,
          tracer,
          modelSpan.spanId,
        );
      tracer.end(modelSpan);

      let response: AgentResponse = {
        content: raw.content,
        cost:
          raw.cost ??
          (this.costFactor === 0
            ? 0
            : costCalculator.calculate(raw.tokensUsed, this.getCapabilities())),
        tokensUsed: raw.tokensUsed,
        finishReason: raw.finishReason,
        model: this.model,
        provider: this.provider,
        runId: tracer.runId,
        promptProvenance: promptProvenance(params),
        selection: {
          skillActivation: this.config.skillActivation ?? "always",
          toolSelection: this.config.toolSelection ?? "all",
          activeSkills: this.selectActiveSkills(params, runScope.adapters).map(
            (skill) => skill.name,
          ),
          exposedTools: allTools.map((tool) => tool.name),
          executedToolCalls: executionBudget.count,
        },
        cache: {
          ...this.cacheStats,
          bypassed: this.isCacheBypassed(params),
        },
        ...(raw.toolCalls && { toolCalls: raw.toolCalls }),
      };

      if (structuredResponse !== undefined)
        response = { ...response, structuredResponse };

      this.events?.emit("cost.updated", {
        model: response.model,
        provider: response.provider,
        cost: response.cost,
        tokensUsed: response.tokensUsed,
      });

      for (const adapter of runScope.adapters) {
        if (adapter.onAfterRun) {
          const adapterSpan = tracer.start(
            "adapter",
            `${adapter.name}.onAfterRun`,
            undefined,
            agentSpan.spanId,
          );
          response = await adapter.onAfterRun(response);
          tracer.end(adapterSpan);
        }
      }

      tracer.end(agentSpan);
      enforcePostRunBudget(response, params.budget, this.provider);
      return { ...response, trace: tracer.export() };
    } finally {
      await this.cleanupRunAdapters(runScope.runOnlyAdapters);
    }
  }

  async *stream(params: AgentRunParams): AsyncGenerator<StreamChunk> {
    const tracer = new RunTracer(toTraceSink(params.trace));
    const agentSpan = tracer.start("agent", "agent.stream", {
      model: this.model,
      provider: this.provider,
    });
    params = { ...params, prompt: await resolvePrompt(params) };
    const runScope = this.createRunAdapterScope(params);
    this.validateInputs(params);
    this.validateCachePolicy(params);
    if (!this.initialized) await this.initAdapters();
    await this.initRunAdapters(runScope.runOnlyAdapters);

    try {
      const executionBudget = createToolExecutionBudget(params);
      params = this.applySkillSystemPrompts(params, runScope.adapters);
      params = this.preprocessDirectives(params, runScope.adapters);
      params = this.applyStructuredOutputPrompt(params);
      const allTools = await this.collectTools(
        params,
        { tracer, parentSpanId: agentSpan.spanId },
        runScope.adapters,
        executionBudget,
      );
      let runParams = params;
      for (const adapter of runScope.adapters) {
        if (adapter.onBeforeRun)
          runParams = await adapter.onBeforeRun(runParams);
      }

      const llmParams = this.toLLMParams(runParams);
      yield* this.streamWithHooks(
        llmParams,
        allTools,
        tracer,
        agentSpan.spanId,
        params.signal,
      );
      tracer.end(agentSpan);
    } finally {
      await this.cleanupRunAdapters(runScope.runOnlyAdapters);
    }
  }

  use(adapter: AgentAdapter | CreatorPack): this {
    if (isCreatorPack(adapter)) {
      for (const attachment of adapter.attachments) {
        if (this.adapters.some((item) => item.name === attachment.name))
          continue;
        this.use(attachment);
      }
      return this;
    }

    if (this.adapters.some((item) => item.name === adapter.name)) return this;

    const caps = this.getCapabilities();
    for (const req of adapter.requires ?? []) {
      const supported = {
        tools: caps.supportsTools,
        vision: caps.supportsVision,
        audio: caps.supportsAudio,
        video: caps.supportsVideo,
        files: caps.supportsFiles,
      }[req];
      if (!supported) {
        throw new AdapterRequirementError(
          `Adapter '${adapter.name}' requires '${req}' but '${this.model}' does not support it.`,
        );
      }
    }

    if (isAgentSkill(adapter)) {
      for (const dep of adapter.dependsOn ?? []) {
        if (Array.isArray(dep)) {
          if (!dep.some((ref) => this.isAttached(ref))) {
            const names = dep.map(adapterRefName).join(" or ");
            throw new AdapterRequirementError(
              `Skill '${adapter.name}' requires at least one of: [${names}]`,
            );
          }
        } else if (!this.isAttached(dep)) {
          throw new AdapterRequirementError(
            `Skill '${adapter.name}' requires '${adapterRefName(dep)}' - attach it first`,
          );
        }
      }
    }

    const existingStaticNames = new Set(
      this.adapters.flatMap((item) => item.declaredToolNames ?? []),
    );
    for (const name of adapter.declaredToolNames ?? []) {
      if (existingStaticNames.has(name)) {
        throw new AdapterToolConflictError(
          `Tool name conflict: '${adapter.name}' registers tool '${name}' which is already registered`,
        );
      }
    }

    if (!adapter.declaredToolNames && adapter.getTools) {
      this.pendingConflictChecks.push(async () => {
        const tools = await adapter.getTools!();
        const allKnown = new Set([
          ...this.adapters.flatMap((item) => item.declaredToolNames ?? []),
          ...this.resolvedDynamicToolNames,
        ]);
        for (const tool of tools) {
          if (allKnown.has(tool.name)) {
            throw new AdapterToolConflictError(
              `Tool name conflict (post-init): '${adapter.name}' exposes '${tool.name}' which conflicts`,
            );
          }
        }
        tools.forEach((tool) => this.resolvedDynamicToolNames.add(tool.name));
      });
    }

    this.adapters.push(adapter);
    if (adapter.init)
      this.pendingInits.push({ adapter, init: () => adapter.init!() });
    this.initialized = false;
    return this;
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    unregisterAgentForProcessCleanup(this);

    for (const adapter of [...this.adapters].reverse()) {
      if (!this.externallyManagedAdapters.has(adapter) && adapter.cleanup)
        await adapter.cleanup();
    }
  }

  static inspect(model: string): ModelInfo {
    const { provider, modelId } = parseModelString(model);
    const caps = modelRegistry.lookup(provider, modelId);
    return {
      model: modelId,
      provider,
      capabilities: {
        contextWindow: caps.maxContextLength,
        maxOutput: caps.maxOutputTokens,
        vision: caps.supportsVision,
        audio: caps.supportsAudio,
        video: caps.supportsVideo,
        files: caps.supportsFiles,
        tools: caps.supportsTools,
        streaming: caps.supportsStreaming,
        jsonMode: caps.supportsJsonMode,
      },
      pricing: {
        inputPerM: caps.costPerMInputToken,
        outputPerM: caps.costPerMOutputToken,
        ...(caps.cachedInputDiscount !== undefined && {
          cachedDiscount: caps.cachedInputDiscount,
        }),
        ...(caps.costPerRequest !== undefined && {
          perRequest: caps.costPerRequest,
        }),
        ...(caps.pricingMetadata !== undefined && {
          currency: caps.pricingMetadata.currency,
          sourceUrl: caps.pricingMetadata.sourceUrl,
          updatedAt: caps.pricingMetadata.updatedAt,
          ...(caps.pricingMetadata.notes !== undefined && {
            notes: caps.pricingMetadata.notes,
          }),
        }),
      },
      scores: { quality: caps.qualityScore, speed: caps.speedScore },
      optimizedFor: [...caps.optimizedFor],
      deprecated: caps.deprecated ?? false,
      local: caps.costPerMInputToken === 0 && caps.costPerMOutputToken === 0,
    };
  }

  static supports(
    model: string,
    capability: keyof ModelInfo["capabilities"],
  ): boolean {
    return Boolean(Agent.inspect(model).capabilities[capability]);
  }

  static catalog(filter?: CatalogFilter): ModelInfo[] {
    const all = Object.entries(MODEL_CATALOG)
      .filter(([key]) => key !== "__default__" && !key.endsWith(":__default__"))
      .map(([key]) => Agent.inspect(key));

    if (!filter) return all.filter((entry) => !entry.deprecated);

    return all.filter((entry) => {
      if (!filter.deprecated && entry.deprecated) return false;
      if (filter.provider && entry.provider !== filter.provider) return false;
      if (
        filter.optimizedFor &&
        !entry.optimizedFor.includes(filter.optimizedFor)
      )
        return false;
      if (
        filter.minQuality !== undefined &&
        entry.scores.quality < filter.minQuality
      )
        return false;
      if (filter.minSpeed !== undefined && entry.scores.speed < filter.minSpeed)
        return false;
      if (
        filter.vision !== undefined &&
        entry.capabilities.vision !== filter.vision
      )
        return false;
      if (
        filter.audio !== undefined &&
        entry.capabilities.audio !== filter.audio
      )
        return false;
      if (
        filter.tools !== undefined &&
        entry.capabilities.tools !== filter.tools
      )
        return false;
      if (
        filter.streaming !== undefined &&
        entry.capabilities.streaming !== filter.streaming
      )
        return false;
      return true;
    });
  }

  static estimateCost(
    model: string,
    params: Pick<
      AgentRunParams,
      "prompt" | "system" | "maxTokens" | "tools" | "budget"
    >,
  ): CostEstimate {
    const { provider, modelId } = parseModelString(model);
    const caps = modelRegistry.lookup(provider, modelId);
    return estimateRunCost(params, caps, params.budget?.costOptions);
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
    for (const pending of this.pendingInits) await pending.init();
    for (const check of this.pendingConflictChecks) await check();
    this.pendingInits.length = 0;
    this.pendingConflictChecks.length = 0;
    this.initialized = true;
  }

  private applySkillSystemPrompts(
    params: AgentRunParams,
    adapters: readonly AgentAdapter[] = this.adapters,
  ): AgentRunParams {
    const seen = new Set<string>();
    const activeSkills = this.selectActiveSkills(params, adapters);
    const extensions = activeSkills.flatMap((skill) => {
      if (seen.has(skill.name)) return [];
      seen.add(skill.name);
      if (!skill.systemPromptExtension) return [];
      return typeof skill.systemPromptExtension === "function"
        ? [skill.systemPromptExtension()]
        : [skill.systemPromptExtension];
    });

    if (extensions.length === 0) return params;
    return {
      ...params,
      system: [params.system, ...extensions].filter(Boolean).join("\n\n"),
    };
  }

  private async collectTools(
    params: AgentRunParams,
    traceContext?: { tracer: RunTracer; parentSpanId: string },
    adapters: readonly AgentAdapter[] = this.adapters,
    executionBudget: ToolExecutionBudget = createToolExecutionBudget(params),
  ): Promise<ToolDefinition[]> {
    const adapterTools: ToolDefinition[] = [];
    const toolAdapters =
      this.config.toolSelection === "auto"
        ? this.selectToolAdapters(params, adapters)
        : adapters.filter((item) => item.getTools);
    for (const adapter of toolAdapters) {
      const isMcp = adapter.metadata?.kind === "mcp-backed";
      const mcpSpan =
        isMcp && traceContext
          ? traceContext.tracer.start(
              "mcp",
              `${adapter.name}.discoverTools`,
              { adapter: adapter.name },
              traceContext.parentSpanId,
            )
          : undefined;
      try {
        const tools = await adapter.getTools!();
        adapterTools.push(
          ...tools.map((tool) =>
            isMcp && traceContext
              ? wrapMcpTool(tool, adapter.name, traceContext)
              : tool,
          ),
        );
        if (mcpSpan) traceContext!.tracer.end(mcpSpan);
      } catch (error) {
        if (mcpSpan) traceContext!.tracer.end(mcpSpan, error);
        throw error;
      }
    }
    const allTools = [...adapterTools, ...(params.tools ?? [])];
    assertUniqueToolDefinitions(allTools);
    const policy = this.withEventPolicy(
      withTracePolicy(
        mergeToolPolicies(this.config.toolPolicy, params.toolPolicy),
        traceContext,
      ),
    );
    return allTools.map((tool) => {
      const executeWithPolicy =
        !tool.security?.requiresConfirmation && !policy
          ? tool.execute
          : (args: Record<string, unknown>) =>
              runToolWithPolicy(tool, args, policy);
      const executeWithCache = async (args: Record<string, unknown>) =>
        await this.executeToolWithCache(tool, args, executeWithPolicy, params);
      const executeWithBudget = async (args: Record<string, unknown>) =>
        await this.executeToolWithBudget(
          tool,
          args,
          executeWithCache,
          executionBudget,
        );
      if (!traceContext) return { ...tool, execute: executeWithBudget };
      return {
        ...tool,
        execute: async (args: Record<string, unknown>) => {
          const span = traceContext.tracer.start(
            "tool",
            `tool.${tool.name}`,
            { toolName: tool.name },
            traceContext.parentSpanId,
          );
          try {
            const result = await executeWithBudget(args);
            traceContext.tracer.end(span);
            return result;
          } catch (error) {
            traceContext.tracer.end(span, error);
            throw error;
          }
        },
      };
    });
  }

  private async executeToolWithBudget(
    tool: ToolDefinition,
    args: Record<string, unknown>,
    execute: (args: Record<string, unknown>) => Promise<unknown>,
    budget: ToolExecutionBudget,
  ): Promise<unknown> {
    if (budget.max !== undefined && budget.count >= budget.max) {
      throw new QuotaExceededError(this.provider, {
        budget: "maxToolCalls",
        limit: budget.max,
        actual: budget.count + 1,
        toolName: tool.name,
      });
    }
    budget.count++;
    return await execute(args);
  }

  private wrapToolExecutionBudget(
    tool: ToolDefinition,
    budget: ToolExecutionBudget,
  ): ToolDefinition {
    return {
      ...tool,
      execute: async (args) =>
        await this.executeToolWithBudget(
          tool,
          args,
          tool.execute.bind(tool),
          budget,
        ),
    };
  }

  private async executeToolWithCache(
    tool: ToolDefinition,
    args: Record<string, unknown>,
    execute: (args: Record<string, unknown>) => Promise<unknown>,
    params: AgentRunParams,
  ): Promise<unknown> {
    const cache = this.config.cache;
    const sideEffect = tool.security?.sideEffect ?? "external";
    this.events?.emit("tool.called", {
      toolName: tool.name,
      sideEffectLevel: sideEffect as "none" | "read" | "write" | "external",
    });
    const requireCached = this.isCacheRequiredForTool(params, tool.name);
    if (
      (!cache?.get && !cache?.getEntry) ||
      !cache.set ||
      cache.config.type === "disabled" ||
      this.isCacheBypassed(params)
    ) {
      if (requireCached) this.throwRequiredCacheMiss(tool.name, "unavailable");
      return await execute(args);
    }
    if (sideEffect !== "none" && sideEffect !== "read") {
      this.cacheStats.skippedUnsafe++;
      if (requireCached) this.throwRequiredCacheMiss(tool.name, "unsafe");
      return await execute(args);
    }

    const key = this.createToolCacheKey(tool, sideEffect, args, cache);
    const entry = await this.readCacheEntry(cache, key);
    if (entry.status === "hit") {
      this.cacheStats.hits++;
      this.cacheStats.toolCallsAvoided++;
      this.cacheStats.estimatedSavedTokens +=
        (entry.bytes ?? JSON.stringify(entry.value).length) / 4;
      this.events?.emit("cache.hit", {
        toolName: tool.name,
        key,
        estimatedSavedTokens: this.cacheStats.estimatedSavedTokens,
      });
      return entry.value;
    }
    if (entry.status === "stale") this.cacheStats.stale++;
    if (entry.status === "corrupt") this.cacheStats.corrupt++;
    if (entry.status === "oversize") this.cacheStats.oversized++;
    this.cacheStats.misses++;
    this.events?.emit("cache.miss", { toolName: tool.name, key });
    if (requireCached) this.throwRequiredCacheMiss(tool.name, entry.status);

    const existing = this.cacheInflight.get(key);
    if (existing) {
      this.cacheStats.toolCallsAvoided++;
      return await existing;
    }

    const pending = (async () => {
      const result = await execute(args);
      await cache.set!(key, result);
      this.cacheStats.writes++;
      return result;
    })();
    this.cacheInflight.set(key, pending);
    try {
      return await pending;
    } finally {
      this.cacheInflight.delete(key);
    }
  }

  private async readCacheEntry(
    cache: NonNullable<ValidatedAgentConfig["cache"]>,
    key: string,
  ): Promise<AgentCacheLookup> {
    if (cache.getEntry) return await cache.getEntry(key);
    const value = await cache.get?.(key);
    return value === undefined ? { status: "miss" } : { status: "hit", value };
  }

  private createToolCacheKey(
    tool: ToolDefinition,
    sideEffect: string,
    args: Record<string, unknown>,
    cache: NonNullable<ValidatedAgentConfig["cache"]>,
  ): string {
    return createCacheKey([
      "tool",
      this.provider,
      this.model,
      tool.name,
      sideEffect,
      args,
      cache.config.strategy,
      cache.config.namespace,
      cache.config.version,
    ]);
  }

  private validateCachePolicy(params: AgentRunParams): void {
    const required = params.budget?.cachePolicy?.requireCachedFor ?? [];
    if (required.length === 0) return;
    const cache = this.config.cache;
    if (
      !cache ||
      cache.config.type === "disabled" ||
      (!cache.get && !cache.getEntry) ||
      this.isCacheBypassed(params)
    ) {
      throw new ConfigurationError(
        "RunBudget cachePolicy.requireCachedFor requires an enabled cache controller.",
        { requireCachedFor: required },
      );
    }
  }

  private isCacheRequiredForTool(
    params: AgentRunParams,
    toolName: string,
  ): boolean {
    return (
      params.budget?.cachePolicy?.requireCachedFor?.includes(toolName) ?? false
    );
  }

  private throwRequiredCacheMiss(toolName: string, status: string): never {
    throw new QuotaExceededError(this.provider, {
      budget: "cachePolicy.requireCachedFor",
      toolName,
      cacheStatus: status,
    });
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
      },
    };
  }

  private preprocessDirectives(
    params: AgentRunParams,
    adapters: readonly AgentAdapter[] = this.adapters,
  ): AgentRunParams {
    const result = preprocessDirectives(params.prompt!, [...adapters]);
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
    const skills = adapters.filter(isAgentSkill);
    const mode = this.config.skillActivation ?? "always";
    if (mode === "always") return skills;

    const prompt = params.prompt ?? "";
    const normalizedPrompt = normalizeActivationText(prompt);
    const directiveNames = new Set(
      Array.from(prompt.matchAll(/(?:^|\s)\/([a-zA-Z][\w-]*)/g)).map(
        (match) => match[1]!,
      ),
    );
    if (mode === "directive-only") {
      return skills.filter(
        (skill) => skill.directive && directiveNames.has(skill.directive),
      );
    }

    return skills.filter((skill) => {
      if (skill.directive && directiveNames.has(skill.directive)) return true;
      const manifest = skill.skillMetadata?.creator;
      const terms = manifest
        ? creatorActivationTerms(manifest)
        : genericSkillActivationTerms(skill);
      return terms.some((term) => normalizedPrompt.includes(term));
    });
  }

  private selectToolAdapters(
    params: AgentRunParams,
    adapters: readonly AgentAdapter[] = this.adapters,
  ): AgentAdapter[] {
    const activeSkills = this.selectActiveSkills(params, adapters);
    if (activeSkills.length === 0) return [];
    const capabilityTerms = new Set(
      activeSkills.flatMap((skill) => [
        ...(skill.skillMetadata?.requiredAdapters ?? []),
        ...(skill.skillMetadata?.optionalAdapters ?? []),
        ...flattenCapabilityExpressions(
          skill.skillMetadata?.creator?.requiredCapabilities ?? [],
        ),
        ...flattenCapabilityExpressions(
          skill.skillMetadata?.creator?.optionalCapabilities ?? [],
        ),
      ]),
    );

    return adapters.filter((adapter) => {
      if (!adapter.getTools) return false;
      if (isAgentSkill(adapter))
        return activeSkills.some((skill) => skill.name === adapter.name);
      if (capabilityTerms.size === 0) return true;
      const searchable = [
        adapter.name,
        ...(adapter.metadata?.scopes ?? []),
        ...(adapter.metadata?.sideEffects ?? []),
      ].join(" ");
      return Array.from(capabilityTerms).some((term) =>
        searchable.includes(term.split(".")[0]!),
      );
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

  private async *streamWithHooks(
    llmParams: LLMCallParams,
    allTools: ToolDefinition[],
    tracer: RunTracer,
    parentSpanId: string,
    signal?: AbortSignal,
  ): AsyncGenerator<StreamChunk> {
    const chunks: StreamChunk[] = [];
    const modelSpan = tracer.start(
      "model",
      "model.stream",
      { tools: allTools.length },
      parentSpanId,
    );
    const stream =
      allTools.length > 0
        ? this.unifiedProvider.streamWithTools(llmParams, allTools)
        : this.unifiedProvider.stream(llmParams);

    for await (const chunk of stream) {
      if (signal?.aborted) break;
      const type = chunk.toolResult
        ? "tool_result"
        : chunk.toolCall
          ? "tool_call"
          : chunk.finishReason
            ? "final"
            : "model_delta";
      const enriched = {
        ...chunk,
        type,
        runId: tracer.runId,
        spanId: modelSpan.spanId,
        parentSpanId,
      } satisfies StreamChunk;
      chunks.push(enriched);
      yield enriched;
    }
    tracer.end(modelSpan);

    let assembled = assembleResponse(chunks, {
      model: this.model,
      provider: this.provider,
    });
    assembled = {
      ...assembled,
      cost:
        this.costFactor === 0
          ? 0
          : costCalculator.calculate(
              assembled.tokensUsed,
              this.getCapabilities(),
            ),
    };

    if (this.adapters.some((adapter) => adapter.onAfterStream)) {
      for (const adapter of this.adapters) {
        if (adapter.onAfterStream)
          assembled = await adapter.onAfterStream(chunks, assembled);
      }
    }
  }

  private applyStructuredOutputPrompt(params: AgentRunParams): AgentRunParams {
    if (!params.responseSchema) return params;
    if (this.shouldUseStructuredToolFallback(params)) {
      return {
        ...params,
        system: [
          params.system,
          structuredOutputInstruction(params.responseSchema),
          STRUCTURED_TOOL_FALLBACK_INSTRUCTION,
        ]
          .filter(Boolean)
          .join("\n\n"),
      };
    }
    return {
      ...params,
      responseFormat: { type: "json_object" },
      system: [
        params.system,
        structuredOutputInstruction(params.responseSchema),
      ]
        .filter(Boolean)
        .join("\n\n"),
    };
  }

  private applyStructuredOutput(
    response: AgentResponse,
    params: AgentRunParams,
  ): AgentResponse {
    if (!params.responseSchema) return response;
    const parsed = parseAndValidateStructuredOutput(
      response.content,
      params.responseSchema,
    );
    return { ...response, structuredResponse: parsed.value };
  }

  private async callModelWithStructuredOutput(
    llmParams: LLMCallParams,
    allTools: ToolDefinition[],
    params: AgentRunParams,
    structuredTool?: StructuredOutputToolState,
    tracer?: RunTracer,
    parentSpanId?: string,
  ): Promise<{ raw: LLMResponse; structuredResponse?: unknown }> {
    const attempts = Math.max(1, (params.structuredOutput?.retries ?? 0) + 1);
    let currentParams = llmParams;
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      const raw =
        allTools.length > 0
          ? await this.unifiedProvider.callWithTools(currentParams, allTools)
          : await this.unifiedProvider.call(currentParams);
      if (!params.responseSchema) return { raw };
      try {
        const parsed = parseAndValidateStructuredOutput(
          raw.content,
          params.responseSchema,
        );
        return { raw, structuredResponse: parsed.value };
      } catch (error) {
        if (structuredTool?.value !== undefined)
          return { raw, structuredResponse: structuredTool.value };
        lastError = error;
        if (tracer && parentSpanId && attempt < attempts) {
          const retrySpan = tracer.start(
            "retry",
            "structured-output.retry",
            { attempt, reason: (error as Error).message },
            parentSpanId,
          );
          tracer.end(retrySpan);
        }
        currentParams = {
          ...currentParams,
          systemMessage: [
            currentParams.systemMessage,
            `Previous response failed structured-output validation: ${(error as Error).message}. Return corrected JSON only.`,
          ]
            .filter(Boolean)
            .join("\n\n"),
        };
      }
    }
    throw lastError;
  }

  private shouldUseStructuredToolFallback(params: AgentRunParams): boolean {
    if (!params.responseSchema) return false;
    const fallback = params.structuredOutput?.toolFallback ?? "auto";
    if (fallback === false) return false;
    const caps = this.getCapabilities();
    if (!caps.supportsTools) return false;
    return fallback === true || !caps.supportsJsonMode;
  }

  private createStructuredOutputTool(
    params: AgentRunParams,
  ): StructuredOutputToolState | undefined {
    if (!this.shouldUseStructuredToolFallback(params) || !params.responseSchema)
      return undefined;
    const state: StructuredOutputToolState = {
      tool: {
        name: "submit_structured_response",
        description:
          "Submit the final answer as structured data matching the requested response schema.",
        parameters: toStructuredToolParameters(params.responseSchema),
        security: { sideEffect: "none" },
        execute: async (args) => {
          const payload =
            isPlainJsonSchema(params.responseSchema!) &&
            params.responseSchema.type !== "object"
              ? args.value
              : args;
          const parsed = parseAndValidateStructuredOutput(
            JSON.stringify(payload),
            params.responseSchema!,
          );
          state.value = parsed.value;
          return { accepted: true };
        },
      },
    };
    return state;
  }

  private isAttached(ref: AdapterRef): boolean {
    const expected = adapterRefName(ref);
    return this.adapters.some((adapter) => adapter.name === expected);
  }

  private createRunAdapterScope(params: AgentRunParams): RunAdapterScope {
    const requested = normalizeRunAttachments(params.use);
    if (requested.length === 0)
      return { adapters: this.adapters, runOnlyAdapters: [] };

    const runOnlyAdapters: AgentAdapter[] = [];
    const seenNames = new Set(this.adapters.map((adapter) => adapter.name));
    for (const attachment of requested) {
      const adapters = isCreatorPack(attachment)
        ? attachment.attachments
        : [attachment];
      for (const adapter of adapters) {
        if (seenNames.has(adapter.name)) continue;
        seenNames.add(adapter.name);
        runOnlyAdapters.push(adapter);
      }
    }

    const scopedAdapters = [...this.adapters, ...runOnlyAdapters];
    this.validateScopedAdapters(scopedAdapters, runOnlyAdapters);
    return { adapters: scopedAdapters, runOnlyAdapters };
  }

  private validateScopedAdapters(
    scopedAdapters: readonly AgentAdapter[],
    scopedOnly: readonly AgentAdapter[],
  ): void {
    const caps = this.getCapabilities();
    for (const adapter of scopedOnly) {
      for (const req of adapter.requires ?? []) {
        const supported = {
          tools: caps.supportsTools,
          vision: caps.supportsVision,
          audio: caps.supportsAudio,
          video: caps.supportsVideo,
          files: caps.supportsFiles,
        }[req];
        if (!supported) {
          throw new AdapterRequirementError(
            `Adapter '${adapter.name}' requires '${req}' but '${this.model}' does not support it.`,
          );
        }
      }

      if (isAgentSkill(adapter)) {
        for (const dep of adapter.dependsOn ?? []) {
          if (Array.isArray(dep)) {
            if (!dep.some((ref) => isAttachedTo(scopedAdapters, ref))) {
              const names = dep.map(adapterRefName).join(" or ");
              throw new AdapterRequirementError(
                `Skill '${adapter.name}' requires at least one of: [${names}]`,
              );
            }
          } else if (!isAttachedTo(scopedAdapters, dep)) {
            throw new AdapterRequirementError(
              `Skill '${adapter.name}' requires '${adapterRefName(dep)}' - attach it first`,
            );
          }
        }
      }
    }

    assertNoDeclaredToolConflicts(scopedAdapters);
  }

  private async initRunAdapters(
    adapters: readonly AgentAdapter[],
  ): Promise<void> {
    for (const adapter of adapters) {
      if (adapter.init) await adapter.init();
    }
  }

  private async cleanupRunAdapters(
    adapters: readonly AgentAdapter[],
  ): Promise<void> {
    for (const adapter of [...adapters].reverse()) {
      if (adapter.cleanup) await adapter.cleanup();
    }
  }
}

function toTraceSink(trace: AgentRunParams["trace"]): TraceSink | undefined {
  if (!trace || trace === true) return undefined;
  return trace;
}

function resolveReplay(params: AgentRunParams): AgentResponse | undefined {
  if (!params.replay) return undefined;
  if ("responses" in params.replay) {
    const index = params.replay.index ?? 0;
    return params.replay.responses[index];
  }
  return params.replay;
}

interface StructuredOutputToolState {
  tool: ToolDefinition;
  value?: unknown;
}

const STRUCTURED_TOOL_FALLBACK_INSTRUCTION = [
  "Use the submit_structured_response tool to provide the final structured response.",
  "Do not treat the tool result as user-visible content; it is the schema delivery channel.",
].join("\n");

function toStructuredToolParameters(
  schema: AgentRunParams["responseSchema"],
): ToolDefinition["parameters"] {
  if (
    schema &&
    isPlainJsonSchema(schema) &&
    (schema.type === "object" || schema.properties)
  ) {
    return {
      type: "object",
      properties: Object.fromEntries(
        Object.entries(schema.properties ?? {}).map(([key, child]) => [
          key,
          {
            type: toToolParamType(child.type),
            description: `Structured response field '${key}'`,
            ...(child.enum !== undefined && { enum: child.enum.map(String) }),
          },
        ]),
      ),
      required: schema.required ?? [],
    };
  }
  return {
    type: "object",
    properties: {
      value: { type: "object", description: "Structured response value" },
    },
    required: ["value"],
  };
}

function isPlainJsonSchema(
  schema: NonNullable<AgentRunParams["responseSchema"]>,
): schema is JsonSchema {
  return typeof (schema as { safeParse?: unknown }).safeParse !== "function";
}

function toToolParamType(type: JsonSchema["type"] | undefined): string {
  if (
    type === "array" ||
    type === "object" ||
    type === "number" ||
    type === "boolean" ||
    type === "string"
  )
    return type;
  return "string";
}

function wrapMcpTool(
  tool: ToolDefinition,
  adapterName: string,
  traceContext: { tracer: RunTracer; parentSpanId: string },
): ToolDefinition {
  return {
    ...tool,
    execute: async (args) => {
      const span = traceContext.tracer.start(
        "mcp",
        `${adapterName}.${tool.name}`,
        { adapter: adapterName, toolName: tool.name },
        traceContext.parentSpanId,
      );
      try {
        const result = await tool.execute(args);
        traceContext.tracer.end(span);
        return result;
      } catch (error) {
        traceContext.tracer.end(span, error);
        throw error;
      }
    },
  };
}

function withTracePolicy(
  policy: ToolPolicy | undefined,
  traceContext?: { tracer: RunTracer; parentSpanId: string },
): ToolPolicy | undefined {
  if (!traceContext) return policy;
  const base = policy ?? {};
  return {
    ...base,
    onAuditEvent: async (event: ToolAuditEvent) => {
      if (event.type === "guardrail_blocked") {
        const span = traceContext.tracer.start(
          "guardrail",
          `guardrail.${event.phase}.${event.toolName}`,
          {
            toolName: event.toolName,
            phase: event.phase,
            reason: event.reason,
          },
          traceContext.parentSpanId,
        );
        traceContext.tracer.end(
          span,
          base.guardrailMode === "warn" ? undefined : event.reason,
        );
      }
      await base.onAuditEvent?.(event);
    },
  };
}

function promptProvenance(
  params: AgentRunParams,
): NonNullable<AgentResponse["promptProvenance"]> {
  if (params.promptFile)
    return { source: "file", promptFile: params.promptFile, assembled: true };
  if (params.promptDir)
    return { source: "dir", promptDir: params.promptDir, assembled: true };
  return {
    source: "inline",
    assembled:
      /\{\{\s*(?:config\.[^}]+|(?!include\s)[A-Za-z_][A-Za-z0-9_.-]*)\s*\}\}/.test(
        params.prompt ?? "",
      ),
  };
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

function isAgentSkill(adapter: AgentAdapter): adapter is AgentSkill {
  return "type" in adapter && adapter.type === "skill";
}

function flattenCapabilityExpressions(
  expressions: readonly import("./creator/types.js").CapabilityExpression[],
): string[] {
  return expressions.flatMap((expression) => {
    if (typeof expression === "string") return [expression];
    if ("oneOf" in expression) return expression.oneOf;
    return expression.allOf;
  });
}

function adapterRefName(ref: AdapterRef): string {
  if (typeof ref !== "function") {
    return "name" in ref
      ? ref.name
      : (ref.adapterName ?? ref.skillName ?? "unknown");
  }
  const candidate =
    (ref as unknown as { adapterName?: string; skillName?: string })
      .adapterName ?? (ref as unknown as { skillName?: string }).skillName;
  if (candidate) return candidate;
  return ref.name
    .replace(/Adapter$/, "")
    .replace(/Skill$/, "")
    .replace(/MCP$/, "")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase();
}

interface ToolExecutionBudget {
  max?: number;
  count: number;
}

interface RunAdapterScope {
  adapters: readonly AgentAdapter[];
  runOnlyAdapters: readonly AgentAdapter[];
}

function createToolExecutionBudget(
  params: AgentRunParams,
): ToolExecutionBudget {
  return {
    ...(params.budget?.maxToolCalls !== undefined && {
      max: params.budget.maxToolCalls,
    }),
    count: 0,
  };
}

function normalizeRunAttachments(
  attachments: AgentRunParams["use"],
): readonly (AgentAdapter | CreatorPack)[] {
  if (!attachments) return [];
  return Array.isArray(attachments)
    ? ([...attachments] as Array<AgentAdapter | CreatorPack>)
    : [attachments as AgentAdapter | CreatorPack];
}

function normalizeActivationText(value: string): string {
  return ` ${value.toLowerCase().replace(/[^a-z0-9/]+/g, " ")} `;
}

function creatorActivationTerms(manifest: CreatorSkillManifest): string[] {
  return uniqueActivationTerms([
    manifest.directive,
    manifest.name,
    ...manifest.name.split("-"),
    ...manifest.producesArtifacts,
    ...creatorActivationAliases(manifest.name),
  ]);
}

function creatorActivationAliases(skillName: string): string[] {
  return CREATOR_SKILL_ACTIVATION_ALIASES[skillName] ?? [];
}

function genericSkillActivationTerms(skill: AgentSkill): string[] {
  return uniqueActivationTerms([
    skill.directive,
    skill.name,
    ...skill.name.split("-"),
    ...skill.description.split(/\s+/),
  ]);
}

function uniqueActivationTerms(
  values: readonly (string | undefined)[],
): string[] {
  const stopWords = new Set([
    "and",
    "for",
    "the",
    "with",
    "skill",
    "agent",
    "content",
    "creator",
  ]);
  const terms = new Set<string>();
  for (const value of values) {
    if (!value) continue;
    const normalized = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
    if (normalized.length > 3 && !stopWords.has(normalized)) {
      terms.add(` ${normalized} `);
    }
    for (const part of normalized.split(/\s+/)) {
      if (part.length > 3 && !stopWords.has(part)) terms.add(` ${part} `);
    }
  }
  return [...terms];
}

function isAttachedTo(
  adapters: readonly AgentAdapter[],
  ref: AdapterRef,
): boolean {
  const expected = adapterRefName(ref);
  return adapters.some((adapter) => adapter.name === expected);
}

function assertNoDeclaredToolConflicts(
  adapters: readonly AgentAdapter[],
): void {
  const ownerByTool = new Map<string, string>();
  for (const adapter of adapters) {
    for (const toolName of adapter.declaredToolNames ?? []) {
      const owner = ownerByTool.get(toolName);
      if (owner) {
        throw new AdapterToolConflictError(
          `Tool name conflict: '${adapter.name}' registers tool '${toolName}' which is already registered by '${owner}'`,
        );
      }
      ownerByTool.set(toolName, adapter.name);
    }
  }
}

function assertUniqueToolDefinitions(tools: readonly ToolDefinition[]): void {
  const seen = new Set<string>();
  for (const tool of tools) {
    if (seen.has(tool.name)) {
      throw new AdapterToolConflictError(
        `Tool name conflict: '${tool.name}' is exposed more than once`,
      );
    }
    seen.add(tool.name);
  }
}

const CREATOR_SKILL_ACTIVATION_ALIASES: Record<string, string[]> = {
  "audience-research": ["audience", "reader", "persona", "segment", "customer"],
  "content-positioning": [
    "positioning",
    "angle",
    "thesis",
    "promise",
    "differentiator",
  ],
  "content-brief": ["brief", "outline", "plan", "structure"],
  "research-synthesis": [
    "research",
    "source",
    "sources",
    "evidence",
    "synthesis",
  ],
  "fact-check": ["fact", "verify", "claim", "claims", "citation"],
  "seo-strategy": ["seo", "keyword", "keywords", "search intent"],
  "serp-brief": ["serp", "ranking", "competitor", "search results"],
  "blog-writer": ["blog", "article", "post", "medium", "draft", "longform"],
  copywriter: ["copy", "copywriting", "landing page", "conversion"],
  "video-scriptwriter": ["video", "script", "youtube", "voiceover"],
  repurposing: ["repurpose", "repurposing", "thread", "carousel", "snippet"],
  "editorial-review": ["editorial", "review", "edit", "clarity", "coherence"],
  "competitor-analysis": ["competitor", "competitive", "comparison"],
  "trend-discovery": ["trend", "trending", "market signal"],
  "seo-audit": ["seo audit", "technical seo", "crawl issue"],
  "seo-review": ["seo review", "metadata", "meta description", "slug"],
  "book-writer": ["book", "chapter", "manuscript"],
  "newsletter-writer": ["newsletter", "email issue", "subscriber"],
  "social-writer": ["social", "linkedin", "x post", "tweet", "caption"],
  "video-ideation": ["video idea", "youtube idea", "episode"],
  "creative-direction": ["creative direction", "visual direction", "concept"],
  "copy-review": ["copy review", "conversion review", "offer review"],
  "claim-risk-review": ["claim risk", "legal risk", "compliance"],
  "brand-voice": ["brand voice", "tone", "voice"],
  "publish-qa": ["publish", "publishing", "preflight", "qa"],
  "content-calendar": ["calendar", "schedule", "editorial calendar"],
  "performance-analysis": ["performance", "analytics", "metrics"],
  "experiment-planner": ["experiment", "a b test", "hypothesis"],
};

function optional<T extends string, V>(
  key: T,
  value: V | undefined,
): { [K in T]: V } | Record<string, never> {
  return value === undefined ? {} : ({ [key]: value } as { [K in T]: V });
}

const agentsPendingProcessCleanup = new Set<Agent>();
let processCleanupRegistered = false;

function registerAgentForProcessCleanup(agent: Agent): void {
  agentsPendingProcessCleanup.add(agent);
  if (processCleanupRegistered) return;
  processCleanupRegistered = true;
  process.once("beforeExit", cleanupRegisteredAgents);
  process.once("SIGINT", cleanupRegisteredAgents);
  process.once("SIGTERM", cleanupRegisteredAgents);
}

function unregisterAgentForProcessCleanup(agent: Agent): void {
  agentsPendingProcessCleanup.delete(agent);
}

function cleanupRegisteredAgents(): void {
  const agents = [...agentsPendingProcessCleanup];
  agentsPendingProcessCleanup.clear();
  for (const agent of agents) {
    void agent.dispose();
  }
}
