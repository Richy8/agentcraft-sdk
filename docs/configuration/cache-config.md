# Cache Config

Cache config controls reusable context and tool output retention. It is available from `AgentCache` at the root `agentcraft` import.

## Fields

| Option          | Required       | Default         | Purpose                                  |
| --------------- | -------------- | --------------- | ---------------------------------------- |
| `type`          | Yes            | None            | `file`, `memory`, or `disabled`.         |
| `root`          | For file cache | Undefined       | Cache directory.                         |
| `strategy`      | No             | `auto`          | `conservative`, `auto`, or `aggressive`. |
| `namespace`     | No             | `default`       | Tenant/workspace isolation.              |
| `version`       | No             | `v1`            | Manual invalidation boundary.            |
| `defaultTtlMs`  | No             | Runtime default | Default entry lifetime.                  |
| `maxEntryBytes` | No             | Unlimited       | Rejects oversized entries.               |

## Usage

```ts
import { Agent, AgentCache, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache: AgentCache.file("./.agentcraft/cache", {
    strategy: "auto",
    namespace: "docs-production",
    version: "v1",
    defaultTtlMs: 60 * 60 * 1000,
    maxEntryBytes: 250_000,
  }),
});
```

## Cache Drivers

| Driver                                    | Purpose                                                                           |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| `AgentCache.file(root, options?)`         | File-backed cache for local and production deployments. Persists across restarts. |
| `AgentCache.memory(options?)`             | In-memory cache for tests and ephemeral runs. Cleared on process exit.            |
| `AgentCache.disabled()`                   | Explicitly disables caching — no reads or writes.                                 |
| `AgentCache.placeholder(root, strategy?)` | Shorthand for `file()` with only a root and strategy. Useful for quick setup.     |

```ts
import { AgentCache } from "agentcraft";

// In-memory cache — good for tests
const memCache = AgentCache.memory({
  defaultTtlMs: 60_000,
  maxEntryBytes: 100_000,
});

// Placeholder — quick file cache with just a root path and strategy
const quickCache = AgentCache.placeholder("./.agentcraft/cache", "auto");

// Disabled — disables caching explicitly even if the agent has a default
const noCache = AgentCache.disabled();

console.log(memCache.config.type); // → "memory"
console.log(quickCache.config.type); // → "file"
console.log(noCache.config.type); // → "disabled"
```

## CachePolicy

`cachePolicy` on `RunBudget` enforces cache hits before selected tools are allowed to execute.

| Field / Option     | Required | Default | Purpose                                                              |
| ------------------ | -------- | ------- | -------------------------------------------------------------------- |
| `requireCachedFor` | No       | None    | Tool names that must have a cache hit before execution can continue. |

```ts
const response = await agent.run({
  prompt: "Summarize the cached research.",
  budget: {
    maxCost: 0.1,
    cachePolicy: {
      requireCachedFor: ["web_search", "fetch_url"],
    },
  },
});
console.log(response.content);
```

## Strategy Notes

| Strategy       | Best for                           | Risk posture  | Related page                                 |
| -------------- | ---------------------------------- | ------------- | -------------------------------------------- |
| `conservative` | Regulated or private tasks         | Lowest reuse  | [Security](../production/security-model.md)  |
| `auto`         | Normal apps                        | Balanced      | [AgentCache](../persistence/agent-cache.md)  |
| `aggressive`   | Repeated research and docs lookups | Highest reuse | [Tool Caching](../tools/tool-caching.md)     |
| `disabled`     | Sensitive one-off tasks            | No retention  | [Production](../production/api-stability.md) |
