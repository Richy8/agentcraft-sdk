# Adapter Config

Adapters expose typed tools to the agent. Attach them with `.use(AdapterName.connect(config))`. Tool execution flows through `ToolPolicy` regardless of adapter — so approval gates, read-only mode, and redaction apply automatically.

## Attach Pattern

1. **Import** the adapter from its entry point — see [Built-In Adapters](../reference/built-in-adapters.md).
2. **Connect** by calling `AdapterName.connect(config)` — see per-adapter config tables below.
3. **Attach** by passing the result to `agent.use(adapter)` — see [Agents](../core/agents.md).
4. **Govern** with `toolPolicy`, guardrails, and approval callbacks — see [Tool Policy Config](./tool-policy-config.md).

## FetchAdapter

Fetch URL content with allowlist enforcement.

| Option             | Required | Default           | Purpose                                                         |
| ------------------ | -------- | ----------------- | --------------------------------------------------------------- |
| `allowedDomains`   | No       | All HTTPS domains | Restricts fetch to these domains. Strongly recommended.         |
| `allowedProtocols` | No       | `['https:']`      | Only HTTPS by default. Do not add `http:` in production.        |
| `maxResponseBytes` | No       | `500_000`         | Max bytes returned per fetch. Prevents large payload injection. |
| `timeoutMs`        | No       | `15_000`          | Per-request timeout.                                            |
| `headers`          | No       | `{}`              | Static headers added to every request.                          |

```ts
import { FetchAdapter } from "@deskcreate/agentcraft/adapters";

agent.use(
  FetchAdapter.connect({
    allowedDomains: ["developer.mozilla.org", "tc39.es"],
    maxResponseBytes: 100_000,
  }),
);
```

**Tools:** `fetch_url`.

## TavilySearchAdapter

Web search and page content extraction via Tavily.

| Option        | Required | Default   | Purpose                                         |
| ------------- | -------- | --------- | ----------------------------------------------- |
| `apiKey`      | Yes      | None      | Tavily API key.                                 |
| `searchDepth` | No       | `'basic'` | `'basic'` or `'advanced'`. Advanced costs more. |
| `maxResults`  | No       | `5`       | Max search results per query.                   |
| `timeoutMs`   | No       | `15_000`  | Per-request timeout.                            |

```ts
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";

agent.use(
  TavilySearchAdapter.connect({
    apiKey: process.env.TAVILY_API_KEY!,
    searchDepth: "basic",
    maxResults: 5,
  }),
);
```

**Tools:** `web_search`, `get_page_content`.

## DatabaseAdapter

Run queries against a SQL database.

| Option             | Required | Default       | Purpose                                                         |
| ------------------ | -------- | ------------- | --------------------------------------------------------------- |
| `connectionString` | Yes      | None          | Database connection URL (Postgres, MySQL, SQLite).              |
| `dialect`          | No       | auto-detected | postgres, mysql, or sqlite. Adjusts SQL hints for each dialect. |
| `readOnly`         | No       | `true`        | When `true`, only read queries are exposed.                     |
| `rowLimit`         | No       | `1000`        | Max rows returned per query to prevent unbounded responses.     |
| `timeoutMs`        | No       | `30_000`      | Per-request timeout.                                            |

```ts
import { DatabaseAdapter } from "@deskcreate/agentcraft/adapters";

agent.use(
  DatabaseAdapter.connect({
    connectionString: process.env.DATABASE_URL!,
    dialect: "postgres",
    readOnly: true,
    rowLimit: 500,
  }),
);
```

**Tools:** `execute_query`, `fetch_records`, `insert_record`, `update_record`, `delete_record`, `list_tables`.

## ImageGenerationAdapter

Generate images using OpenAI DALL-E or a compatible API.

| Option         | Required | Default          | Purpose                                  |
| -------------- | -------- | ---------------- | ---------------------------------------- |
| `provider`     | Yes      | None             | `"openai"` or compatible.                |
| `apiKey`       | Yes      | None             | Provider API key.                        |
| `defaultModel` | No       | Provider default | Default model (e.g. `"dall-e-3"`).       |
| `defaultSize`  | No       | Provider default | Default image size (e.g. `"1024x1024"`). |
| `timeoutMs`    | No       | `30_000`         | Per-request timeout.                     |

```ts
import { ImageGenerationAdapter } from "@deskcreate/agentcraft/adapters";

agent.use(
  ImageGenerationAdapter.connect({
    provider: "openai",
    apiKey: process.env.OPENAI_API_KEY!,
    defaultSize: "1024x1024",
    defaultModel: "dall-e-3",
  }),
);
```

**Tools:** `generate_image`.

## MCP Adapters

For capabilities not covered by the four native adapters (filesystem access, GitHub, Slack, Supabase, Postgres, Brave Search, Firecrawl, web fetch), use the built-in MCP wrappers from `@deskcreate/agentcraft/mcp`. They attach to agents with the same `.use()` pattern:

```ts
import { GitHubMCP, SlackMCP, FilesystemMCP } from "@deskcreate/agentcraft/mcp";

agent
  .use(GitHubMCP.connect({ token: process.env.GITHUB_TOKEN! }))
  .use(
    SlackMCP.connect({
      botToken: process.env.SLACK_BOT_TOKEN!,
      teamId: process.env.SLACK_TEAM_ID!,
    }),
  )
  .use(FilesystemMCP.connect({ allowedPaths: ["./src"] }));
```

See [Built-In MCP Wrappers](../mcp/built-in.md) for the full list and config.

## Common Patterns

| Pattern                     | Config                                                             |
| --------------------------- | ------------------------------------------------------------------ |
| Domain-restricted web fetch | `FetchAdapter.connect({ allowedDomains: ["docs.example.com"] })`   |
| Rate-limited web search     | `budget: { maxToolCalls: 5 }` + `TavilySearchAdapter.connect(...)` |
| Read-only database access   | `DatabaseAdapter.connect({ connectionString, readOnly: true })`    |
| Approval-gated write tools  | `toolPolicy: { onApprovalRequired: async ({ tool }) => ... }`      |
| Scoped filesystem access    | `FilesystemMCP.connect({ allowedPaths: ["./content"] })`           |
| GitHub operations           | `GitHubMCP.connect({ token, allowedTools: [...] })`                |

## Attaching Multiple Adapters

Each `.use()` call is chained — attach as many adapters as needed:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  TavilySearchAdapter,
  DatabaseAdapter,
} from "@deskcreate/agentcraft/adapters";
import { FilesystemMCP } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  toolPolicy: {
    readOnly: false,
    onApprovalRequired: async ({ tool }) =>
      ["write_file", "insert_record"].includes(tool.name),
    maxResultBytes: 40_000,
  },
})
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }))
  .use(
    DatabaseAdapter.connect({
      connectionString: process.env.DATABASE_URL!,
      readOnly: true,
    }),
  )
  .use(FilesystemMCP.connect({ allowedPaths: ["./content"] }));
```

For the full adapter catalog, see [Built-In Adapters Reference](../reference/built-in-adapters.md).

More patterns: [tools and adapters cookbook](../examples-cookbook/tools-adapters.md).
