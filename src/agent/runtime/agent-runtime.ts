import { costCalculator } from "../../cost-calculator/index.js";
import type { ToolDefinition } from "../../protocols/types.js";
import type { BaseLLMProvider } from "../../providers/base.provider.js";
import type { LLMCallParams, LLMResponse, ModelCapabilities, StreamChunk } from "../../types/provider.types.js";
import type { AgentMemoryStore } from "../memory/index.js";
import type { AgentCacheController } from "../cache/index.js";
import { RunTracer } from "../observability.js";
import { summarizeCacheStats, type CacheStatsLike } from "../cache/index.js";
import {
  createRunCostReport,
  enforcePostRunBudget,
  estimateRunCost,
} from "../budgets.js";
import type { AgentEventEmitter } from "../events.js";
import type { AgentAdapter } from "../adapters/types.js";
import type { RunAdapterScope } from "../adapters/run-scope.js";
import { wrapToolExecutionBudget, type ToolExecutionBudget } from "../tools/tool-budget.js";
import { assembleResponse } from "../utils/assemble-response.js";
import {
  createStructuredOutputToolForRun,
} from "./structured-output-flow.js";
import type { StructuredOutputToolState } from "./structured-output-handler.js";
import type {
  AgentResponse,
  AgentRunParams,
  PromptCompressionMode,
} from "../types.js";
import {
  applyBeforeRunAdapters,
  preparePromptAndTools,
  prepareRuntimeInvocation,
} from "./run-preparation.js";

export interface AgentRuntimeContext {
  readonly provider: string;
  readonly model: string;
  readonly costFactor: number;
  readonly unifiedProvider: BaseLLMProvider;
  readonly events?: AgentEventEmitter;
  readonly memory?: AgentMemoryStore;
  readonly attachedAdapters: readonly AgentAdapter[];
  readonly getCacheStats: () => CacheStatsLike;
  readonly toolSelectionMode: "all" | "auto";
  readonly getCapabilities: () => ModelCapabilities;
  readonly resetCacheStats: () => void;
  readonly validateInputs: (params: AgentRunParams) => void;
  readonly validateCachePolicy: (params: AgentRunParams) => void;
  readonly ensureAttachedAdaptersInitialized: () => Promise<void>;
  readonly createRunAdapterScope: (params: AgentRunParams) => RunAdapterScope;
  readonly initRunAdapters: (adapters: readonly AgentAdapter[]) => Promise<void>;
  readonly cleanupRunAdapters: (adapters: readonly AgentAdapter[]) => Promise<void>;
  readonly resolvePromptCompression: (params: AgentRunParams) => PromptCompressionMode;
  readonly applyPromptCompression: (
    params: AgentRunParams,
    mode: PromptCompressionMode,
  ) => AgentRunParams;
  readonly collectTools: (
    params: AgentRunParams,
    traceContext: { tracer: RunTracer; parentSpanId: string } | undefined,
    adapters: readonly AgentAdapter[],
    executionBudget: ToolExecutionBudget,
  ) => Promise<ToolDefinition[]>;
  readonly toLLMParams: (params: AgentRunParams) => LLMCallParams;
  readonly getCache?: () => AgentCacheController | undefined;
  readonly callModelWithStructuredOutput: (
    llmParams: LLMCallParams,
    tools: readonly ToolDefinition[],
    params: AgentRunParams,
    structuredTool: StructuredOutputToolState | undefined,
    tracer: RunTracer,
    parentSpanId: string,
  ) => Promise<{ raw: LLMResponse; structuredResponse?: unknown }>;
  readonly isCacheBypassed: (params: AgentRunParams) => boolean;
}

