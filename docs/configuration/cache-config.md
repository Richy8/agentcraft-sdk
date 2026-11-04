# Cache Config

Cache config controls reusable context and tool output retention. It is available from `AgentCache` at the root `agentcraft` import.

## Fields

| Option          | Required       | Default            | Purpose                                                                   |
| --------------- | -------------- | ------------------ | ------------------------------------------------------------------------- |
| `type`          | Yes            | None               | `file`, `memory`, `redis`, `postgres`, `sqlite`, `custom`, or `disabled`. |
| `root`          | For file cache | Undefined          | Cache directory.                                                          |
| `strategy`      | No             | `auto`             | `conservative`, `auto`, or `aggressive`.                                  |
| `namespace`     | No             | `default`          | Tenant/workspace isolation.                                               |
| `version`       | No             | `v1`               | Manual invalidation boundary.                                             |
| `defaultTtlMs`  | No             | Runtime default    | Default entry lifetime.                                                   |
| `maxEntryBytes` | No             | Unlimited          | Rejects oversized entries.                                                |
| `keyPrefix`     | No             | Driver default     | Prefix for distributed cache keys.                                        |
| `tableName`     | SQL drivers    | `agentcraft_cache` | SQL table for Postgres/SQLite cache.                                      |
| `locking`       | No             | Disabled           | Distributed lock settings for cache misses.                               |

## Usage

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";

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
| `AgentCache.redis(options)`               | Redis URL/client cache with optional distributed locking.                         |
| `AgentCache.postgres(options)`            | Postgres URL/pool cache, including Supabase direct Postgres URLs.                 |
| `AgentCache.sqlite(options)`              | SQLite file cache for local durable single-node setups.                           |
| `AgentCache.custom(controller)`           | User-supplied cache controller.                                                   |
| `AgentCache.fromUrl(url, options?)`       | URL parser for Redis, Postgres, and file-backed SQLite cache.                     |
| `AgentCache.disabled()`                   | Explicitly disables caching — no reads or writes.                                 |
| `AgentCache.placeholder(root, strategy?)` | Shorthand for `file()` with only a root and strategy. Useful for quick setup.     |

```ts
import { AgentCache } from "@deskcreate/agentcraft";

// In-memory cache — good for tests
const memCache = AgentCache.memory({
  strategy: "auto",
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

## Distributed Drivers

Redis URL:

```ts
const cache = AgentCache.redis({
  url: process.env.REDIS_URL!,
  namespace: "prod",
  locking: { enabled: true, ttlMs: 30_000 },
});
```

Redis client:

```ts
const cache = AgentCache.redis({
  client: redisClient,
  namespace: "prod",
});
```

Supabase/Postgres URL:

```ts
const cache = AgentCache.postgres({
  url: process.env.SUPABASE_DB_URL!,
  tableName: "agentcraft_cache",
});
```

Postgres pool:

```ts
const cache = AgentCache.postgres({
  pool,
  tableName: "agentcraft_cache",
});
```

SQLite:

```ts
const cache = AgentCache.sqlite({
  filePath: ".agentcraft/cache.sqlite",
  namespace: "local",
});
```

Custom controller:

```ts
const cache = AgentCache.custom({
  config: { type: "custom", namespace: "tenant-a" },
  getEntry: async (key) => myCache.getEntry(key),
  set: async (key, value, options) => myCache.set(key, value, options),
});
```

Cache warming:

```ts
const warm = await AgentCache.warm(agent, prompts, {
  concurrency: 2,
  stopOnError: false,
});

console.log(warm.cache.hits);
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

Strategy behavior is enforced by tool metadata:

- `conservative` requires `sideEffect: "none"` or explicit `security.cache.safe` / `security.cache.deterministic`.
- `auto` caches non-sensitive `none` and `read` tools.
- `aggressive` can cache `external` tools, but never write tools or confirmation-gated tools.

Tool authors can add cache metadata directly to the tool security block:

```ts
const tool = {
  name: "lookup_reference",
  description: "Lookup a stable reference by ID.",
  security: {
    sideEffect: "read",
    cache: {
      safe: true,
      deterministic: true,
      ttlMs: 60_000,
    },
  },
  parameters: { type: "object", properties: {}, required: [] },
  execute: async () => ({ value: "cached safely" }),
};
```
