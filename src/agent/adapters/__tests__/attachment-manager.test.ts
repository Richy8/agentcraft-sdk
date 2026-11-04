import { describe, expect, it } from "vitest";
import { AdapterRequirementError, AdapterToolConflictError } from "../../../errors/index.js";
import type { ModelCapabilities } from "../../../types/provider.types.js";
import type { AgentAdapter } from "../types.js";
import { attachAgentAdapter } from "../attachment-manager.js";

describe("adapter attachment manager", () => {
  it("attaches adapters once and queues init callbacks", () => {
    const state = stateFor();
    const adapter = { name: "search", init: async () => undefined };

    expect(attachAgentAdapter(adapter, state)).toBe(true);
    expect(attachAgentAdapter(adapter, state)).toBe(false);
    expect(state.adapters.map((item) => item.name)).toEqual(["search"]);
    expect(state.pendingInits).toHaveLength(1);
  });

  it("rejects unsupported capability requirements before mutating state", () => {
    const state = stateFor({ supportsVision: false });

    expect(() =>
      attachAgentAdapter({ name: "vision", requires: ["vision"] }, state),
    ).toThrow(AdapterRequirementError);
    expect(state.adapters).toHaveLength(0);
  });

  it("rejects static tool-name conflicts", () => {
    const state = stateFor();
    attachAgentAdapter({ name: "first", declaredToolNames: ["lookup"] }, state);

    expect(() =>
      attachAgentAdapter({ name: "second", declaredToolNames: ["lookup"] }, state),
    ).toThrow(AdapterToolConflictError);
  });
});

function stateFor(overrides: Partial<ModelCapabilities> = {}) {
  return {
    adapters: [] as AgentAdapter[],
    pendingInits: [],
    pendingConflictChecks: [],
    resolvedDynamicToolNames: new Set<string>(),
    capabilities: capabilities(overrides),
    model: "mock-model",
  };
}

function capabilities(overrides: Partial<ModelCapabilities> = {}): ModelCapabilities {
  return {
    maxContextLength: 128_000,
    maxOutputTokens: 4096,
    supportsTools: true,
    supportsJsonMode: true,
    supportsStreaming: true,
    supportsVision: true,
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