export async function runAgentRuntime(
  context: AgentRuntimeContext,
  params: AgentRunParams,
): Promise<AgentResponse> {
  const replayed = resolveReplay(params);
  if (replayed) return replayed;
  context.resetCacheStats();
  const prepared = await prepareRuntimeInvocation(context, params, "run");
  const { tracer, agentSpan, runScope } = prepared;
  params = prepared.params;

  try {
    const promptState = await preparePromptAndTools(context, {
      params,
      runScope,
      tracer,
      agentSpan,
    });

    params = promptState.params;
    const {
      executionBudget,
      promptCompression,
      allTools,
    } = promptState;

    const structuredTool = createStructuredOutputToolForRun(params, context.getCapabilities());
    const rawModelTools: ToolDefinition[] = structuredTool
      ? [
          ...allTools,
          wrapToolExecutionBudget(structuredTool.tool, executionBudget, context.provider),
        ]
      : [...allTools];
    const runParams = await applyBeforeRunAdapters(params, runScope, tracer, agentSpan);

    // Span wrapping is deferred until after the model span is started below,
    // so we hold the raw list here and wrap once we have modelSpan.spanId.

    const llmParams = context.toLLMParams(runParams);
    const modelSpan = tracer.start(
      "model",
      "model.call",
      { tools: rawModelTools.length },
      agentSpan.spanId,
    );
    const modelTools = wrapToolsWithSpans(rawModelTools, tracer, modelSpan.spanId);
    const measurement = measureRunPrompt(
      llmParams,
      allTools.length,
      modelTools.length,
      Boolean(params.assembly?.minify),
      promptCompression,
    );
    const { raw, structuredResponse } = await context.callModelWithStructuredOutput(
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
        (context.costFactor === 0
          ? 0
          : costCalculator.calculate(raw.tokensUsed, context.getCapabilities())),
      tokensUsed: raw.tokensUsed,
      finishReason: raw.finishReason,
      model: context.model,
      provider: context.provider,
      runId: tracer.runId,
      promptProvenance: promptProvenance(params),
      selection: {
        toolSelection: context.toolSelectionMode,
        activeTraits: [],
        activationReasons: [],
        exposedTools: allTools.map((tool) => tool.name),
        executedToolCalls: executionBudget.count,
      },
      measurement,
      cache: {
        ...context.getCacheStats(),
        bypassed: context.isCacheBypassed(params),
        summary: summarizeCacheStats(context.getCacheStats()),
      },
      ...(raw.toolCalls && { toolCalls: raw.toolCalls }),
    };
    const costEstimateParams: Pick<
      AgentRunParams,
      "maxTokens" | "system" | "tools" | "prompt"
    > = {
      tools: modelTools,
      ...(runParams.prompt !== undefined && { prompt: runParams.prompt }),
      ...(runParams.system !== undefined && { system: runParams.system }),
      ...(runParams.maxTokens !== undefined && {
        maxTokens: runParams.maxTokens,
      }),
    };
    response = {
      ...response,
      costReport: createRunCostReport({
        scope: "run",
        provider: context.provider,
        model: context.model,
        caps: context.getCapabilities(),
        response,
        ...(params.budget !== undefined && { budget: params.budget }),
        estimate: estimateRunCost(
          costEstimateParams,
          context.getCapabilities(),
          params.budget?.costOptions,
        ),
      }),
    };

    if (structuredResponse !== undefined) response = { ...response, structuredResponse };

    context.events?.emit("cost.updated", {
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
    enforcePostRunBudget(response, params.budget, context.provider);
    return { ...response, trace: tracer.export() };
  } finally {
    await context.cleanupRunAdapters(runScope.runOnlyAdapters);
  }
}

export async function* streamAgentRuntime(
  context: AgentRuntimeContext,
  params: AgentRunParams,
): AsyncGenerator<StreamChunk> {
  const prepared = await prepareRuntimeInvocation(context, params, "stream");
  const { tracer, agentSpan, runScope } = prepared;
  params = prepared.params;

  try {
    const promptState = await preparePromptAndTools(context, {
      params,
      runScope,
      tracer,
      agentSpan,
    });

    params = promptState.params;
    const runParams = await applyBeforeRunAdapters(params, runScope);

    const llmParams = context.toLLMParams(runParams);
    yield* streamWithHooks({
      context,
      llmParams,
      allTools: promptState.allTools,
      tracer,
      parentSpanId: agentSpan.spanId,
      ...(params.signal !== undefined && { signal: params.signal }),
    });
    tracer.end(agentSpan);
  } finally {
    await context.cleanupRunAdapters(runScope.runOnlyAdapters);
  }
}

async function* streamWithHooks(options: {
  readonly context: AgentRuntimeContext;
  readonly llmParams: LLMCallParams;
  readonly allTools: readonly ToolDefinition[];
  readonly tracer: RunTracer;
  readonly parentSpanId: string;
  readonly signal?: AbortSignal;
}): AsyncGenerator<StreamChunk> {
  const chunks: StreamChunk[] = [];
  const modelSpan = options.tracer.start(
    "model",
    "model.stream",
    { tools: options.allTools.length },
    options.parentSpanId,
  );
  const stream =
    options.allTools.length > 0
      ? options.context.unifiedProvider.streamWithTools(options.llmParams, [...options.allTools])
      : options.context.unifiedProvider.stream(options.llmParams);

  for await (const chunk of stream) {
    if (options.signal?.aborted) break;
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
      runId: options.tracer.runId,
      spanId: modelSpan.spanId,
      parentSpanId: options.parentSpanId,
    } satisfies StreamChunk;
    chunks.push(enriched);
    yield enriched;
  }
  options.tracer.end(modelSpan);

  let assembled = assembleResponse(chunks, {
    model: options.context.model,
    provider: options.context.provider,
  });
  assembled = {
    ...assembled,
    cost:
      options.context.costFactor === 0
        ? 0
        : costCalculator.calculate(
            assembled.tokensUsed,
            options.context.getCapabilities(),
          ),
  };

  if (options.context.attachedAdapters.some((adapter) => adapter.onAfterStream)) {
    for (const adapter of options.context.attachedAdapters) {
      if (adapter.onAfterStream) {
        assembled = await adapter.onAfterStream(chunks, assembled);
      }
    }
  }
}

function resolveReplay(params: AgentRunParams): AgentResponse | undefined {
  if (!params.replay) return undefined;
  if ("responses" in params.replay) {
    const index = params.replay.index ?? 0;
    return params.replay.responses[index];
  }
  return params.replay;
}

function promptProvenance(
  params: AgentRunParams,
): NonNullable<AgentResponse["promptProvenance"]> {
  if (params.promptFile) {
    return { source: "file", promptFile: params.promptFile, assembled: true };
  }
  if (params.promptDir) {
    return { source: "dir", promptDir: params.promptDir, assembled: true };
  }
  return {
    source: "inline",
    assembled:
      /\{\{\s*(?:config\.[^}]+|(?!include\s)[A-Za-z_][A-Za-z0-9_.-]*)\s*\}\}/.test(
        params.prompt ?? "",
      ),
  };
}

