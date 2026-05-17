# AgentCache

`AgentCache` reduces repeated token and tool spend by caching safe, reusable tool outputs. It only caches when the runtime can verify that replay is not a write, publish, send, delete, update, or schedule side effect.

## Quick Start

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";

const cache = AgentCache.file("./.agentcraft/cache", {
  strategy: "auto",
  namespace: "my-workspace",
  version: "v1",
  defaultTtlMs: 60 * 60 * 1000, // 1 hour
  maxEntryBytes: 250_000,
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache,
}).use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

const response = await agent.run({
  prompt: "Search for the latest TypeScript release notes.",
});

console.log(response.content);
console.log(`Cache hits: ${response.cache?.hits}`);
console.log(`Tool calls avoided: ${response.cache?.toolCallsAvoided}`);
```

## Cache Drivers

| Factory                          | Backend    | Best for                                         |
| -------------------------------- | ---------- | ------------------------------------------------ |
| `AgentCache.file(root, options)` | Filesystem | Local and single-process production deployments. |
| `AgentCache.memory(options)`     | In-process | Tests, demos, and ephemeral short-lived scripts. |
| `AgentCache.redis(options)`      | Redis      | Multi-instance production cache and locks.       |
| `AgentCache.postgres(options)`   | Postgres   | SQL-backed cache, including Supabase Postgres.   |
| `AgentCache.sqlite(options)`     | SQLite     | Local durable single-node cache.                 |
| `AgentCache.custom(controller)`  | Custom     | User-owned cache provider.                       |
| `AgentCache.disabled()`          | None       | Explicitly disabling cache while keeping config. |

For Redis, Postgres, and SQLite setup details, see [Distributed Cache](./distributed-cache.md). Optional infrastructure dependencies are lazy-loaded so local memory/file cache users do not pay for distributed drivers.

## Configuration

### `AgentCache.file(root, options)`

| Option          | Required | Default     | Purpose                                        |
| --------------- | -------- | ----------- | ---------------------------------------------- |
| `strategy`      | No       | `"auto"`    | `"conservative"`, `"auto"`, or `"aggressive"`. |
| `namespace`     | No       | `"default"` | Tenant or workspace partition.                 |
| `version`       | No       | `"v1"`      | Invalidation boundary for prompt/tool changes. |
| `defaultTtlMs`  | No       | None        | Default TTL for cache entries in milliseconds. |
| `maxEntryBytes` | No       | None        | Reject entries larger than this byte count.    |

Runtime cache keys intentionally include provider and model. This is conservative: it prevents one model/provider from replaying another model/provider's tool context when a tool result is not truly model-independent. If a deployment needs model-independent reuse, implement a custom `AgentCacheController` or normalize at the tool/adapter layer where the safety boundary is explicit.

In-flight deduplication is process-local. Repeated calls for the same safe tool key inside one Node process share the pending promise, but separate Node processes can still race unless your custom cache backend adds distributed locking.

### `AgentCache.memory(options)`

| Option          | Required | Default     | Purpose                                     |
| --------------- | -------- | ----------- | ------------------------------------------- |
| `namespace`     | No       | `"default"` | Partition key (used in cache config only).  |
| `defaultTtlMs`  | No       | None        | Default TTL for in-memory entries.          |
| `maxEntryBytes` | No       | None        | Reject entries larger than this byte count. |

### Cache Strategies

| Strategy         | What it caches                                                                |
| ---------------- | ----------------------------------------------------------------------------- |
| `"conservative"` | Only tools explicitly marked safe (e.g. `sideEffect: "read"` with no writes). |
| `"auto"`         | All safe read tools — the recommended default.                                |
| `"aggressive"`   | All tool outputs including external calls. Use with care.                     |

Runtime semantics:

- `conservative` caches `sideEffect: "none"` tools and read tools with explicit `security.cache.safe` or `security.cache.deterministic` metadata.
- `auto` caches safe `none` and `read` tools unless they are marked sensitive or require confirmation.
- `aggressive` may cache `external` tool results too, but still refuses writes, confirmation-gated tools, and sensitive results.

```ts
import { tool } from "@deskcreate/agentcraft/adapters";

const readDocs = tool({
  name: "read_docs_page",
  description: "Read a deterministic docs page.",
  security: {
    sideEffect: "read",
    cache: {
      safe: true,
      deterministic: true,
      ttlMs: 60 * 60 * 1000,
    },
  },
  params: {
    slug: { type: "string", description: "Docs page slug." },
  },
  run: async ({ slug }) => ({ slug, content: "..." }),
});
```

## `response.cache` Stats

After every `agent.run()`, `response.cache` reports what happened:

```ts
const response = await agent.run({ prompt: "Look up pricing for plan A." });

