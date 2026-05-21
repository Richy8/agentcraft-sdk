import { describe, expect, it, vi } from "vitest";
import type { ToolDefinition } from "../../../protocols/types.js";
import type { ModelCapabilities } from "../../../types/provider.types.js";
import {
  applyStructuredOutputPrompt,
  callModelStructuredOutputFlow,
  createStructuredOutputToolForRun,
  shouldUseStructuredToolFallback,
} from "../structured-output-flow.js";

const schema = {
  type: "object" as const,
  properties: { answer: { type: "string" as const } },
  required: ["answer"],
};

const jsonModeCaps = capabilities({ supportsTools: true, supportsJsonMode: true });
const toolOnlyCaps = capabilities({ supportsTools: true, supportsJsonMode: false });

describe("structured-output-flow", () => {
  it("uses native JSON mode when available and fallback is automatic", () => {
    const params = applyStructuredOutputPrompt(
      { prompt: "answer", system: "base", responseSchema: schema },
      jsonModeCaps,
    );

    expect(shouldUseStructuredToolFallback(params, jsonModeCaps)).toBe(false);
    expect(params.responseFormat).toEqual({ type: "json_object" });
    expect(params.system).toContain("Return only valid JSON");
    expect(params.system).not.toContain("structured output tool");
  });

  it("uses tool fallback when JSON mode is unavailable", () => {
    const params = applyStructuredOutputPrompt(
      { prompt: "answer", responseSchema: schema },
      toolOnlyCaps,
    );

    expect(shouldUseStructuredToolFallback(params, toolOnlyCaps)).toBe(true);
    expect(params.responseFormat).toBeUndefined();
    expect(params.system).toContain("Return only valid JSON");
    expect(createStructuredOutputToolForRun(params, toolOnlyCaps)?.tool.name).toBe(
      "submit_structured_response",
    );
  });

  it("delegates model calls with structured tool context intact", async () => {
    const callModel = vi.fn(async () => ({
      success: true,
      content: '{"answer":"yes"}',
      tokensUsed: { prompt: 1, completion: 1, total: 2 },
      finishReason: "stop" as const,
    }));
    const provider = { call: callModel, callWithTools: callModel };
    const tool: ToolDefinition = {
      name: "noop",
      description: "Noop",
      parameters: { type: "object", properties: {}, required: [] },
      execute: async () => "ok",
    };

    await callModelStructuredOutputFlow({
      provider: provider as never,
      llmParams: { prompt: "answer" },
      tools: [tool],
      params: { prompt: "answer", responseSchema: schema },
    });

    expect(callModel).toHaveBeenCalledWith(
      { prompt: "answer" },
      expect.arrayContaining([expect.objectContaining({ name: "noop" })]),
    );
  });
});

function capabilities(
  overrides: Partial<ModelCapabilities> = {},
): ModelCapabilities {
  return {
    maxContextLength: 128_000,
    maxOutputTokens: 4096,
    supportsTools: false,
    supportsJsonMode: false,
    supportsStreaming: true,
    supportsVision: false,
    supportsAudio: false,
    supportsVideo: false,
    supportsFiles: false,
    optimizedFor: ["quality"],
    qualityScore: 1,
    speedScore: 1,
    costPerMInputToken: 0,
    costPerMOutputToken: 0,
    ...overrides,
  };
}
