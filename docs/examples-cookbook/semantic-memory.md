# Semantic Memory Examples

Giving agents persistent associative memory across runs.

## In-Memory Backend (Local)

```ts
import { Agent, AgentMemory, Provider } from "@deskcreate/agentcraft";

const memory = AgentMemory.local();

// Store a memory
await memory.add("The user prefers concise bullet-point answers.", {
  userId: "user-123",
});
await memory.add("The user's timezone is UTC+1.", { userId: "user-123" });
await memory.add("The user is working on a TypeScript SDK project.", {
  userId: "user-123",
});

// Search for relevant memories before a run
const relevant = await memory.search("What are this user's preferences?", {
  limit: 3,
  threshold: 0.7,
  filter: { userId: "user-123" },
});

// Inject into agent run
const context = relevant.map((m) => m.text).join("\n");

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Explain async/await patterns.",
  systemPrompt: `User context:\n${context}`,
});
```

## `memory.add(text, metadata)`

Store a memory with optional metadata for filtering:

```ts
await memory.add("The project uses Vitest for testing.", {
  project: "agentcraft",
  category: "tooling",
  timestamp: Date.now(),
});
```

## `memory.search(query, options)`

Find the most relevant memories for a given query:

```ts
const results = await memory.search(
  "What testing framework does this project use?",
  {
    limit: 5,
    threshold: 0.6, // minimum similarity score (0–1)
    filter: { project: "agentcraft" },
  },
);

for (const result of results) {
  console.log(`Score: ${result.score.toFixed(3)} — ${result.text}`);
}
```

## Multi-Session Continuity Pattern

Build up memory across sessions and inject it in each new session:

```ts
// Session 1 — add memories
const memory = AgentMemory.local();
await memory.add("The user asked about caching strategies.");
await memory.add(
  "The user understood TTL but was confused about LRU eviction.",
);

// Session 2 — recall and inject
const priorContext = await memory.search("What did we discuss before?", {
  limit: 5,
});
const contextText = priorContext.map((m) => m.text).join("\n");

const response = await agent.run({
  prompt: "Let's continue our previous discussion.",
  systemPrompt: `Prior conversation context:\n${contextText}`,
});
```

## Qdrant Backend Setup

For production use with persistent storage and efficient vector search:

```ts
import { AgentMemory } from "@deskcreate/agentcraft";

const memory = AgentMemory.qdrant({
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY,
  collectionName: "agent-memory",
  dimension: 1536, // OpenAI ada-002 dimensions
});

await memory.add("Customer A prefers email over Slack.", {
  customerId: "cust-a",
});

const results = await memory.search("How does Customer A communicate?", {
  filter: { customerId: "cust-a" },
});
```

## Pinecone Backend Setup

```ts
const memory = AgentMemory.pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
  indexName: "agent-memory",
  namespace: "production",
});
```

## Supabase Backend Setup

```ts
const memory = AgentMemory.supabase({
  url: process.env.SUPABASE_URL!,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  tableName: "agent_memory",
});
```

## Namespace Isolation

Separate memories per user, session, or domain:

```ts
const userMemory = AgentMemory.qdrant({
  url: process.env.QDRANT_URL!,
  collectionName: `memory-${userId}`, // per-user collection
});
```

## Related

- [Semantic Memory reference](../persistence/semantic-memory.md)
- [Memory & Store Config](../configuration/memory-store-config.md)
- [Creator Memory Store](../persistence/creator-memory-store.md)