/**
 * Wrap each tool's `execute` so the tracer emits a `tool` span around every
 * real tool call the model makes during a run. Skips internal bookkeeping
 * tools (submit_structured_response) to keep the trace clean.
 */
function wrapToolsWithSpans(
  tools: ToolDefinition[],
  tracer: RunTracer,
  parentSpanId: string,
): ToolDefinition[] {
  return tools.map((tool) => {
    if (tool.name === "submit_structured_response" || tool.name === "load_skill_instructions") {
      return tool;
    }
    return {
      ...tool,
      execute: async (args: Record<string, unknown>) => {
        const span = tracer.start("tool", `tool.${tool.name}`, { tool: tool.name }, parentSpanId);
        try {
          const result = await tool.execute(args);
          tracer.end(span);
          return result;
        } catch (err) {
          tracer.end(span, err);
          throw err;
        }
      },
    };
  });
}

function measureRunPrompt(
  params: LLMCallParams,
  exposedToolCount: number,
  modelToolCount: number,
  promptMinified: boolean,
  promptCompression: PromptCompressionMode,
): NonNullable<AgentResponse["measurement"]> {
  const system = params.systemMessage ?? "";
  const prompt = params.prompt ?? "";
  const assembledPromptChars = system.length + prompt.length;
  return {
    promptChars: prompt.length,
    systemChars: system.length,
    assembledPromptChars,
    estimatedPromptTokens: Math.ceil(assembledPromptChars / 4),
    exposedToolCount,
    modelToolCount,
    promptMinified: promptMinified || promptCompression !== "none",
  };
}
