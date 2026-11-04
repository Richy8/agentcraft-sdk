import type { ToolDefinition } from "../../protocols/types.js";
import type { BaseLLMProvider } from "../../providers/base.provider.js";
import type { LLMCallParams, LLMResponse, ModelCapabilities } from "../../types/provider.types.js";
import type { RunTracer } from "../observability.js";
import {
  structuredOutputInstruction,
} from "../structured-output.js";
import type { AgentRunParams } from "../types.js";
import {
  STRUCTURED_TOOL_FALLBACK_INSTRUCTION,
  callModelWithStructuredOutput,
  createStructuredOutputTool,
  type StructuredOutputToolState,
} from "./structured-output-handler.js";

export function applyStructuredOutputPrompt(
  params: AgentRunParams,
  capabilities: ModelCapabilities,
): AgentRunParams {
  if (!params.responseSchema) return params;
  if (shouldUseStructuredToolFallback(params, capabilities)) {
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

export function shouldUseStructuredToolFallback(
  params: AgentRunParams,
  capabilities: ModelCapabilities,
): boolean {
  if (!params.responseSchema) return false;
  const fallback = params.structuredOutput?.toolFallback ?? "auto";
  if (fallback === false) return false;
  if (!capabilities.supportsTools) return false;
  return fallback === true || !capabilities.supportsJsonMode;
}

export function createStructuredOutputToolForRun(
  params: AgentRunParams,
  capabilities: ModelCapabilities,
): StructuredOutputToolState | undefined {
  if (!shouldUseStructuredToolFallback(params, capabilities) || !params.responseSchema) {
    return undefined;
  }
  return createStructuredOutputTool(params);
}

export async function callModelStructuredOutputFlow(options: {
  readonly provider: BaseLLMProvider;
  readonly llmParams: LLMCallParams;
  readonly tools: readonly ToolDefinition[];
  readonly params: AgentRunParams;
  readonly structuredTool?: StructuredOutputToolState;
  readonly tracer?: RunTracer;
  readonly parentSpanId?: string;
}): Promise<{ raw: LLMResponse; structuredResponse?: unknown }> {
  return await callModelWithStructuredOutput({
    provider: options.provider,
    llmParams: options.llmParams,
    tools: options.tools,
    params: options.params,
    ...(options.structuredTool !== undefined && { structuredTool: options.structuredTool }),
    ...(options.tracer !== undefined && { tracer: options.tracer }),
    ...(options.parentSpanId !== undefined && { parentSpanId: options.parentSpanId }),
  });
}
