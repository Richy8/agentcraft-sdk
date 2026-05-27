import { mkdtemp } from "node:fs/promises";
import * as os from "node:os";
import * as path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { Agent } from "../agent.js";
import { AgentMemory } from "../memory/index.js";
import type { AgentMemoryAddInput } from "../memory/index.js";
import { AgentReports } from "../reports/index.js";
import { AgentWorkspace } from "../workspace.js";
import { Provider } from "../provider-catalog.js";

async function tempRoot(): Promise<string> {
  return await mkdtemp(path.join(os.tmpdir(), "agentcraft-memory-"));
}

describe("AgentMemory", () => {
  it("requires durable write approval by default", async () => {
    const memory = AgentMemory.local({ root: await tempRoot() });

    await expect(
      memory.add({ scope: "brand", text: "Voice is direct and practical." }),
    ).rejects.toThrow("requires approval");

    await expect(
      memory.add(
        { scope: "brand", text: "Voice is direct and practical." },
        { approved: true },
      ),
    ).resolves.toMatchObject({ scope: "brand" });
  });

  it("searches local memory with bounded lexical retrieval and provenance", async () => {
    const memory = AgentMemory.local({
      root: await tempRoot(),
      namespace: "linkedin",
      maxContextChars: 80,
      writes: { requireApproval: false },
    });

    await memory.add({
      scope: "brand",
      text: "Brand voice: clear, practical, no hype, no motivational filler.",
      source: "brand-workshop",
      metadata: { owner: "user" },
    });
    await memory.add({
      scope: "audience",
      text: "Audience wants concrete operator examples about AI cost control.",
      source: "research",
    });

    const results = await memory.search("brand voice practical", {
      scopes: ["brand"],
      topK: 2,
      maxContextChars: 32,
    });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      scope: "brand",
      source: "brand-workshop",
      metadata: { owner: "user" },
    });
    expect(results[0]!.text.length).toBeLessThanOrEqual(32);
  });

  it("rejects likely secrets and records memory blocked events", async () => {
    const memory = AgentMemory.local({
      root: await tempRoot(),
      writes: { requireApproval: false },
    });
    const workspace = AgentWorkspace.create({ memory });
    const events = AgentReports.eventCollector(workspace.events);

    await expect(
      memory.add({ scope: "credentials", text: "apiKey=sk-test-secret-value-1234567890" }),
    ).rejects.toThrow("refusing to store");

    const report = AgentReports.fromResponse(fakeResponse(), { events: events.events() });
    expect(report.memory).toMatchObject({ blocked: 1, warnings: expect.arrayContaining([expect.stringContaining("refusing")]) });
  });

  it("wraps custom stores without forcing a storage backend", async () => {
    const custom = {
      add: vi.fn(async (input: AgentMemoryAddInput) => ({
        id: input.id ?? "custom-1",
        scope: input.scope ?? "default",
        text: input.text,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      })),
      search: vi.fn(async () => [
        {
          id: "custom-1",
          scope: "default",
          text: "custom memory",
          createdAt: "2026-01-01T00:00:00.000Z",
          updatedAt: "2026-01-01T00:00:00.000Z",
          score: 0.9,
        },
      ]),
      delete: vi.fn(async () => true),
    };
    const memory = AgentMemory.custom(custom);

    await expect(memory.add({ text: "custom memory" })).resolves.toMatchObject({
      id: "custom-1",
    });
    await expect(memory.search("custom")).resolves.toHaveLength(1);
    await expect(memory.delete("custom-1")).resolves.toBe(true);
  });

  it("injects bounded workspace memory into single-agent runs", async () => {
    const memory = AgentMemory.local({
      root: await tempRoot(),
      maxContextChars: 320,
      writes: { requireApproval: false },
    });
    await memory.add({
      scope: "brand",
      text: "Brand voice: specific, operator-led, allergic to vague transformation claims.",
      source: "brand-workshop",
    });
    const workspace = AgentWorkspace.create({ memory });
    const agent = Agent.create({ model: Provider.ollama["llama3.2"], workspace });
    const provider = (agent as unknown as { unifiedProvider: { call: ReturnType<typeof vi.fn> } })
      .unifiedProvider;
    provider.call = vi.fn(async () => fakeResponse());

    await agent.run({ prompt: "Draft LinkedIn ideas using the brand voice." });

    expect(provider.call).toHaveBeenCalledOnce();
    const params = provider.call.mock.calls[0]?.[0] as { systemMessage?: string };
    expect(params.systemMessage).toContain("AgentCraft Semantic Memory");
    expect(params.systemMessage).toContain("operator-led");
    expect(params.systemMessage!.length).toBeLessThan(520);
  });

  it("can disable memory retrieval per run", async () => {
    const memory = AgentMemory.local({
      root: await tempRoot(),
      writes: { requireApproval: false },
    });
    await memory.add({ scope: "brand", text: "Brand voice should not appear." });
    const agent = Agent.create({
      model: Provider.ollama["llama3.2"],
      workspace: AgentWorkspace.create({ memory }),
    });
    const provider = (agent as unknown as { unifiedProvider: { call: ReturnType<typeof vi.fn> } })
      .unifiedProvider;
    provider.call = vi.fn(async () => fakeResponse());

    await agent.run({ prompt: "Draft one idea.", memory: false });

    const params = provider.call.mock.calls[0]?.[0] as { systemMessage?: string };
    expect(params?.systemMessage ?? "").not.toContain("AgentCraft Semantic Memory");
  });
});

function fakeResponse() {
  return {
    success: true,
    content: "ok",
    tokensUsed: { prompt: 1, completion: 1, total: 2 },
    cost: 0,
    finishReason: "stop" as const,
    provider: "ollama",
    model: "fake",
  };
}