console.log(response.cache?.hits); // entries served from cache
console.log(response.cache?.misses); // cache misses (tools ran)
console.log(response.cache?.writes); // entries written to cache
console.log(response.cache?.bypassed); // true if cache was skipped globally
console.log(response.cache?.skippedUnsafe); // tools skipped due to unsafe side effects
console.log(response.cache?.stale); // expired entries that were bypassed
console.log(response.cache?.corrupt); // corrupt entries (could not be parsed)
console.log(response.cache?.oversized); // entries rejected for exceeding maxEntryBytes
console.log(response.cache?.toolCallsAvoided); // total tool calls saved by cache hits
console.log(response.cache?.estimatedSavedTokens); // estimated tokens saved
console.log(response.cache?.summary?.hitRate); // 0..1 cache hit rate
console.log(response.cache?.summary?.avoidedCallRate); // 0..1 avoided-call rate
console.log(response.cache?.summary?.estimatedCostSaved); // estimate when cost hints are supplied
```

`estimatedSavedTokens` is estimator-grade. The built-in cache estimates saved tool-result tokens from cached payload size, while live benchmark reports compare provider-reported prompt/completion tokens separately. Treat exact token-saving claims as benchmark-specific, not as a guarantee from the cache counter alone.

## `CachePolicy` (Per-Run)

Use `budget.cachePolicy` on `agent.run()` to require cache hits for specific tools — useful in replay or test scenarios where you want to guarantee no live calls are made.

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";

const cache = AgentCache.file("./.agentcraft/cache");

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache,
}).use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

// If web_search has no cached result, the run fails rather than making a live call
const response = await agent.run({
  prompt: "Search for TypeScript 5.5 release notes.",
  budget: {
    cachePolicy: {
      requireCachedFor: ["web_search"],
    },
  },
});

console.log(response.content);
```

## Cache Controller Interface

`AgentCacheController` is the interface implemented by all cache drivers. You can pass your own implementation for distributed backends.

| Method         | Signature                                 | Purpose                                        |
| -------------- | ----------------------------------------- | ---------------------------------------------- |
| `config`       | `AgentCacheConfig`                        | Read-only config describing the cache setup.   |
| `get`          | `(key) => Promise<unknown \| undefined>`  | Retrieve a cached value by key.                |
| `getEntry`     | `(key) => Promise<AgentCacheLookup>`      | Retrieve with full metadata (status, TTL).     |
| `set`          | `(key, value, options?) => Promise<void>` | Write a value with optional TTL override.      |
| `delete`       | `(key) => Promise<boolean>`               | Remove an entry. Returns true if removed.      |
| `clear`        | `() => Promise<void>`                     | Remove all entries in the current scope.       |
| `pruneExpired` | `() => Promise<number>`                   | Remove expired entries. Returns count pruned.  |
| `withLock`     | `(key, run) => Promise<T>`                | Optional distributed lock around cache misses. |

All methods except `config` are optional — implement only what your backend supports.

### `AgentCacheLookup` Status Values

| Status       | Meaning                                                |
| ------------ | ------------------------------------------------------ |
| `"hit"`      | Entry found and valid. `value` is populated.           |
| `"miss"`     | No entry for this key.                                 |
| `"stale"`    | Entry existed but expired. Tool will run and re-cache. |
| `"oversize"` | Entry exists but exceeds `maxEntryBytes`. Bypassed.    |
| `"corrupt"`  | Entry could not be parsed. Bypassed.                   |

## Patterns

### Memory Cache for Tests

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";

const cache = AgentCache.memory({
  defaultTtlMs: 60_000,
  namespace: "test-suite",
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache,
});

const response = await agent.run({ prompt: "Summarize this document." });
console.log(`Hits: ${response.cache?.hits}, Misses: ${response.cache?.misses}`);
```

### Shared Cache via Workspace

Attach the same cache to all agents in a team via `AgentWorkspace`:

```ts
import {
  Agent,
  AgentCache,
  AgentWorkspace,
  Provider,
} from "@deskcreate/agentcraft";
import { AgentTeam } from "@deskcreate/agentcraft/team";

const workspace = AgentWorkspace.create({
  cache: AgentCache.file(".agentcraft/cache", {
    strategy: "auto",
    namespace: "team-workspace",
    version: "v2",
  }),
});

const orchestrator = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const researcher = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  system: "Research and summarize.",
});

const team = AgentTeam.create({
  workspace, // cache shared across all team members
  orchestrator,
  members: [{ role: "researcher", agent: researcher }],
});

const result = await team.run({ prompt: "Research TypeScript decorators." });
console.log(result.content);
```

### Invalidation Helpers

```ts
import { AgentCache } from "@deskcreate/agentcraft";

const cache = AgentCache.file(".agentcraft/cache", {
  namespace: "my-workspace",
  version: "v1",
});

// Delete a specific entry by key
await cache.delete?.("some-cache-key");

// Remove all expired entries — returns count of pruned entries
const pruned = await cache.pruneExpired?.();
console.log(`Pruned ${pruned} expired entries`);

// Wipe the entire namespace/version scope
await cache.clear?.();
```

### Conservative Cache for Regulated Work

```ts
import { AgentCache } from "@deskcreate/agentcraft";

const cache = AgentCache.file(".agentcraft/cache", {
  strategy: "conservative", // only cache tools explicitly marked safe
  namespace: "regulated",
  version: "policy-2026-05",
  defaultTtlMs: 15 * 60 * 1000, // 15 minutes
  maxEntryBytes: 100_000,
});
```

### Disabled Cache (Explicit No-Op)

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";

// Pass disabled() to satisfy a config type that requires AgentCacheController
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache: AgentCache.disabled(), // cache config type is "disabled"
});
```

## Related

- [Tool Caching](../tools/tool-caching.md)
- [Agent Workspace](../orchestration/agent-workspace.md)
- [Observability & Replay](../core/observability-replay.md)
- [Budgets & Cost](../core/budgets-cost.md)
