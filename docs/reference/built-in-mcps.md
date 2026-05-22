# Built-In MCP Wrappers Reference

Built-in MCP wrappers are convenience factories over `McpAdapter.connect(...)`. They provide pinned package metadata, default transport, required secret names, side-effect labels, and scopes. You still decide which tools and resources the agent can call via `allowedTools` and `allowedResources`.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { GitHubMcp } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  toolPolicy: { readOnly: true },
}).use(
  GitHubMcp.connect({
    token: process.env.GITHUB_TOKEN!,
    allowedTools: ["get_pull_request", "get_file_contents", "list_issues"],
  }),
);

const response = await agent.run({
  prompt: "Review PR #88 for type safety issues.",
});
console.log(response.content);
```

## Shared Config (All Wrappers)

| Option             | Required | Default              | Purpose                                                               |
| ------------------ | -------- | -------------------- | --------------------------------------------------------------------- |
| `allowedTools`     | No       | All server tools     | Array of tool names to expose. Strongly recommended in production.    |
| `allowedResources` | No       | All resources        | Array of resource URIs allowed for resource-capable servers.          |
| `roots`            | No       | Unrestricted         | Filesystem/workspace root paths for scoped servers.                   |
| `metadata`         | No       | Wrapper defaults     | Extra trust, package, and side-effect labels.                         |
| `onTrace`          | No       | No-op                | Callback receiving lifecycle trace events for observability.          |

## Wrapper Catalog

| Wrapper          | Transport | Required secrets                                | Side effects        | Scope              |
| ---------------- | --------- | ----------------------------------------------- | ------------------- | ------------------ |
| `GitHubMcp`      | stdio     | `GITHUB_TOKEN` or `GITHUB_PERSONAL_ACCESS_TOKEN`| read/write/external | repo               |
| `LinearMcp`      | stdio     | `LINEAR_API_KEY`                                | read/write/external | issues             |
| `JiraMcp`        | stdio     | `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_BASE_URL` | read/write/external | issues, projects   |
| `SentryMcp`      | dual      | `SENTRY_AUTH_TOKEN`                             | read/external       | events, projects   |
| `PlaywrightMcp`  | stdio     | None                                            | read/write/external | browser            |
| `BrowserbaseMcp` | stdio     | `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID` | read/write/external | browser            |
| `ApifyMcp`       | dual      | `APIFY_TOKEN`                                   | read/write/external | actors, datasets   |
| `FirecrawlMcp`   | stdio     | `FIRECRAWL_API_KEY`                             | read/external       | web                |
| `FetchMcp`       | stdio     | None                                            | read/external       | web                |
| `BraveSearchMcp` | stdio     | `BRAVE_API_KEY`                                 | read/external       | web_search         |
| `SupabaseMcp`    | stdio     | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` | read/write/external | database, storage  |
| `PostgresMcp`    | stdio     | `DATABASE_URL`                                  | read/write          | database           |
| `NeonMcp`        | http      | `Authorization`                                 | read/write/external | database, projects |
| `QdrantMcp`      | stdio     | `QDRANT_URL`, `QDRANT_API_KEY`                  | read/write/external | vectors            |
| `AirtableMcp`    | stdio     | `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`          | read/write/external | records            |
| `FilesystemMcp`  | stdio     | None                                            | read/write          | filesystem         |
| `MemoryMcp`      | stdio     | None                                            | read/write          | memory             |
| `SlackMcp`       | stdio     | `SLACK_BOT_TOKEN`, `SLACK_TEAM_ID`              | read/write/external | messages           |
| `GmailMcp`       | stdio     | `GMAIL_CREDENTIALS`                             | read/write/external | email              |
| `ResendMcp`      | dual      | `RESEND_API_KEY`                                | read/write/external | email              |
| `NotionMcp`      | stdio     | `NOTION_TOKEN`                                  | read/write/external | pages, databases   |
| `FigmaMcp`       | stdio     | `FIGMA_API_KEY`                                 | read/external       | design             |
| `CloudflareMcp`  | stdio     | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | read/write/external | cloud              |
| `RailwayMcp`     | stdio     | `RAILWAY_API_TOKEN`                             | read/write/external | deployments        |
| `RenderMcp`      | stdio     | `RENDER_API_KEY`                                | read/write/external | deployments        |
| `VercelMcp`      | http      | `Authorization`                                 | read/write/external | deployments        |
| `ElevenLabsMcp`  | stdio     | `ELEVENLABS_API_KEY`                            | read/write/external | audio              |
| `Context7Mcp`    | dual      | None                                            | read/external       | documentation      |
| `StripeMcp`      | dual      | `STRIPE_SECRET_KEY`                             | read/write/external | payments           |

