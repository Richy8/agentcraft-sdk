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

| Driver                  | Required | Default | Purpose                                             |
| ----------------------- | -------- | ------- | --------------------------------------------------- |
| `AgentCache.file(root)` | Yes      | None    | File-backed cache for local production deployments. |
| `AgentCache.memory()`   | No       | None    | In-memory cache for tests and ephemeral runs.       |
| `AgentCache.disabled()` | No       | None    | Explicitly disables caching.                        |

```ts
import { AgentCache } from "agentcraft";

const cache = AgentCache.memory({
  defaultTtlMs: 60_000,
  maxEntryBytes: 100_000,
});

console.log(cache.config.type);
```

## CachePolicy

`cachePolicy` on `RunBudget` enforces cache hits before selected tools are allowed to execute.

| Field / Option     | Required | Default | Purpose                                                              |
| ------------------ | -------- | ------- | -------------------------------------------------------------------- |
| `requireCachedFor` | No       | None    | Tool names that must have a cache hit before execution can continue. |

```ts
await agent.run({
  prompt: "Summarize the cached research.",
  budget: {
    maxCost: 0.1,
    cachePolicy: {
      requireCachedFor: ["web_search", "fetch_url"],
    },
  },
});
```

## Strategy Notes

| Strategy       | Best for                           | Risk posture  | Related page                                 |
| -------------- | ---------------------------------- | ------------- | -------------------------------------------- |
| `conservative` | Regulated or private tasks         | Lowest reuse  | [Security](../production/security-model.md)  |
| `auto`         | Normal apps                        | Balanced      | [AgentCache](../persistence/agent-cache.md)  |
| `aggressive`   | Repeated research and docs lookups | Highest reuse | [Tool Caching](../tools/tool-caching.md)     |
| `disabled`     | Sensitive one-off tasks            | No retention  | [Production](../production/api-stability.md) |
