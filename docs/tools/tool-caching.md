# Tool Caching

Tool caching stores the result of a tool call and returns it on subsequent identical calls, bypassing execution entirely. It eliminates redundant API calls, web fetches, and corpus reads — reducing both latency and cost for any run that repeats the same tool inputs.

## Quick Start

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";
import { FetchAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  // File-backed cache persists across process restarts
  cache: AgentCache.file(".agentcraft/cache", {
    strategy: "auto",
    defaultTtlMs: 5 * 60_000, // 5-minute TTL
  }),
}).use(FetchAdapter.connect({ allowedDomains: ["api.github.com"] }));

// First run — cache miss, tool executes
const first = await agent.run({
  prompt: "Fetch https://api.github.com/repos/microsoft/TypeScript and tell me the star count.",
});
console.log(`Cache hits: ${first.cache?.hits}`);           // → 0
console.log(`Cache writes: ${first.cache?.writes}`);       // → 1

// Second run — cache hit, tool skipped
const second = await agent.run({
  prompt: "Fetch https://api.github.com/repos/microsoft/TypeScript and tell me the star count.",
});
console.log(`Cache hits: ${second.cache?.hits}`);          // → 1
console.log(`Tool calls avoided: ${second.cache?.toolCallsAvoided}`); // → 1
console.log(`Tokens saved: ${second.cache?.estimatedSavedTokens}`);   // → ~150
```

## How Caching Works

The cache key is a hash of the tool name and its arguments. When the model calls a tool:

1. The tool's `security` metadata is checked for eligibility (see [Eligibility Rules](#eligibility-rules))
2. If eligible, the cache is queried with `hash(toolName + args)`
3. On a **hit**: the cached result is returned immediately — the tool's `execute()` never runs
4. On a **miss**: `execute()` runs and the result is written to cache (if eligible)

The model receives the result either way and never knows whether it came from cache or live execution.

## Eligibility Rules

Whether a tool result can be cached depends on the **cache strategy** and the tool's `security` metadata.

### By Side Effect Level

| Side effect | `conservative` | `auto` (default) | `aggressive` |
| --- | --- | --- | --- |
| `none` | Cached | Cached | Cached |
| `read` | Only if `safe: true` or `deterministic: true` | Cached | Cached |
| `external` | Not cached | Not cached | Cached |
| `write` | Never cached | Never cached | Never cached |

### Absolute Exclusions

These always prevent caching regardless of strategy:

- `security.cache.sensitive: true` — result contains PII or secrets that must never be stored
- `security.sideEffect: "write"` — results of write operations must never be replayed
- `security.requiresConfirmation: true` — approval-gated tools are never cached

## Tool `security.cache` Metadata

Control per-tool caching behavior through the `security.cache` field on your `ToolDefinition`:

```ts
import { tool } from "@deskcreate/agentcraft/adapters";

const readReferenceDoc = tool("read_reference", {
  description: "Read a stable reference document from the corpus.",
  sideEffect: "read",
  cache: {
    safe: true,          // explicitly mark as cache-safe
    deterministic: true, // same inputs always produce same output
    ttlMs: 10 * 60_000, // override TTL to 10 minutes for this tool
  },
  params: {
    docId: { type: "string", description: "Document identifier" },
  },
  run: async ({ docId }) => {
    const content = await corpus.read(docId);
    return { content };
  },
});
```

| `security.cache` Field | Type | Default | Purpose |
| --- | --- | --- | --- |
| `safe` | `boolean` | `false` | Explicitly mark result as safe to cache |
| `deterministic` | `boolean` | `false` | Same args always produce same result — enables caching in `conservative` strategy |
| `ttlMs` | `number` | `defaultTtlMs` | TTL override in milliseconds for this tool only |
| `sensitive` | `boolean` | `false` | Mark result as sensitive — prevents caching entirely |

## Cache Strategy

The strategy is set on the `AgentCache` constructor, not per-tool:

```ts
import { AgentCache } from "@deskcreate/agentcraft";

// conservative — only cache tools explicitly marked safe
const conservative = AgentCache.file(".agentcraft/cache", {
  strategy: "conservative",
});

// auto — cache all non-sensitive none/read tools (recommended)
const auto = AgentCache.file(".agentcraft/cache", {
  strategy: "auto",
});

// aggressive — also cache external tools (current data may be stale)
const aggressive = AgentCache.file(".agentcraft/cache", {
  strategy: "aggressive",
  defaultTtlMs: 60_000, // shorter TTL for external data
});
```

## Response Cache Fields

Every `AgentResponse` includes a `cache` summary:

```ts
const response = await agent.run({ prompt: "..." });

console.log(response.cache?.hits);                 // tool calls served from cache
console.log(response.cache?.misses);               // tool calls that missed cache
console.log(response.cache?.writes);               // results written to cache
console.log(response.cache?.bypassed);             // true if bypass: true was set
console.log(response.cache?.skippedUnsafe);        // results not cached due to policy
console.log(response.cache?.stale);                // results returned despite expired TTL
console.log(response.cache?.corrupt);              // entries that failed deserialization
console.log(response.cache?.oversized);            // results too large to cache
console.log(response.cache?.toolCallsAvoided);     // total tool executions skipped
console.log(response.cache?.estimatedSavedTokens); // estimated token savings
```

## Bypassing the Cache

Force a fresh execution for a single run without changing the agent's cache config:

```ts
const response = await agent.run({
  prompt: "Get the latest version of TypeScript from GitHub.",
  // Bypass cache entirely for this run
  cache: { bypass: true },
});

