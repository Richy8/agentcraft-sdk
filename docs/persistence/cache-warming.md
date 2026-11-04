# Cache Warming

Pre-populate the cache before agent runs to guarantee zero cold-start misses.

## Overview

Cache warming lets you load known tool results into `AgentCache` before any agent runs. This is especially useful for batch jobs, scheduled tasks, or any scenario where you know the set of tool calls in advance.

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";

const cache = AgentCache.file(".agentcraft/cache");

// Warm the cache with known tool results
await cache.warm([
  {
    toolName: "web_search",
    args: { query: "latest TypeScript release" },
    result: { results: [{ title: "TypeScript 5.4", url: "..." }] },
    ttlMs: 3_600_000, // 1 hour
  },
  {
    toolName: "read_file",
    args: { path: "./config.json" },
    result: { content: '{ "version": "1.0.0" }' },
  },
]);

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache,
});
```

## `cache.warm(entries)`

Accepts an array of cache entries to pre-load. Each entry has:

| Field      | Type                      | Required | Description                                                      |
| ---------- | ------------------------- | -------- | ---------------------------------------------------------------- |
| `toolName` | `string`                  | Yes      | Name of the tool whose result is being cached.                   |
| `args`     | `Record<string, unknown>` | Yes      | The exact arguments the tool would receive.                      |
| `result`   | `unknown`                 | Yes      | The result to serve from cache on a hit.                         |
| `ttlMs`    | `number`                  | No       | How long the entry is valid. Defaults to the cache's global TTL. |

## `cache.hitRate()`

Read current hit rate statistics after warming:

```ts
const stats = await cache.hitRate();
console.log(`Hit rate: ${(stats.rate * 100).toFixed(1)}%`);
console.log(`Hits: ${stats.hits}, Misses: ${stats.misses}`);
```

## Warm-on-Deploy Pattern

Warm the cache as part of your startup sequence before accepting traffic:

```ts
async function startup() {
  const cache = AgentCache.file(".agentcraft/cache");

  await cache.warm(await loadKnownToolResults());

  const agent = Agent.create({
    model: Provider.anthropic["claude-sonnet-4-6"],
    apiKey: process.env.ANTHROPIC_API_KEY!,
    cache,
  });

  return agent;
}
```

## Distributed Locking

When multiple agent instances start simultaneously, only one warms the shared cache. The others wait:

```ts
const cache = AgentCache.redis(process.env.REDIS_URL!);
// Distributed lock prevents stampedes — only one instance runs warm()
await cache.warm(entries);
```

## Stale-While-Revalidate

Serve stale results while revalidating in the background:

```ts
const cache = AgentCache.file(".agentcraft/cache", {
  strategy: "stale-while-revalidate",
  ttlMs: 60_000, // serve results for 1 minute
  staleTtlMs: 300_000, // keep serving stale for up to 5 minutes while refreshing
});
```

## Monitoring Warm State

Confirm entries are present before starting runs:

```ts
const stats = await cache.hitRate();
if (stats.total === 0) {
  console.warn("Cache is empty — warming before first run");
  await cache.warm(entries);
}
```

## Related

- [AgentCache](./agent-cache.md) — cache backends and configuration
- [Distributed Cache](./distributed-cache.md) — Redis and Postgres backends
- [Tool Caching](../tools/tool-caching.md) — per-tool caching configuration
