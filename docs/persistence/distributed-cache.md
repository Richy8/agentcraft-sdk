# Distributed Cache

Distributed cache lets AgentCraft reuse safe tool results across processes, workers, serverless instances, and team/workflow runs. It builds on the same `AgentCacheController` interface used by `AgentCache.file()` and `AgentCache.memory()`.

AgentCraft supports URL and non-URL setup:

- Redis URL or Redis client.
- Postgres/Supabase Postgres URL or `pg` pool.
- SQLite file path.
- Custom controller.

## Redis URL

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";

const cache = AgentCache.redis({
  url: process.env.REDIS_URL!,
  namespace: "agentcraft-prod",
  version: "v1",
  defaultTtlMs: 24 * 60 * 60 * 1000,
  locking: {
    enabled: true,
    ttlMs: 30_000,
    waitMs: 1_000,
  },
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache,
});
```

Install the optional peer dependency when using URL mode:

```bash
npm install redis
```

## Redis Client

Use client mode when your app already owns the Redis lifecycle.

```ts
import { createClient } from "redis";
import { AgentCache } from "@deskcreate/agentcraft";

const client = createClient({ url: process.env.REDIS_URL });
await client.connect();

const cache = AgentCache.redis({
  client,
  namespace: "shared-runtime",
});
```

AgentCraft does not close user-supplied clients.

## Supabase Postgres URL

Supabase direct Postgres URLs work through the Postgres cache driver.

```ts
import { AgentCache } from "@deskcreate/agentcraft";

const cache = AgentCache.postgres({
  url: process.env.SUPABASE_DB_URL!,
  tableName: "agentcraft_cache",
  namespace: "content-system",
  version: "v2",
});
```

Install the optional peer dependency:

```bash
npm install pg
```

## Postgres Pool

Use pool mode when your application already manages database connections.

```ts
import { Pool } from "pg";
import { AgentCache } from "@deskcreate/agentcraft";

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

const cache = AgentCache.postgres({
  pool,
  tableName: "agentcraft_cache",
  namespace: "app-prod",
});
```

AgentCraft does not close user-supplied pools.

## SQLite

SQLite is useful for local development, desktop tools, and single-node server-side deployments.

```ts
import { AgentCache } from "@deskcreate/agentcraft";

const cache = AgentCache.sqlite({
  filePath: ".agentcraft/cache.sqlite",
  namespace: "local-dev",
  defaultTtlMs: 60 * 60 * 1000,
});
```

Install the optional peer dependency:

```bash
npm install better-sqlite3
```

SQLite locking is local to the SQLite database file. Use Redis or Postgres for multi-instance distributed coordination.

## From URL

`fromUrl()` is convenient when your runtime supplies one cache URL.

```ts
import { AgentCache } from "@deskcreate/agentcraft";

const cache = AgentCache.fromUrl(process.env.AGENTCRAFT_CACHE_URL!, {
  namespace: "tenant-a",
  tableName: "agentcraft_cache",
});
```

Supported schemes:

- `redis://`
- `rediss://`
- `postgres://`
- `postgresql://`
- `file:`

Connection URLs are redacted in cache config metadata, errors, and observability reports.

## Environment-Based Factory

Use this when deployment environments vary between Redis, Postgres, and a zero-dependency local file cache.

```ts
import { AgentCache } from "@deskcreate/agentcraft";

const cache = process.env.AGENTCRAFT_CACHE_URL
  ? AgentCache.fromUrl(process.env.AGENTCRAFT_CACHE_URL, {
      namespace: process.env.AGENTCRAFT_CACHE_NAMESPACE ?? "prod",
      tableName: "agentcraft_cache",
      locking: { enabled: true, ttlMs: 30_000 },
    })
  : AgentCache.file(".agentcraft/cache", { namespace: "local-dev" });
```

## Custom Controller

```ts
import { AgentCache } from "@deskcreate/agentcraft";

const myCache = {
  getEntry: async (key: string) => ({ status: "miss" as const }),
  set: async (key: string, value: unknown, options?: unknown) => {},
};

const cache = AgentCache.custom({
  config: {
    type: "custom",
    namespace: "tenant-a",
    version: "v1",
  },
  async getEntry(key) {
    return myCache.getEntry(key);
  },
  async set(key, value, options) {
    await myCache.set(key, value, options);
  },
});
```

## Cache Warming

Warm cache before a campaign, scheduled workflow, demo, or high-traffic window.

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache: AgentCache.memory({ namespace: "warming-demo" }),
});

const warm = await AgentCache.warm(
  agent,
  [
    "Research current pricing for our supported providers.",
    { prompt: "Prepare a short source-backed cache strategy brief." },
  ],
  {
    concurrency: 2,
    stopOnError: false,
  },
);

console.log(warm.succeeded);
console.log(warm.cache.hits);
console.log(warm.tokensUsed.total);
```

Dry-run mode estimates prompt token pressure without calling the provider:

```ts
const estimate = await AgentCache.warm(
  agent,
  ["Estimate a cache-warmed pricing research prompt."],
  { dryRun: true },
);
console.log(estimate.tokensUsed.prompt);
```

## Scheduled Cache Warming

Warm expensive research prompts before a campaign window, then require cached reads during the live run.

```ts
const warm = await AgentCache.warm(agent, [
  "Research source-backed AI cost-control examples.",
  "Prepare current provider pricing caveats.",
]);

if (warm.failed > 0) {
  throw new Error("Cache warming failed; do not start the campaign run.");
}

const response = await agent.run({
  prompt: "Write the campaign brief using warmed research.",
  budget: {
    mode: "prefer-cache",
    cachePolicy: { requireCachedFor: ["web_search"] },
  },
});

console.log(response.cache?.summary);
```

## Shared Workspace Cache

```ts
import { AgentCache, AgentWorkspace } from "@deskcreate/agentcraft";

const workspace = AgentWorkspace.create({
  cache: AgentCache.redis({
    url: process.env.REDIS_URL!,
    namespace: "team-cache",
    locking: { enabled: true },
  }),
});
```

Pass the workspace into `AgentTeam` or `AgentWorkflow` so every member shares the same cache boundary.

## Related Pages

- [AgentCache](./agent-cache.md)
- [Cache config](../configuration/cache-config.md)
- [Tool caching](../tools/tool-caching.md)
- [AgentEval](../production/agent-eval.md)
- [Observability Reports](../production/observability-reports.md)
