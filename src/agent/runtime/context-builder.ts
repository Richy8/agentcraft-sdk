import type { ToolDefinition } from "../../protocols/types.js";
import type { BaseLLMProvider } from "../../providers/base.provider.js";
import type { ModelCapabilities } from "../../types/provider.types.js";
import type { AgentAdapter } from "../adapters/types.js";
import type { RunAdapterScope } from "../adapters/run-scope.js";
import type { ValidatedAgentConfig } from "../config.js";
import type { AgentEventEmitter } from "../events.js";
import type { AgentMemoryStore } from "../memory/index.js";
import type { RunTracer } from "../observability.js";
import type { CacheStatsLike } from "../cache/index.js";
import { compressPromptSystem } from "./prompt-compression.js";
import { callModelStructuredOutputFlow } from "./structured-output-flow.js";
import type { StructuredOutputToolState } from "./structured-output-handler.js";
import type { AgentRunParams } from "../types.js";
import { validateCachePolicy as validateToolCachePolicy } from "../tools/tool-cache-manager.js";
import { collectToolsForRun } from "../tools/tool-manager.js";
import { withAgentEventPolicy } from "../tools/tool-event-bridge.js";
import type { ToolExecutionBudget } from "../tools/tool-budget.js";
import { toLLMCallParams } from "./llm-params.js";
import type { AgentRuntimeContext } from "./agent-runtime.js";

export interface AgentRuntimeContextBuilderInput {
  readonly provider: string;
  readonly model: string;
  readonly costFactor: number;
  readonly unifiedProvider: BaseLLMProvider;
  readonly config: ValidatedAgentConfig;
  readonly attachedAdapters: readonly AgentAdapter[];
  readonly getCacheStats: () => CacheStatsLike;
  readonly cacheInflight: Map<string, Promise<unknown>>;
  readonly events?: AgentEventEmitter;
  readonly memory?: AgentMemoryStore;
  readonly getCapabilities: () => ModelCapabilities;
  readonly resetCacheStats: () => void;
  readonly validateInputs: (params: AgentRunParams) => void;
  readonly ensureAttachedAdaptersInitialized: () => Promise<void>;
  readonly createRunAdapterScope: (params: AgentRunParams) => RunAdapterScope;
  readonly initRunAdapters: (adapters: readonly AgentAdapter[]) => Promise<void>;
  readonly cleanupRunAdapters: (adapters: readonly AgentAdapter[]) => Promise<void>;
}

export function buildAgentRuntimeContext(
  input: AgentRuntimeContextBuilderInput,
): AgentRuntimeContext {
  const toolSelectionMode = input.config.toolSelection ?? "all";
  const resolvePromptCompression = (params: AgentRunParams) =>
    params.promptCompression ?? input.config.promptCompression ?? "none";

  return {
    provider: input.provider,
    model: input.model,
    costFactor: input.costFactor,
    unifiedProvider: input.unifiedProvider,
    attachedAdapters: input.attachedAdapters,
    toolSelectionMode,
    getCacheStats: input.getCacheStats,
    getCapabilities: input.getCapabilities,
    resetCacheStats: input.resetCacheStats,
    validateInputs: input.validateInputs,
    validateCachePolicy: (params) => validateToolCachePolicy(params, input.config.cache),
    ensureAttachedAdaptersInitialized: input.ensureAttachedAdaptersInitialized,
    createRunAdapterScope: input.createRunAdapterScope,
    initRunAdapters: input.initRunAdapters,
    cleanupRunAdapters: input.cleanupRunAdapters,
    resolvePromptCompression,
    applyPromptCompression: (params, mode) =>
      mode === "none" || !params.system
        ? params
        : { ...params, system: compressPromptSystem(params.system, mode) },
    collectTools: (params, traceContext, adapters, executionBudget) =>
      collectTools({
        input,
        params,
        traceContext,
        adapters,
        executionBudget,
      }),
    toLLMParams: (params) => toLLMCallParams(params, input.config),
    getCache: () => input.config.cache,
    callModelWithStructuredOutput: (
      llmParams,
      tools,
      params,
      structuredTool,
      tracer,
      parentSpanId,
    ) =>
      callModelStructuredOutputFlow({
        provider: input.unifiedProvider,
        llmParams,
        tools,
        params,
        ...(structuredTool !== undefined && { structuredTool }),
        tracer,
        parentSpanId,
      }),
    isCacheBypassed: (params) =>
      input.config.cache?.config.type === "disabled" ||
      params.cache === false ||
      params.cache?.bypass === true,
    ...(input.events !== undefined && { events: input.events }),
    ...(input.memory !== undefined && { memory: input.memory }),
  };
}

async function collectTools(options: {
  readonly input: AgentRuntimeContextBuilderInput;
  readonly params: AgentRunParams;
  readonly traceContext: { tracer: RunTracer; parentSpanId: string } | undefined;
  readonly adapters: readonly AgentAdapter[];
  readonly executionBudget: ToolExecutionBudget;
}): Promise<ToolDefinition[]> {
  const toolAdapters = options.adapters.filter((item) => item.getTools);

  return await collectToolsForRun({
    params: options.params,
    toolAdapters,
    ...(options.traceContext !== undefined && {
      traceContext: options.traceContext,
    }),
    executionBudget: options.executionBudget,
    cacheContext: {
      provider: options.input.provider,
      model: options.input.model,
      cache: options.input.config.cache,
      cacheStats: options.input.getCacheStats(),
      cacheInflight: options.input.cacheInflight,
      ...(options.input.events !== undefined && { events: options.input.events }),
    },
    ...(options.input.config.toolPolicy !== undefined && {
      baseToolPolicy: options.input.config.toolPolicy,
    }),
    applyEventPolicy: (policy) =>
      withAgentEventPolicy(policy, options.input.events),
  });
}
