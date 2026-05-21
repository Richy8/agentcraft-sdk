import { mkdtemp } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { AgentMemory } from "../index.js";
import type { AgentMemoryAddInput, AgentMemoryStore } from "../index.js";

async function tempRoot(): Promise<string> {
  return await mkdtemp(path.join(os.tmpdir(), "agentcraft-memory-stores-"));
}

describe("AgentMemory stores", () => {
  it("keeps local store records private while returning public search records", async () => {
    const memory = AgentMemory.local({
      root: await tempRoot(),
      writes: { requireApproval: false },
    });

    await memory.add({
      scope: "brand",
      text: "Brand voice is direct, concrete, and evidence aware.",
    });
    const results = await memory.search("direct evidence", { scopes: ["brand"], topK: 1 });

    expect(results[0]).toMatchObject({ scope: "brand" });
    expect(results[0]).not.toHaveProperty("embedding");
  });

  it("delegates custom stores without wrapping or leaking implementation details", async () => {
    const custom: AgentMemoryStore = {
      add: vi.fn(async (input: AgentMemoryAddInput) => ({
        id: input.id ?? "custom",
        scope: input.scope ?? "default",
        text: input.text,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      })),
      search: vi.fn(async () => []),
      summarize: vi.fn(async () => "custom summary"),
      delete: vi.fn(async () => true),
    };
    const memory = AgentMemory.custom(custom);

    await expect(memory.summarize!("query")).resolves.toBe("custom summary");
    expect(custom.summarize).toHaveBeenCalledWith("query", undefined);
  });

  it("uses vector clients with dense embeddings and redacted connection events", async () => {
    const writes: unknown[] = [];
    const reads: unknown[] = [];
    const memory = AgentMemory.vector({
      provider: "qdrant",
      collection: "memories",
      url: "https://user:pass@example.test?api_key=secret",
      apiKey: "secret",
      embeddings: {
        model: "test-embedding",
        embed: vi.fn(async () => [0.1, 0.2, 0.3]),
      },
      writes: { requireApproval: false },
      retrieval: { topK: 1 },
      client: {
        upsert: vi.fn(async () => undefined),
        search: vi.fn(async () => [
          {
            id: "memory-1",
            score: 0.92,
            payload: {
              id: "memory-1",
              scope: "brand",
              text: "Evidence-backed positioning note.",
              createdAt: "2026-01-01T00:00:00.000Z",
              updatedAt: "2026-01-01T00:00:00.000Z",
            },
          },
        ]),
        delete: vi.fn(async () => undefined),
      },
    });
    memory.setEventEmitter?.({
      emit: (type, payload) => {
        if (type === "memory.write") writes.push(payload);
        if (type === "memory.read") reads.push(payload);
      },
    } as never);

    await memory.add({ scope: "brand", text: "Positioning note." });
    await expect(memory.search("positioning")).resolves.toHaveLength(1);

    expect(decodeURIComponent(JSON.stringify(writes))).toContain("[REDACTED]");
    expect(decodeURIComponent(JSON.stringify(reads))).toContain("[REDACTED]");
    expect(JSON.stringify(writes)).not.toContain("secret");
  });
});
