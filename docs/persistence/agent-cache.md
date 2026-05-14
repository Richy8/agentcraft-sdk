# AgentCache

`AgentCache` reduces repeated token and tool spend by caching safe reusable tool outputs where the runtime can prove replay is not a write, publish, send, delete, update, or schedule side effect.

## Purpose

| Cache target  | Good for                                 | Avoid caching        | Related page                              |
| ------------- | ---------------------------------------- | -------------------- | ----------------------------------------- |
| Tool outputs  | SERP reads, source fetches, docs lookups | Volatile dashboards  | [Tool Caching](../tools/tool-caching.md)  |
| Test fixtures | Replay and regression stability          | Live write responses | [Replay](../core/observability-replay.md) |
| Creator reads | Stable source research and content notes | Private user secrets | [Creator Memory](../creator/memory.md)    |

## Usage

```ts
import { Agent, AgentCache, Provider } from "agentcraft";
import { CreatorPacks } from "agentcraft/packs";

const cache = AgentCache.file("./.agentcraft/cache", {
  strategy: "auto",
  namespace: "workspace-acme",
  version: "creator-v1",
  defaultTtlMs: 1000 * 60 * 60,
  maxEntryBytes: 250_000,
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache,
}).use(CreatorPacks.blog({ cache: "auto" }));
```

## Configuration

| Option          | Required       | Default         | Purpose                                        |
| --------------- | -------------- | --------------- | ---------------------------------------------- |
| `type`          | Yes            | None            | `file`, `memory`, or `disabled`.               |
| `root`          | For file cache | Undefined       | Cache directory.                               |
| `strategy`      | No             | `auto`          | `conservative`, `auto`, or `aggressive`.       |
| `namespace`     | No             | `default`       | Tenant/workspace partition.                    |
| `version`       | No             | `v1`            | Invalidation boundary for prompt/tool changes. |
| `defaultTtlMs`  | No             | Runtime default | Expiration for cache entries.                  |
| `maxEntryBytes` | No             | Unlimited       | Prevents oversized cache files.                |

## Cache Drivers

| Driver                  | Dependency | Best for                                         |
| ----------------------- | ---------- | ------------------------------------------------ |
| `AgentCache.file(root)` | None       | Local and single-process production deployments. |
| `AgentCache.memory()`   | None       | Tests, demos, and ephemeral short-lived scripts. |
| `AgentCache.disabled()` | None       | Explicitly disabling cache while keeping config. |

```ts
import { AgentCache } from "agentcraft";

const cache = AgentCache.memory({
  defaultTtlMs: 60_000,
  maxEntryBytes: 100_000,
});

console.log(cache.config.type);
```

## Production Controls

`AgentCache.file(...)` writes entries atomically, stores files under namespace/version scoped folders, sorts object keys in cache keys, and exposes invalidation helpers:

```ts
await cache.delete?.("known-key");
await cache.pruneExpired?.();
await cache.clear?.();
```

Use `namespace` for tenant, workspace, or environment isolation. Use `version` when skill prompts, tool semantics, policy, or data contracts change. Use `maxEntryBytes` to stop large tool outputs from becoming hidden storage or latency problems.

`AgentCache.file(...)` is designed for local and single-process production deployments. For horizontally scaled workers, use a unique `namespace` per worker/cache root or implement `AgentCacheController` with a distributed backend such as Redis, Postgres, S3-compatible object storage, or another atomic shared store.

Responses include cache observability:

```ts
const response = await agent.run({ prompt: "Reuse stable read tools." });

console.log(response.cache?.hits);
console.log(response.cache?.toolCallsAvoided);
console.log(response.cache?.stale);
```

## Local Examples

Use conservative cache for regulated work:

```ts
const cache = AgentCache.file("./.agentcraft/cache", {
  strategy: "conservative",
  namespace: "regulated-workspace",
  version: "policy-2026-05",
  defaultTtlMs: 15 * 60 * 1000,
  maxEntryBytes: 100_000,
});
```

More variants: [Tool Caching](../tools/tool-caching.md) and [production cookbook](../examples-cookbook/production.md).
