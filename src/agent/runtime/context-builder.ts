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
import {
  selectActiveSkillMatches as selectActiveSkillMatchesForRun,
  selectActiveSkills as selectActiveSkillsForRun,
} from "../skills/activation-engine.js";
import {
  applySkillSystemPromptsForRun,
  preprocessSkillDirectivesForRun,
} from "../skills/runtime-prompt-bridge.js";
import { compressSkillPromptSystem } from "./prompt-compression.js";
import { callModelStructuredOutputFlow } from "./structured-output-flow.js";
import type { StructuredOutputToolState } from "./structured-output-handler.js";
import type { AgentRunParams } from "../types.js";
import { validateCachePolicy as validateToolCachePolicy } from "../tools/tool-cache-manager.js";
import { collectToolsForRun } from "../tools/tool-manager.js";
import { selectToolAdaptersForActiveSkills } from "../tools/tool-selection.js";
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
  const skillActivationMode = input.config.skillActivation ?? "always";
  const toolSelectionMode = input.config.toolSelection ?? "all";
  const resolveSkillPromptAssembly = (params: AgentRunParams) =>
    params.skillPromptAssembly ?? input.config.skillPromptAssembly ?? "adaptive-safe";
  const resolvePromptCompression = (params: AgentRunParams) =>
    params.promptCompression ?? input.config.promptCompression ?? "none";

  return {
    provider: input.provider,
    model: input.model,
    costFactor: input.costFactor,
    unifiedProvider: input.unifiedProvider,
    attachedAdapters: input.attachedAdapters,
    skillActivationMode,
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
    applySkillSystemPrompts: (params, adapters, assemblyRecords) =>
      applySkillSystemPromptsForRun({
        params,
        adapters,
        assemblyRecords,
        activationMode: skillActivationMode,
        assemblyMode: resolveSkillPromptAssembly(params),
      }),
    resolvePromptCompression,
    resolveSkillPromptAssembly,
    selectActiveSkillMatches: (params, adapters) =>
      selectActiveSkillMatchesForRun({
        params,
        adapters,
        mode: skillActivationMode,
      }),
    applyPromptCompression: (params, mode) =>
      mode === "none" || !params.system
        ? params
        : { ...params, system: compressSkillPromptSystem(params.system, mode) },
    preprocessDirectives: (params, adapters, assemblyRecords) =>
      preprocessSkillDirectivesForRun({
        params,
        adapters,
        assemblyRecords,
        activationMode: skillActivationMode,
        assemblyMode: resolveSkillPromptAssembly(params),
      }),
    collectTools: (params, traceContext, adapters, executionBudget) =>
      collectTools({
        input,
        params,
        traceContext,
        adapters,
        executionBudget,
        skillActivationMode,
      }),
    toLLMParams: (params) => toLLMCallParams(params, input.config),
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
  readonly skillActivationMode: "always" | "auto" | "directive-only";
}): Promise<ToolDefinition[]> {
  const toolAdapters =
    options.input.config.toolSelection === "auto"
      ? selectToolAdaptersForActiveSkills({
          adapters: options.adapters,
          activeSkills: selectActiveSkillsForRun({
            params: options.params,
            adapters: options.adapters,
            mode: options.skillActivationMode,
          }),
        })
      : options.adapters.filter((item) => item.getTools);

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
