# Adapters

Adapters are tool bundles — they package a set of related model-callable functions with lifecycle hooks, dependency declarations, and security metadata into a single `.use()` call. Where a standalone tool is a single function, an adapter is a coherent capability: a fetch adapter restricts URLs to an allowlist; a database adapter enforces read-only access; a search adapter returns structured results.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { FetchAdapter, TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  // Each .use() attaches an adapter — its tools become available to the model
  .use(
    FetchAdapter.connect({
      allowedDomains: ["api.github.com", "raw.githubusercontent.com"],
    }),
  )
  .use(
    TavilySearchAdapter.connect({
      apiKey: process.env.TAVILY_API_KEY!,
    }),
  );

const response = await agent.run({
  prompt: "Search for and fetch the TypeScript 5.5 release notes.",
});

console.log(response.content);
// Which tools were called?
console.log(response.toolCalls?.map((t) => t.name));
// → ["tavily_search", "fetch"]
```

## Adapter Anatomy

Every adapter is an object that implements `AgentAdapter`. Most adapters expose a static `connect()` factory method that configures and returns the adapter:

```ts
interface AgentAdapter {
  name: string;                   // unique adapter name
  requires: string[];             // model capabilities needed ("tools", "vision", etc.)
  declaredToolNames?: string[];   // tool names the adapter exposes (for conflict detection)
  dependsOn?: unknown[];          // other adapters this adapter requires
  metadata?: AdapterMetadata;     // auth, scopes, side effects, trust level

  init?(): Promise<void>;         // called once before the first run
  cleanup?(): Promise<void>;      // called when the agent or run scope ends
  getTools?(): ToolDefinition[] | Promise<ToolDefinition[]>; // dynamic tool list

  onBeforeRun?(params: AgentRunParams): AgentRunParams | Promise<AgentRunParams>;
  onAfterRun?(response: AgentResponse): AgentResponse | Promise<AgentResponse>;
  onAfterStream?(chunks: StreamChunk[], response: AgentResponse): AgentResponse | Promise<AgentResponse>;
}
```

### Adapter Metadata

The `metadata` field documents the adapter's security posture. It is used by the attachment manager for dependency validation and by the safety layer for trust decisions:

| Field | Type | Purpose |
| --- | --- | --- |
| `kind` | `"native-sdk" \| "mcp-backed" \| "custom" \| "placeholder"` | How the adapter is implemented |
| `auth` | `"none" \| "api-key" \| "oauth" \| "aws" \| "connection-string" \| "custom"` | Credential model |
| `trustLevel` | `"trusted" \| "review-required" \| "untrusted"` | Trust level for tool results |
| `sideEffects` | `Array<"none" \| "read" \| "write" \| "external">` | Side-effect levels the adapter may exhibit |
| `scopes` | `string[]` | Permission domains (e.g. `"repo"`, `"web"`, `"database"`) |
| `requiredSecrets` | `string[]` | Environment variable names the adapter requires |
| `readOnly` | `boolean` | Whether the adapter only performs reads |

## Attaching Adapters

### Agent-Level (Permanent)

Tools from agent-level adapters are available for every run on that agent:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { TavilySearchAdapter, DatabaseAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }))
  .use(DatabaseAdapter.connect({ connectionString: process.env.DATABASE_URL!, readOnly: true }));

// Search and database tools are available on every run
const response = await agent.run({ prompt: "Search for competitors and compare to our user count." });
```

### Per-Run (Scoped)

Attach an adapter for a single run only. It is initialized before the run and cleaned up after:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { DatabaseAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// Database adapter only active for this run
const response = await agent.run({
  prompt: "How many users signed up in the last 7 days?",
  use: [
    DatabaseAdapter.connect({
      connectionString: process.env.DATABASE_URL!,
      readOnly: true,
    }),
  ],
});
```

## Built-In Adapters

The following adapters ship with AgentCraft and are importable from `@deskcreate/agentcraft/adapters`:

| Adapter | Purpose |
| --- | --- |
| `FetchAdapter` | HTTP GET/POST with domain allowlisting and SSRF protection |
| `TavilySearchAdapter` | AI-optimized web search results |
| `DatabaseAdapter` | SQL query execution (PostgreSQL, MySQL, SQLite) |
| `ImageGenerationAdapter` | Generate images via DALL-E or compatible APIs |

For capabilities not covered by native adapters — GitHub, Slack, Filesystem, Supabase, Postgres, Brave Search, Firecrawl — use the [built-in MCP wrappers](../mcp/built-in.md) from `@deskcreate/agentcraft/mcp`. They attach to agents with the same `.use()` pattern.

For custom tools and adapters, see [Custom Adapters](./custom.md).

## Adapter Lifecycle

When an adapter is attached via `.use()`, it goes through this lifecycle:

```txt
Agent.use(adapter)
  ↓
1. Attachment validation
   - Declared tool names checked for conflicts with existing adapters
   - Dependency declarations validated

2. init() [once, on first run or on attach]
   - Opens connections, validates credentials

3. Per-run: onBeforeRun()
   - Can modify run params (e.g. inject context into the prompt)

4. Tool exposure
   - adapter.getTools() or adapter.tools are exposed to the model

5. Tool execution
   - Each tool call goes through policy → cache → execute()

6. Per-run: onAfterRun() / onAfterStream()
   - Can modify the response (e.g. append metadata)

7. cleanup() [on agent disposal or run-scoped adapter end]
   - Closes connections, flushes buffers
```

## Tool Conflict Detection

The attachment manager checks for tool name conflicts across all attached adapters before a run proceeds. If two adapters expose a tool with the same name, an `AdapterToolConflictError` is thrown:

```ts
import { AdapterToolConflictError } from "@deskcreate/agentcraft";

try {
  const agent = Agent.create({ model: Provider.openai["gpt-4o-mini"], apiKey: "..." })
    .use(AdapterA.connect({})) // exposes tool "search"
    .use(AdapterB.connect({})); // also exposes tool "search" → conflict
} catch (err) {
  if (err instanceof AdapterToolConflictError) {
    console.error("Adapter conflict:", err.message);
  }
}
```

## Checking Exposed Tools

After a run, inspect which tools were actually exposed to the model:

```ts
const response = await agent.run({ prompt: "Search for the latest AI research." });

console.log("Exposed tools:", response.selection?.exposedTools);
// → ["tavily_search"]

console.log("Tool calls made:", response.toolCalls?.length);
// → 1
```

## Related

- [Built-In Adapters](./built-in.md)
- [Custom Adapters](./custom.md)
- [Adapter Safety](./safety.md)
- [Tool Policy](../tools/tool-policy.md)
- [Adapter Config](../configuration/adapter-config.md)
- [MCP Overview](../mcp/overview.md)
- [Examples & Cookbook: Tools & Adapters](../examples-cookbook/tools-adapters.md)
