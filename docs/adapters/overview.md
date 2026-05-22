# Adapters

Adapters are tool bundles — they package a set of related model-callable functions with lifecycle hooks, dependency declarations, and security metadata into a single `.use()` call. Where a standalone tool is a single function, an adapter is a coherent capability: a GitHub adapter gives the model read and write access to repositories; a filesystem adapter scopes reads to a directory; a fetch adapter restricts URLs to an allowlist.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { FetchAdapter, FileSystemAdapter } from "@deskcreate/agentcraft/adapters";

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
    FileSystemAdapter.connect({
      rootPath: "./docs",
      readOnly: true,
      allowedExtensions: [".md"],
    }),
  );

const response = await agent.run({
  prompt: "Fetch the TypeScript 5.5 release notes from GitHub.",
});

console.log(response.content);
// Which tools were called?
console.log(response.toolCalls?.map((t) => t.name));
// → ["fetch"]
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
import { GitHubAdapter, SlackAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(GitHubAdapter.connect({ token: process.env.GITHUB_TOKEN! }))
  .use(SlackAdapter.connect({ token: process.env.SLACK_BOT_TOKEN! }));

// GitHub and Slack tools are available on every run
const response = await agent.run({ prompt: "Post a summary of open PRs to #engineering." });
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

## Adapter Categories

### Web and Fetch

| Adapter | Import | Purpose |
| --- | --- | --- |
| `FetchAdapter` | `@deskcreate/agentcraft/adapters` | HTTP GET/POST with domain allowlisting |
| `FirecrawlAdapter` | `@deskcreate/agentcraft/adapters` | Deep web crawling and content extraction |
| `TavilySearchAdapter` | `@deskcreate/agentcraft/adapters` | AI-optimized web search results |
| `PlaywrightAdapter` | `@deskcreate/agentcraft/adapters` | Browser automation and screenshot capture |
| `LinkCheckerAdapter` | `@deskcreate/agentcraft/adapters` | URL validity and redirect checking |

### Local and Data

| Adapter | Import | Purpose |
| --- | --- | --- |
| `FileSystemAdapter` | `@deskcreate/agentcraft/adapters` | Scoped file read/write with extension filtering |
| `DatabaseAdapter` | `@deskcreate/agentcraft/adapters` | SQL query execution (PostgreSQL, SQLite) |
| `GoogleSheetsAdapter` | `@deskcreate/agentcraft/adapters` | Spreadsheet read/write |
| `SupabaseAdapter` | `@deskcreate/agentcraft/adapters` | Supabase database and storage operations |
| `RedisAdapter` | `@deskcreate/agentcraft/adapters` | Redis key-value get/set |
| `PineconeAdapter` | `@deskcreate/agentcraft/adapters` | Pinecone vector search |
| `StorageAdapter` | `@deskcreate/agentcraft/adapters` | Cloud storage (S3-compatible) get/put |

### Productivity and Collaboration

| Adapter | Import | Purpose |
| --- | --- | --- |
| `GitHubAdapter` | `@deskcreate/agentcraft/adapters` | PR, issue, repo, and file operations |
| `NotionAdapter` | `@deskcreate/agentcraft/adapters` | Page and database read/write |
| `SlackAdapter` | `@deskcreate/agentcraft/adapters` | Post messages and read channels |
| `EmailAdapter` | `@deskcreate/agentcraft/adapters` | Send and read emails |
| `GoogleCalendarAdapter` | `@deskcreate/agentcraft/adapters` | Calendar event read/write |

### Content and Publishing

| Adapter | Import | Purpose |
| --- | --- | --- |
| `ImageGenerationAdapter` | `@deskcreate/agentcraft/adapters` | Generate images via DALL-E or similar |
| `ElevenLabsAdapter` | `@deskcreate/agentcraft/adapters` | Text-to-speech audio generation |
| `PublishingAdapter` | `@deskcreate/agentcraft/adapters` | Publish content to CMS platforms |
| `SeoAdapter` | `@deskcreate/agentcraft/adapters` | SEO analysis and keyword research |
| `AnalyticsAdapter` | `@deskcreate/agentcraft/adapters` | Content analytics and performance data |
| `CitationManagerAdapter` | `@deskcreate/agentcraft/adapters` | Source tracking and citation management |

### Automation

| Adapter | Import | Purpose |
| --- | --- | --- |
| `ApifyAdapter` | `@deskcreate/agentcraft/adapters` | Run Apify web scraping actors |
| `MCPAdapter` | `@deskcreate/agentcraft/mcp` | Attach any MCP server as an adapter |

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
const response = await agent.run({ prompt: "Summarize the top GitHub issues." });

console.log("Exposed tools:", response.selection?.exposedTools);
// → ["github_list_issues", "github_get_issue"]

console.log("Tool calls made:", response.toolCalls?.length);
// → 1
```

## Related

- [Built-In Adapters](./built-in.md)
- [Custom Adapters](./custom.md)
- [Adapter Safety](./safety.md)
- [Tool Policy](../tools/tool-policy.md)
- [Adapter Config](../configuration/adapter-config.md)
- [Examples & Cookbook: Tools & Adapters](../examples-cookbook/tools-adapters.md)
