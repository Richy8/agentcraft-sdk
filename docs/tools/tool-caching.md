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

| Tool side effect | Cached?                       | Reason                            |
| ---------------- | ----------------------------- | --------------------------------- |
| `none`           | Yes                           | Safe deterministic helper.        |
| `read`           | Yes                           | Safe read result.                 |
| `external`       | No by default in unsafe paths | External/current data may change. |
| `write`          | No                            | Must never replay side effects.   |

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
