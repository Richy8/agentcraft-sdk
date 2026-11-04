# Semantic Memory for Agents

For persistent cross-run memory, use `AgentMemory`. It supports local, Qdrant, Pinecone, and Supabase vector backends.

## Quick Start

```ts
import { Agent, AgentMemory, Provider } from "@deskcreate/agentcraft";

const memory = AgentMemory.create({
  backend: "local",
  scope: "session",
});

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Store facts
await memory.store({
  content: "Brand tone: direct, no buzzwords. Avoid 'leverage' and 'synergy'.",
});

// Recall relevant context before a run
const recalled = await memory.search({ query: "brand voice", topK: 3 });
const context = recalled.map((r) => r.content).join("\n");

const response = await agent.run({
  prompt: "Write a LinkedIn post about our new MCP adapter.",
  system: context,
});

console.log(response.content);
```

## Persistent Backends

### Qdrant

```ts
const memory = AgentMemory.create({
  backend: "qdrant",
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY,
  collectionName: "agent-memory",
});
```

### Pinecone

```ts
const memory = AgentMemory.create({
  backend: "pinecone",
  apiKey: process.env.PINECONE_API_KEY!,
  indexName: "agent-memory",
  namespace: "default",
});
```

### Supabase

```ts
const memory = AgentMemory.create({
  backend: "supabase",
  url: process.env.SUPABASE_URL!,
  serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  tableName: "agent_memory",
});
```

## Related

- [Semantic Memory](./semantic-memory.md) — full `AgentMemory` reference
- [Artifact Store](./artifact-store.md) — structured typed artifact persistence
- [Authoring a Domain Store](./authoring-domain-store.md) — build custom domain-specific stores
