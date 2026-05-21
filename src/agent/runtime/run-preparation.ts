import type { ToolDefinition } from "../../protocols/types.js";
import type { ActiveSkillMatch } from "../skills/activation-engine.js";
import { applyMemoryContext } from "../memory/context-injector.js";
import { enforcePreflight } from "../budgets.js";
import type { RunAdapterScope } from "../adapters/run-scope.js";
import { RunTracer, type TraceSink, type TraceSpan } from "../observability.js";
import { resolvePrompt } from "../utils/resolve-prompt.js";
import type {
  AgentRunParams,
  PromptCompressionMode,
  SkillPromptAssemblyRecord,
} from "../types.js";
import {
  createToolExecutionBudget,
  type ToolExecutionBudget,
} from "../tools/tool-budget.js";
import { applyStructuredOutputPrompt } from "./structured-output-flow.js";
import type { AgentRuntimeContext } from "./agent-runtime.js";

export interface PreparedRuntimeInvocation {
  readonly tracer: RunTracer;
  readonly agentSpan: TraceSpan;
  readonly params: AgentRunParams;
  readonly runScope: RunAdapterScope;
}

export interface PreparedPromptAndTools {
  readonly params: AgentRunParams;
  readonly executionBudget: ToolExecutionBudget;
  readonly skillPromptAssemblyRecords: SkillPromptAssemblyRecord[];
  readonly promptCompression: PromptCompressionMode;
  readonly activeSkillMatches: ActiveSkillMatch[];
  readonly allTools: readonly ToolDefinition[];
}

export async function prepareRuntimeInvocation(
  context: AgentRuntimeContext,
  params: AgentRunParams,
  mode: "run" | "stream",
): Promise<PreparedRuntimeInvocation> {
  const tracer = new RunTracer(toTraceSink(params.trace));
  const agentSpan = tracer.start("agent", `agent.${mode}`, {
    model: context.model,
    provider: context.provider,
  });
  const resolvedParams = { ...params, prompt: await resolvePrompt(params) };
  const runScope = context.createRunAdapterScope(resolvedParams);
  context.validateInputs(resolvedParams);
  context.validateCachePolicy(resolvedParams);
  if (mode === "run") {
    enforcePreflight(
      resolvedParams,
      context.getCapabilities(),
      context.model,
      context.provider,
      resolvedParams.budget,
    );
  }
  await context.ensureAttachedAdaptersInitialized();
  await context.initRunAdapters(runScope.runOnlyAdapters);
  return { tracer, agentSpan, params: resolvedParams, runScope };
}

export async function preparePromptAndTools(
  context: AgentRuntimeContext,
  input: {
    readonly params: AgentRunParams;
    readonly runScope: RunAdapterScope;
    readonly tracer: RunTracer;
    readonly agentSpan: TraceSpan;
  },
): Promise<PreparedPromptAndTools> {
  const executionBudget = createToolExecutionBudget(input.params);
  const skillPromptAssemblyRecords: SkillPromptAssemblyRecord[] = [];
  let params = await applyMemoryContext(input.params, context.memory);
  params = context.applySkillSystemPrompts(
    params,
    input.runScope.adapters,
    skillPromptAssemblyRecords,
  );
  const promptCompression = context.resolvePromptCompression(params);
  const activeSkillMatches = context.selectActiveSkillMatches(
    params,
    input.runScope.adapters,
  );
  params = context.applyPromptCompression(params, promptCompression);

  // Tool selection must see the original directive signal. Directive preprocessing
  // strips slash commands from the prompt, so collecting tools first prevents
  // directive-only skills from losing their adapter/tool routing context.
  const allTools = await context.collectTools(
    params,
    { tracer: input.tracer, parentSpanId: input.agentSpan.spanId },
    input.runScope.adapters,
    executionBudget,
  );
  params = context.preprocessDirectives(
    params,
    input.runScope.adapters,
    skillPromptAssemblyRecords,
  );
  params = applyStructuredOutputPrompt(params, context.getCapabilities());
  return {
    params,
    executionBudget,
    skillPromptAssemblyRecords,
    promptCompression,
    activeSkillMatches,
    allTools,
  };
}

export async function applyBeforeRunAdapters(
  params: AgentRunParams,
  runScope: RunAdapterScope,
  tracer?: RunTracer,
  agentSpan?: TraceSpan,
): Promise<AgentRunParams> {
  let runParams = params;
  for (const adapter of runScope.adapters) {
    const adapterSpan =
      tracer && agentSpan
        ? tracer.start(
            "adapter",
            `${adapter.name}.onBeforeRun`,
            undefined,
            agentSpan.spanId,
          )
        : undefined;
    try {
      if (adapter.onBeforeRun) runParams = await adapter.onBeforeRun(runParams);
      if (adapterSpan) tracer!.end(adapterSpan);
    } catch (error) {
      if (adapterSpan) tracer!.end(adapterSpan, error);
      throw error;
    }
  }
  return runParams;
}

function toTraceSink(
  trace: AgentRunParams["trace"],
): TraceSink | undefined {
  if (!trace || trace === true) return undefined;
  return trace;
}