## Per-Wrapper Examples

### GitHubMcp — Read-Only Code Review

```ts
import { GitHubMcp } from "@deskcreate/agentcraft/mcp";

agent.use(GitHubMcp.connect({
  token: process.env.GITHUB_TOKEN!,
  allowedTools: [
    "get_pull_request",
    "get_pull_request_diff",
    "list_pull_requests",
    "get_file_contents",
    "list_issues",
  ],
}));
```

Remove the `create_pr` and `create_issue` tools to keep the agent read-only.

### Context7Mcp — Live Library Docs

```ts
import { Context7Mcp } from "@deskcreate/agentcraft/mcp";

agent.use(Context7Mcp.connect({
  allowedTools: ["resolve-library-id", "get-library-docs"],
}));
```

No credentials needed. Useful for agents that need to look up API references at runtime.

### NotionMcp — Knowledge Base Search

```ts
import { NotionMcp } from "@deskcreate/agentcraft/mcp";

agent.use(NotionMcp.connect({
  token: process.env.NOTION_TOKEN!,
  allowedTools: ["search", "retrieve_page", "retrieve_block_children"],
}));
```

Write tools (`create_page`, `update_block`) are excluded — add them only if your agent needs to write back to Notion.

### SlackMcp — Channel Monitoring

```ts
import { SlackMcp } from "@deskcreate/agentcraft/mcp";

agent.use(SlackMcp.connect({
  token: process.env.SLACK_BOT_TOKEN!,
  allowedTools: ["get_channel_history", "list_channels"],
}));
```

### PostgresMcp — Read-Only SQL

```ts
import { PostgresMcp } from "@deskcreate/agentcraft/mcp";

agent.use(PostgresMcp.connect({
  // DATABASE_URL is read from environment by the server
  allowedTools: ["query"],   // exclude "execute" to prevent writes
}));
```

### FilesystemMcp — Directory-Scoped Access

```ts
import { FilesystemMcp } from "@deskcreate/agentcraft/mcp";

agent.use(FilesystemMcp.connect({
  roots: ["/home/user/projects/myapp/src"],   // scope to one directory
  allowedTools: ["read_file", "list_directory", "search_files"],
}));
```

### FirecrawlMcp — Web Research

```ts
import { FirecrawlMcp } from "@deskcreate/agentcraft/mcp";

agent.use(FirecrawlMcp.connect({
  token: process.env.FIRECRAWL_API_KEY!,
  allowedTools: ["scrape", "search"],
}));
```

### StripeMcp — Payment Read Access

```ts
import { StripeMcp } from "@deskcreate/agentcraft/mcp";

// Use a restricted API key with only read permissions
agent.use(StripeMcp.connect({
  apiKey: process.env.STRIPE_SECRET_KEY!,
  allowedTools: ["list_customers", "list_subscriptions", "retrieve_payment_intent"],
}));
```

## Generic Adapters (Non-Wrapper)

For any MCP server without a built-in wrapper, use `McpAdapter` directly:

```ts
import { McpAdapter } from "@deskcreate/agentcraft/mcp";

// Stdio (local package — always pin the version)
agent.use(McpAdapter.stdio({
  command: "npx",
  args: [
    "-y",
    "@modelcontextprotocol/server-filesystem@1.2.3",
    "/path/to/directory",
  ],
  allowedTools: ["read_file", "list_directory"],
}));

// HTTP (remote server)
agent.use(McpAdapter.http({
  url: "https://mcp.internal.company.com/mcp",
  headers: { Authorization: `Bearer ${process.env.MCP_TOKEN}` },
  allowedTools: ["search_docs", "get_runbook"],
  discoveryMode: "startup",
}));
```

## Production Guidance

- **Always use `allowedTools`** — never expose the full tool surface of a server you did not write.
- **Pin stdio package versions** — use `package@x.y.z`, not `package@latest`, to prevent silent tool-surface changes.
- **Treat MCP output as untrusted external data** — validate or redact before using in prompts or downstream systems.
- **Prefer native adapters** when you want typed config, fixed tool contracts, and a narrower blast radius.
- **Use `toolPolicy.readOnly: true`** or `requireConfirmation` around write-capable MCPs.
- **Set `roots`** for filesystem and resource servers to scope their access.
- **Rotate credentials** on the same schedule as other API keys.

More detail: [MCP Config](../configuration/mcp-config.md), [MCP Overview](../mcp/overview.md), [MCP Security](../production/security-model.md), [MCP cookbook](../examples-cookbook/mcp.md).