console.log(`Bypassed: ${response.cache?.bypassed}`); // → true
```

## Requiring Cache Hits

Use `requireCachedFor` to fail-closed when a specific tool has no cached result. This ensures expensive or rate-limited tools are only called once and subsequent runs use cache:

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache: AgentCache.sqlite(".agentcraft/cache.db"),
});

// First run — populate the cache
await agent.run({ prompt: "Fetch the TypeScript release notes." });

// Subsequent runs — fail if the tool hasn't been cached
const response = await agent.run({
  prompt: "Summarize the TypeScript release notes.",
  budget: {
    cachePolicy: {
      requireCachedFor: ["fetch"], // fail if "fetch" tool has no cached result
    },
  },
});
```

## Patterns

### Seeding the Cache Before Production Runs

Pre-populate the cache with expensive tool results before agent runs:

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";
import { FetchAdapter } from "@deskcreate/agentcraft/adapters";

const cache = AgentCache.file(".agentcraft/cache", {
  strategy: "auto",
  defaultTtlMs: 60 * 60_000, // 1-hour TTL
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache,
}).use(FetchAdapter.connect({ allowedDomains: ["api.github.com"] }));

// Seed: fetch docs and populate cache before serving user requests
await agent.run({
  prompt: "Fetch https://api.github.com/repos/microsoft/TypeScript",
});

// Now user requests hit cache instead of the GitHub API
const userResponse = await agent.run({
  prompt: "How many stars does the TypeScript repo have?",
});
console.log(`Served from cache: ${userResponse.cache?.hits === 1}`); // → true
```

### Per-Tool TTL Override

Give short-lived external data a shorter TTL while keeping stable corpus reads cached longer:

```ts
import { tool } from "@deskcreate/agentcraft/adapters";

// Market data — cache for 1 minute
const getStockPrice = tool("get_stock_price", {
  description: "Fetch current stock price.",
  sideEffect: "external",
  cache: {
    safe: true,
    ttlMs: 60_000, // 1 minute
  },
  params: {
    ticker: { type: "string", description: "Ticker symbol." },
  },
  run: async ({ ticker }) => {
    const price = await marketApi.getPrice(ticker);
    return { ticker, price };
  },
});

// Reference data — cache for 24 hours
const getCompanyProfile = tool("get_company_profile", {
  description: "Fetch a stable company profile.",
  sideEffect: "read",
  cache: {
    safe: true,
    deterministic: true,
    ttlMs: 24 * 60 * 60_000, // 24 hours
  },
  params: {
    ticker: { type: "string", description: "Ticker symbol." },
  },
  run: async ({ ticker }) => {
    return companyDb.getProfile(ticker);
  },
});
```

### Sensitive Results — Prevent Caching

Mark tool results as sensitive to prevent them from ever being written to cache:

```ts
import { tool } from "@deskcreate/agentcraft/adapters";

const getUserSecret = tool("get_user_secret", {
  description: "Retrieve a user's encrypted secret.",
  sideEffect: "read",
  cache: {
    sensitive: true, // never cache — contains PII or credentials
  },
  params: {
    userId: { type: "string", description: "User ID." },
  },
  run: async ({ userId }) => {
    return vault.getSecret(userId);
  },
});
```

### Listening to Cache Events

Monitor cache performance in real time using workspace events:

```ts
import { AgentWorkspace, Agent, AgentCache, Provider } from "@deskcreate/agentcraft";

const workspace = AgentWorkspace.create({
  cache: AgentCache.file(".agentcraft/cache", { strategy: "auto" }),
});

let totalSavedTokens = 0;

workspace.events.on("cache.hit", ({ toolName, estimatedSavedTokens }) => {
  totalSavedTokens += estimatedSavedTokens ?? 0;
  console.log(`Cache hit: ${toolName} — saved ~${estimatedSavedTokens ?? 0} tokens`);
});

workspace.events.on("cache.miss", ({ toolName }) => {
  console.log(`Cache miss: ${toolName}`);
});

workspace.events.on("cache.write", ({ toolName }) => {
  console.log(`Cached: ${toolName}`);
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  workspace,
});
```

## Related

- [AgentCache](../persistence/agent-cache.md) — full cache backend reference (memory, file, SQLite, Redis, Postgres)
- [Cache Warming](../persistence/cache-warming.md) — pre-populate cache at startup, hit-rate reporting
- [Tool Policy](./tool-policy.md) — approval gating and side-effect policies
- [Tools](./tools.md) — defining tools and their security metadata
- [Agent Events](../core/agent-events.md) — `cache.hit`, `cache.miss`, `cache.write` events
- [Cache Config](../configuration/cache-config.md) — full configuration reference
