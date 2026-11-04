# Persistence & Caching Examples

Caching tool results and persisting agent outputs.

## AgentCache With Memory Backend

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache: AgentCache.memory(),
});

const response = await agent.run({
  prompt: "Fetch and summarize the AgentCraft README.",
});
console.log(`Cache hits: ${response.cache?.hits}`);
```

## File-Backed Cache

Persists across process restarts:

```ts
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache: AgentCache.file(".agentcraft/cache", { maxEntries: 1000 }),
});
```

## Enabling Cache on a Tool

Only tools with cache metadata marked as safe are eligible for conservative caching:

```ts
import { tool } from "@deskcreate/agentcraft/adapters";

const getWeather = tool("get_weather", {
  description: "Get current weather for a city.",
  params: {
    city: { type: "string", description: "City name" },
  },
  sideEffect: "read",
  cache: { safe: true, deterministic: true, ttlMs: 300_000 }, // 5 min
  run: async ({ city }) => {
    const res = await fetch(`https://api.weather.example.com/${city}`);
    return res.json();
  },
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache: AgentCache.memory(),
});

const response = await agent.run({
  prompt: "Check the current weather in Lagos.",
  tools: [getWeather],
});
```

## Reading Cache Statistics

```ts
const response = await agent.run({ prompt: "What is the weather in London?" });

const cacheStats = response.cache;
console.log(`Hits: ${cacheStats?.hits}`);
console.log(`Misses: ${cacheStats?.misses}`);
console.log(`Tool calls avoided: ${cacheStats?.toolCallsAvoided}`);
console.log(`Estimated saved tokens: ${cacheStats?.estimatedSavedTokens}`);
```

## Warming the Cache Before a Batch Run

```ts
const cache = AgentCache.file(".agentcraft/cache");

await cache.warm([
  {
    toolName: "get_weather",
    args: { city: "London" },
    result: { temp: 15, condition: "cloudy" },
    ttlMs: 3_600_000,
  },
  {
    toolName: "get_weather",
    args: { city: "New York" },
    result: { temp: 22, condition: "sunny" },
    ttlMs: 3_600_000,
  },
]);

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache,
}).use(getWeather);

// All weather tool calls served from cache — no API calls made
const batch = await Promise.all([
  agent.run({ prompt: "What's the weather in London?" }),
  agent.run({ prompt: "What's the weather in New York?" }),
]);
```

## ArtifactStore: Persisting Agent Outputs

```ts
import { FileArtifactStore } from "@deskcreate/agentcraft";

const store = new FileArtifactStore({ root: ".agentcraft/outputs" });

const response = await agent.run({
  prompt: "Write a product spec for feature X.",
});

const ref = await store.put({
  type: "document",
  data: { content: response.content, cost: response.cost },
  tags: ["product-spec", "feature-x"],
});

console.log(`Saved: ${ref.id}`);
```

## Retrieving a Stored Artifact

```ts
const artifact = await store.get(ref.id);
console.log(artifact.data.content);
```

## Listing Artifacts by Tag

```ts
const specs = await store.list({ tags: ["product-spec"] });
console.log(`Found ${specs.length} product specs`);
```

## SQLite Backend for Structured Queries

```ts
import { SQLiteArtifactStore } from "@deskcreate/agentcraft";

const store = new SQLiteArtifactStore({ path: ".agentcraft/artifacts.db" });

await store.put({
  type: "summary",
  data: { content: "..." },
  tags: ["weekly"],
});

const weekly = await store.list({ tags: ["weekly"], limit: 10 });
```

## Related

- [AgentCache](../persistence/agent-cache.md)
- [Cache Warming](../persistence/cache-warming.md)
- [Artifact Store](../persistence/artifact-store.md)
- [Tool Caching](../tools/tool-caching.md)
