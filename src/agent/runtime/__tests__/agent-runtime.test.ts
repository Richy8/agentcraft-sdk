import { describe, expect, it, vi } from "vitest";
import type { ToolDefinition } from "../../../protocols/types.js";
import type { LLMCallParams, ModelCapabilities } from "../../../types/provider.types.js";
import type { AgentAdapter } from "../../adapters/types.js";
import type { AgentRuntimeContext } from "../agent-runtime.js";
import { runAgentRuntime, streamAgentRuntime } from "../agent-runtime.js";

describe("agent runtime orchestration", () => {
  it("runs the orchestration path and reports selection, cache, trace, and cost", async () => {
    const callModelWithStructuredOutput = vi.fn(async () => ({
      raw: {
        success: true,
        content: "ok",
        tokensUsed: { prompt: 10, completion: 5, total: 15 },
        finishReason: "stop" as const,
      },
    }));
    const context = runtimeContext({ callModelWithStructuredOutput });

    const response = await runAgentRuntime(context, { prompt: "hello" });

    expect(response.content).toBe("ok");
    expect(response.selection).toMatchObject({
      toolSelection: "all",
      exposedTools: ["mock_tool"],
    });
    expect(response.cache?.summary.lookups).toBe(1);
    expect(response.trace?.some((span) => span.name === "agent.run")).toBe(true);
    expect(callModelWithStructuredOutput).toHaveBeenCalledOnce();
  });

  it("streams through provider streaming and attaches run metadata", async () => {
    const stream = vi.fn(async function* () {
      yield { delta: "hello" };
      yield {
        delta: "",
        finishReason: "stop" as const,
        usage: { prompt: 1, completion: 1, total: 2 },
      };
    });
    const context = runtimeContext({
      unifiedProvider: { stream, streamWithTools: stream },
      collectTools: vi.fn(async () => []),
    });

    const chunks = [];
    for await (const chunk of streamAgentRuntime(context, { prompt: "hello" })) {
      chunks.push(chunk);
    }

    expect(stream).toHaveBeenCalledOnce();
    expect(chunks[0]).toMatchObject({ type: "model_delta", delta: "hello" });
    expect(chunks.at(-1)).toMatchObject({ type: "final" });
    expect(chunks.at(-1)?.runId).toMatch(/^run_/);
  });
});

function runtimeContext(
  overrides: Partial<AgentRuntimeContext> = {},
): AgentRuntimeContext {
  const tool: ToolDefinition = {
    name: "mock_tool",
    description: "Mock tool",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async () => "ok",
  };
  const capabilities = modelCapabilities();
  return {
    provider: "mock",
    model: "mock-model",
    costFactor: 0,
    unifiedProvider: {
      call: vi.fn(),
      stream: vi.fn(),
      streamWithTools: vi.fn(),
    } as never,
    attachedAdapters: [],
    getCacheStats: () => ({
      hits: 1,
      misses: 0,
      writes: 0,
      skippedUnsafe: 0,
      stale: 0,
      corrupt: 0,
      oversized: 0,
      toolCallsAvoided: 1,
      estimatedSavedTokens: 12,
    }),
    toolSelectionMode: "all",
    getCapabilities: () => capabilities,
    resetCacheStats: vi.fn(),
    validateInputs: vi.fn(),
    validateCachePolicy: vi.fn(),
    ensureAttachedAdaptersInitialized: vi.fn(async () => undefined),
    createRunAdapterScope: vi.fn(() => ({ adapters: [] as AgentAdapter[], runOnlyAdapters: [] })),
    initRunAdapters: vi.fn(async () => undefined),
    cleanupRunAdapters: vi.fn(async () => undefined),
    resolvePromptCompression: vi.fn(() => "none"),
    applyPromptCompression: vi.fn((params) => params),
    preprocessDirectives: vi.fn((params) => params),
    collectTools: vi.fn(async () => [tool]),
    toLLMParams: vi.fn((params): LLMCallParams => ({ prompt: params.prompt ?? "" })),
    callModelWithStructuredOutput: vi.fn(async () => ({
      raw: {
        success: true,
        content: "ok",
        tokensUsed: { prompt: 1, completion: 1, total: 2 },
        finishReason: "stop" as const,
      },
    })),
    isCacheBypassed: vi.fn(() => false),
    ...overrides,
  };
}

function modelCapabilities(): ModelCapabilities {
  return {
    maxContextLength: 128_000,
    maxOutputTokens: 4096,
    supportsTools: true,
    supportsJsonMode: true,
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
  };
}
