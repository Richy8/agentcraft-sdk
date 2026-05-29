# Built-In MCP Wrappers

Built-in MCP wrappers are imported from `agentcraft/mcp`. They are convenience factories over `MCPAdapter.connect(...)` with transport, package, secret, scope, and side-effect metadata already attached.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { GitHubMCP } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  GitHubMCP.connect({
    token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN!,
    allowedTools: ["get_pull_request", "get_file_contents", "list_issues"],
  }),
);

const response = await agent.run({
  prompt: "Review PR #42 for type safety issues.",
});
console.log(response.content);
```

## Search And Web

### FetchMCP

Use `FetchMCP` for MCP-backed web fetch when you prefer a server implementation over the native [`FetchAdapter`](../adapters/built-in.md#fetchadapter).

Adapter name: `fetch-mcp`.

Transport: `stdio`.

Secrets: none.

Side effects: read/external.

```ts
agent.use(FetchMCP.connect());
```

### FirecrawlMCP

Use `FirecrawlMCP` for MCP-backed scrape, crawl, and extraction.

Adapter name: `firecrawl-mcp`.

Transport: `stdio`.

Secrets: `FIRECRAWL_API_KEY`.

Side effects: read/external.

```ts
agent.use(FirecrawlMCP.connect({ apiKey: process.env.FIRECRAWL_API_KEY! }));
```

### BraveSearchMCP

Use `BraveSearchMCP` for Brave-backed web search.

Adapter name: `brave-search-mcp`.

Transport: `stdio`.

Secrets: `BRAVE_API_KEY`.

Side effects: read/external.

```ts
agent.use(BraveSearchMCP.connect({ apiKey: process.env.BRAVE_API_KEY! }));
```

## Code And Projects

### GitHubMCP

Use `GitHubMCP` for repository context and GitHub workflows.

Adapter name: `github-mcp`.

Transport: `stdio`.

Secrets: `GITHUB_PERSONAL_ACCESS_TOKEN`.

Side effects: read/write/external.

```ts
agent.use(
  GitHubMCP.connect({
    token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN!,
  }),
);
```

## Data And Storage

### SupabaseMCP

Use `SupabaseMCP` for Supabase database and project workflows.

Adapter name: `supabase-mcp`.

Transport: `stdio`.

Secrets: `SUPABASE_URL`, `SUPABASE_API_KEY`.

Side effects: read/write/external.

```ts
agent.use(
  SupabaseMCP.connect({
    url: process.env.SUPABASE_URL!,
    apiKey: process.env.SUPABASE_API_KEY!,
  }),
);
```

### PostgresMCP

Use `PostgresMCP` for direct PostgreSQL access.

Adapter name: `postgres-mcp`.

Transport: `stdio`.

Secrets: `DATABASE_URL`.

Side effects: read/write.

```ts
agent.use(PostgresMCP.connect());
// DATABASE_URL is read from the environment by the server
```

### FilesystemMCP

Use `FilesystemMCP` for MCP-backed file access scoped to allowed paths.

Adapter name: `filesystem-mcp`.

Transport: `stdio`.

Secrets: none.

Side effects: read/write.

```ts
agent.use(
  FilesystemMCP.connect({
    roots: ["./content"],
    allowedTools: ["read_file", "list_directory"],
  }),
);
```

## Communication

### SlackMCP

Use `SlackMCP` for Slack messages and channel history via MCP.

Adapter name: `slack-mcp`.

Transport: `stdio`.

Secrets: `SLACK_BOT_TOKEN`, `SLACK_TEAM_ID`.

Side effects: read/write/external.

```ts
agent.use(
  SlackMCP.connect({
    token: process.env.SLACK_BOT_TOKEN!,
    allowedTools: ["get_channel_history", "list_channels"],
  }),
);
```

## Generic MCP Connection

For any MCP server without a built-in wrapper, use the `MCP.connect()` factory or `MCPAdapter` directly. See [MCP Custom](./custom.md) for the full API.

```ts
import { MCP } from "@deskcreate/agentcraft/mcp";

// stdio — any local MCP package
agent.use(
  MCP.connect({
    command: "npx",
    args: ["-y", "@modelcontextprotocol/server-filesystem@0.6.2", "./content"],
    allowedTools: ["read_file", "list_directory"],
  }),
);

// HTTP with bearer auth
agent.use(
  MCP.connect({
    url: "https://mcp.internal.company.com/mcp",
    auth: { type: "bearer", token: process.env.MCP_TOKEN! },
    allowedTools: ["search_docs"],
  }),
);
```

## Production Pattern

Always narrow MCP capability before production. Use `allowedTools` to limit the tool surface exposed to the model.

```ts
agent.use(
  GitHubMCP.connect({
    token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN!,
    allowedTools: ["get_pull_request", "get_file_contents", "list_issues"],
  }),
);
```

More examples: [MCP Config](../configuration/mcp-config.md), [MCP Custom](./custom.md), [MCP Security](./security.md), [MCP Cookbook](../examples-cookbook/mcp.md).
