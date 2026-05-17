import { describe, expect, it } from "vitest";
import { AgentMemory } from "../../agent/memory/index.js";

const integrationEnabled = process.env.INTEGRATION_TESTS === "true";
const memoryEnabled = process.env.AGENTCRAFT_LIVE_SEMANTIC_MEMORY === "true";
const openAiKey = process.env.OPENAI_API_KEY;
const liveIt = integrationEnabled && memoryEnabled && openAiKey ? it : it.skip;

describe("live semantic memory", () => {
  const embeddings = () =>
    AgentMemory.embeddings.openAI({
      apiKey: openAiKey!,
      model: process.env.AGENTCRAFT_LIVE_EMBEDDING_MODEL ?? "text-embedding-3-small",
    });

  liveIt("reads and writes through Qdrant URL mode when configured", async () => {
    const url = process.env.AGENTCRAFT_LIVE_QDRANT_URL;
    const collection = process.env.AGENTCRAFT_LIVE_QDRANT_COLLECTION;
    if (!url || !collection) return;
    const memory = AgentMemory.vector({
      provider: "qdrant",
      url,
      apiKey: process.env.AGENTCRAFT_LIVE_QDRANT_API_KEY,
      collection,
      embeddings: embeddings(),
      writes: { requireApproval: false },
    });
    const id = `agentcraft-live-${Date.now()}`;
    await memory.add({
      id,
      scope: "live",
      text: "AgentCraft live semantic memory smoke test for cache-aware agents.",
      source: "integration-test",
    });
    const results = await memory.search("cache-aware semantic memory", {
      scopes: ["live"],
      topK: 3,
    });
    expect(results.some((item) => item.id === id)).toBe(true);
    await memory.delete(id, { approved: true });
  });

  liveIt("reads and writes through Pinecone URL mode when configured", async () => {
    const url = process.env.AGENTCRAFT_LIVE_PINECONE_URL;
    const index = process.env.AGENTCRAFT_LIVE_PINECONE_INDEX;
    const apiKey = process.env.AGENTCRAFT_LIVE_PINECONE_API_KEY;
    if (!url || !index || !apiKey) return;
    const memory = AgentMemory.vector({
      provider: "pinecone",
      url,
      apiKey,
      index,
      namespace: "agentcraft-live-test",
      embeddings: embeddings(),
      writes: { requireApproval: false },
    });
    const id = `agentcraft-live-${Date.now()}`;
    await memory.add({ id, scope: "live", text: "AgentCraft Pinecone memory smoke test." });
    const results = await memory.search("Pinecone memory smoke", { topK: 3 });
    expect(results.some((item) => item.id === id)).toBe(true);
    await memory.delete(id, { approved: true });
  });

  liveIt("reads and writes through Supabase pgvector mode when configured", async () => {
    const url = process.env.AGENTCRAFT_LIVE_SUPABASE_URL;
    const apiKey = process.env.AGENTCRAFT_LIVE_SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !apiKey) return;
    const memory = AgentMemory.vector({
      provider: "supabase",
      url,
      apiKey,
      table: process.env.AGENTCRAFT_LIVE_SUPABASE_MEMORY_TABLE ?? "agentcraft_memory",
      searchRpc: process.env.AGENTCRAFT_LIVE_SUPABASE_MEMORY_RPC ?? "match_agentcraft_memory",
      embeddings: embeddings(),
      writes: { requireApproval: false },
    });
    const id = `agentcraft-live-${Date.now()}`;
    await memory.add({ id, scope: "live", text: "AgentCraft Supabase pgvector memory smoke test." });
    const results = await memory.search("Supabase pgvector memory", { topK: 3 });
    expect(results.some((item) => item.id === id)).toBe(true);
    await memory.delete(id, { approved: true });
  });
});
