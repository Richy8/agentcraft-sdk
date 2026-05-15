# Built-In MCP Wrappers Reference

Built-in MCP wrappers are convenience factories over `MCPAdapter.connect(...)`. They provide package metadata, default transport choices, required secret names, scopes, and side-effect labels. You still decide which tools/resources are exposed.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { GitHubMCP } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  GitHubMCP.connect({
    token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN!,
    allowedTools: ["get_file_contents", "list_issues"],
  }),
);

const response = await agent.run({ prompt: "List open issues in my repo." });
console.log(response.content);
```

## Wrapper Catalog

| Wrapper          | Adapter name       | Transport | Required secrets                                | Side effects        | Scopes             |
| ---------------- | ------------------ | --------- | ----------------------------------------------- | ------------------- | ------------------ |
| `GitHubMCP`      | `github-mcp`       | stdio     | `GITHUB_PERSONAL_ACCESS_TOKEN`                  | read/write/external | repo               |
| `LinearMCP`      | `linear-mcp`       | stdio     | `LINEAR_API_KEY`                                | read/write/external | issues             |
| `JiraMCP`        | `jira-mcp`         | stdio     | `JIRA_EMAIL`, `JIRA_API_TOKEN`, `JIRA_BASE_URL` | read/write/external | issues, projects   |
| `SentryMCP`      | `sentry-mcp`       | dual      | `SENTRY_AUTH_TOKEN`                             | read/external       | events, projects   |
| `PlaywrightMCP`  | `playwright-mcp`   | stdio     | None                                            | read/write/external | browser            |
| `BrowserbaseMCP` | `browserbase-mcp`  | stdio     | `BROWSERBASE_API_KEY`, `BROWSERBASE_PROJECT_ID` | read/write/external | browser            |
| `ApifyMCP`       | `apify-mcp`        | dual      | `APIFY_TOKEN`                                   | read/write/external | actors, datasets   |
| `FirecrawlMCP`   | `firecrawl-mcp`    | stdio     | `FIRECRAWL_API_KEY`                             | read/external       | web                |
| `FetchMCP`       | `fetch-mcp`        | stdio     | None                                            | read/external       | web                |
| `BraveSearchMCP` | `brave-search-mcp` | stdio     | `BRAVE_API_KEY`                                 | read/external       | web_search         |
| `SupabaseMCP`    | `supabase-mcp`     | stdio     | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF` | read/write/external | database, storage  |
| `PostgresMCP`    | `postgres-mcp`     | stdio     | `DATABASE_URL`                                  | read/write          | database           |
| `NeonMCP`        | `neon-mcp`         | http      | `Authorization`                                 | read/write/external | database, projects |
| `QdrantMCP`      | `qdrant-mcp`       | stdio     | `QDRANT_URL`, `QDRANT_API_KEY`                  | read/write/external | vectors            |
| `AirtableMCP`    | `airtable-mcp`     | stdio     | `AIRTABLE_API_KEY`, `AIRTABLE_BASE_ID`          | read/write/external | records            |
| `FilesystemMCP`  | `filesystem-mcp`   | stdio     | None                                            | read/write          | filesystem         |
| `MemoryMCP`      | `memory-mcp`       | stdio     | None                                            | read/write          | memory             |
| `SlackMCP`       | `slack-mcp`        | stdio     | `SLACK_BOT_TOKEN`, `SLACK_TEAM_ID`              | read/write/external | messages           |
| `GmailMCP`       | `gmail-mcp`        | stdio     | `GMAIL_CREDENTIALS`                             | read/write/external | email              |
| `ResendMCP`      | `resend-mcp`       | dual      | `RESEND_API_KEY`                                | read/write/external | email              |
| `NotionMCP`      | `notion-mcp`       | stdio     | `NOTION_TOKEN`                                  | read/write/external | pages, databases   |
| `FigmaMCP`       | `figma-mcp`        | stdio     | `FIGMA_API_KEY`                                 | read/external       | design             |
| `CloudflareMCP`  | `cloudflare-mcp`   | stdio     | `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | read/write/external | cloud              |
| `RailwayMCP`     | `railway-mcp`      | stdio     | `RAILWAY_API_TOKEN`                             | read/write/external | deployments        |
| `RenderMCP`      | `render-mcp`       | stdio     | `RENDER_API_KEY`                                | read/write/external | deployments        |
| `VercelMCP`      | `vercel-mcp`       | http      | `Authorization`                                 | read/write/external | deployments        |
| `ElevenLabsMCP`  | `elevenlabs-mcp`   | stdio     | `ELEVENLABS_API_KEY`                            | read/write/external | audio              |
| `Context7MCP`    | `context7-mcp`     | dual      | None                                            | read/external       | documentation      |
| `StripeMCP`      | `stripe-mcp`       | dual      | `STRIPE_SECRET_KEY`                             | read/write/external | payments           |

## Required And Optional Config

| Config                  | Required                                              | Default                                         | Purpose                                                                            |
| ----------------------- | ----------------------------------------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------- |
| Credentials             | Required when listed above                            | None                                            | Usually passed as token/API key or read by wrapper from env, depending on wrapper. |
| `allowedTools`          | Optional, recommended                                 | Server tools are discoverable unless restricted | Exposes only approved MCP tools.                                                   |
| `allowedResources`      | Optional, recommended for resource servers            | Unrestricted by wrapper                         | Restricts MCP resources.                                                           |
| `roots`                 | Optional, recommended for filesystem/resource servers | Unrestricted by wrapper                         | Limits filesystem/resource scope.                                                  |
| `metadata`              | Optional                                              | Wrapper metadata                                | Adds trust, package, and security labels.                                          |
| `onTrace` / audit hooks | Optional                                              | No-op                                           | Sends lifecycle events to app telemetry.                                           |

## Production Guidance

- Prefer native adapters when you want typed config, fixed tool contracts, and narrower blast radius.
- Prefer MCP when the ecosystem server already exists or tool discovery matters.
- Pin stdio package versions.
- Use `allowedTools`, `allowedResources`, and `roots` before production.
- Treat MCP output as untrusted external data.
- Use `toolPolicy.readOnly` or approval callbacks around write-capable MCPs.
