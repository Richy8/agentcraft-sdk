# Tool Caching

Tool caching reuses safe read-tool results through `AgentCache`. It is useful for repeated web fetches, corpus reads, SEO fixtures, and other stable read operations.

## Setup

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache: AgentCache.file(".agentcraft/cache", {
    strategy: "auto",
    defaultTtlMs: 300_000,
  }),
}).use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

const response = await agent.run({
  prompt: "Find the latest on TypeScript 5.5.",
});
console.log(response.cache?.hits, response.cache?.toolCallsAvoided);
```

## Rules

| Tool side effect | Auto strategy | Reason                            |
| ---------------- | ------------- | --------------------------------- |
| `none`           | Cached        | Safe deterministic helper.        |
| `read`           | Cached        | Safe read result.                 |
| `external`       | Not cached    | External/current data may change. |
| `write`          | Not cached    | Must never replay side effects.   |

Strategies tighten or loosen this behavior:

- `conservative` caches `none` tools and read tools with explicit `security.cache.safe` or `security.cache.deterministic`.
- `auto` caches non-sensitive `none` and `read` tools.
- `aggressive` can cache `external` tool results, but still refuses writes, sensitive results, and confirmation-gated tools.

```ts
const tool = {
  name: "read_reference",
  description: "Read a stable reference.",
  security: {
    sideEffect: "read",
    cache: {
      safe: true,
      deterministic: true,
      ttlMs: 300_000,
    },
  },
  parameters: { type: "object", properties: {}, required: [] },
  execute: async () => ({ value: "stable" }),
};
```

## Bypass

```ts
const response = await agent.run({
  prompt: "Refresh from source.",
  cache: { bypass: true },
});
console.log(response.content);
```

## Related

- [AgentCache](../persistence/agent-cache.md)
- [Tool Policy](../tools/tool-policy.md)
