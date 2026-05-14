# Built-In MCP Wrappers

Built-in MCP wrappers are imported from `agentcraft/mcp`. They are convenience factories over `MCPAdapter.connect(...)` with transport, package, secret, scope, and side-effect metadata already attached.

```ts
import { Agent, Provider } from "agentcraft";
import { Context7MCP } from "agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(Context7MCP.connect());
```

## Search And Web MCPs

### FetchMCP

Use `FetchMCP` for MCP-backed web fetch when you prefer a server implementation over the native [`FetchAdapter`](../adapters/built-in.md#fetchadapter).

Adapter name: `fetch-mcp`.

Transport: `stdio`.

Secrets: none.

Side effects: read/external.

```ts
agent.use(FetchMCP.connect({ packageSpec: "@yawlabs/fetch-mcp@0.3.1" }));
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

### Context7MCP

Use `Context7MCP` for current library documentation and API examples.

Adapter name: `context7-mcp`.

Transport: dual.

Secrets: none.

Side effects: read/external.

```ts
agent.use(Context7MCP.connect());
```

## Code And Project MCPs

### GitHubMCP

Use `GitHubMCP` for repository context and GitHub workflows when you want an MCP server instead of [`GitHubAdapter`](../adapters/built-in.md#githubadapter).

Adapter name: `github-mcp`.

Transport: `stdio`.

Secrets: `GITHUB_PERSONAL_ACCESS_TOKEN`.

Side effects: read/write/external.

```ts
agent.use(
  GitHubMCP.connect({
    token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN!,
    packageSpec: "@artificable/github-mcp-server@0.1.0",
  }),
);
```

### LinearMCP And JiraMCP

Use `LinearMCP` or `JiraMCP` for issue and project workflows.

Adapter names: `linear-mcp`, `jira-mcp`.

Transports: `stdio`.

Secrets: `LINEAR_API_KEY`; or `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_BASE_URL`.

Side effects: read/write/external.

```ts
agent.use(LinearMCP.connect({ apiKey: process.env.LINEAR_API_KEY! }));
```

### SentryMCP

Use `SentryMCP` for event and project diagnostics.

Adapter name: `sentry-mcp`.

Transport: dual.

Secrets: `SENTRY_AUTH_TOKEN`.

Side effects: read/external.

```ts
agent.use(SentryMCP.connect({ authToken: process.env.SENTRY_AUTH_TOKEN! }));
```

## Browser And Automation MCPs

### PlaywrightMCP

Use `PlaywrightMCP` when you want browser automation through MCP.

Adapter name: `playwright-mcp`.

Transport: `stdio`.

Secrets: none.

Side effects: read/write/external.

```ts
agent.use(PlaywrightMCP.connect({ headless: true }));
```

### BrowserbaseMCP

Use `BrowserbaseMCP` for cloud browser sessions.

Adapter name: `browserbase-mcp`.

Transport: `stdio`.

Secrets: `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID`.

Side effects: read/write/external.

```ts
agent.use(
  BrowserbaseMCP.connect({
    apiKey: process.env.BROWSERBASE_API_KEY!,
    projectId: process.env.BROWSERBASE_PROJECT_ID!,
  }),
);
```

### ApifyMCP

Use `ApifyMCP` for Apify actor and dataset workflows.

Adapter name: `apify-mcp`.

Transport: dual.

Secrets: `APIFY_TOKEN`.

Side effects: read/write/external.

```ts
agent.use(ApifyMCP.connect({ token: process.env.APIFY_TOKEN! }));
```

## Data And Storage MCPs

### SupabaseMCP, PostgresMCP, NeonMCP

Use these for database and project workflows.

Adapter names: `supabase-mcp`, `postgres-mcp`, `neon-mcp`.

Transports: `stdio` for Supabase/Postgres, HTTP for Neon.

Secrets: `SUPABASE_URL`, `SUPABASE_API_KEY`, `DATABASE_URL`, or Neon API key.

Side effects: read/write/external.

```ts
agent.use(
  SupabaseMCP.connect({
    url: process.env.SUPABASE_URL!,
    apiKey: process.env.SUPABASE_API_KEY!,
  }),
);
```

### QdrantMCP

Use `QdrantMCP` for vector memory and retrieval.

Adapter name: `qdrant-mcp`.

Transport: `stdio`.

Secrets: `QDRANT_URL`, `QDRANT_API_KEY`.

Side effects: read/write/external.

```ts
agent.use(
  QdrantMCP.connect({
    url: process.env.QDRANT_URL!,
    apiKey: process.env.QDRANT_API_KEY!,
  }),
);
```

### AirtableMCP

Use `AirtableMCP` for records and lightweight workflow data.

Adapter name: `airtable-mcp`.

Transport: `stdio`.

Secrets: `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`.

Side effects: read/write/external.

```ts
agent.use(
  AirtableMCP.connect({
    apiKey: process.env.AIRTABLE_API_KEY!,
    baseId: process.env.AIRTABLE_BASE_ID!,
  }),
);
```

### Memory And Filesystem MCPs

Use `MemoryMCP` for graph-like memory and `FilesystemMCP` for MCP-backed file access.

Adapter names: `memory-mcp`, `filesystem-mcp`.

Transport: `stdio`.

Secrets: none.

Side effects: read/write.

```ts
agent
  .use(MemoryMCP.connect())
  .use(FilesystemMCP.connect({ allowedPaths: ["./content"] }));
```

## Communication MCPs

### SlackMCP, GmailMCP, ResendMCP

Use communication MCPs for messages and email workflows when MCP servers fit your environment better than native adapters.

Adapter names: `slack-mcp`, `gmail-mcp`, `resend-mcp`.

Secrets: `SLACK_BOT_TOKEN`, `SLACK_TEAM_ID`, `GMAIL_CREDENTIALS`, `RESEND_API_KEY`.

Side effects: read/write/external.

```ts
agent.use(ResendMCP.connect({ apiKey: process.env.RESEND_API_KEY! }));
```

## Knowledge, Design, Deployment, Media, And Payments

### NotionMCP And FigmaMCP

Use `NotionMCP` for pages/databases and `FigmaMCP` for design context.

Adapter names: `notion-mcp`, `figma-mcp`.

Secrets: `NOTION_TOKEN`, `FIGMA_API_KEY`.

Side effects: Notion read/write/external; Figma read/external.

```ts
agent.use(NotionMCP.connect({ token: process.env.NOTION_TOKEN! }));
```

### CloudflareMCP, RailwayMCP, RenderMCP, VercelMCP

Use deployment MCPs for cloud/project/deployment operations. Keep writes approval-gated.

Adapter names: `cloudflare-mcp`, `railway-mcp`, `render-mcp`, `vercel-mcp`.

Secrets: provider API tokens and account/project identifiers.

Side effects: read/write/external.

```ts
agent.use(VercelMCP.connect({ apiToken: process.env.VERCEL_API_TOKEN! }));
```

### ElevenLabsMCP

Use `ElevenLabsMCP` for audio generation workflows through MCP.

Adapter name: `elevenlabs-mcp`.

Transport: `stdio`.

Secrets: `ELEVENLABS_API_KEY`.

Side effects: read/write/external.

```ts
agent.use(
  ElevenLabsMCP.connect({
    apiKey: process.env.ELEVENLABS_API_KEY!,
    packageSpec: "@mindstone-engineering/mcp-server-elevenlabs@0.2.1",
  }),
);
```

### StripeMCP

Use `StripeMCP` for payment and customer operations. This is high-risk and should always have strict tool allowlists and approvals.

Adapter name: `stripe-mcp`.

Transport: dual.

Secrets: `STRIPE_SECRET_KEY`.

Side effects: read/write/external.

```ts
agent.use(
  StripeMCP.connect({
    secretKey: process.env.STRIPE_SECRET_KEY!,
    tools: ["customers.list", "products.list"],
  }),
);
```

## Production Pattern

Always narrow MCP capability before production. Wrapper helpers expose reviewed defaults; for strict `allowedTools`, `allowedResources`, and `roots`, use the generic [`MCPAdapter`](../adapters/built-in.md#mcpadapter).

```ts
agent.use(
  MCPAdapter.connect({
    transport: "http",
    url: "https://mcp.example.internal/mcp",
    allowedTools: ["search_docs"],
    allowedResources: [],
  }),
);
```

More examples: [MCP Config](../configuration/mcp-config.md), [MCP Security](./security.md), [MCP Cookbook](../examples-cookbook/mcp.md).
