# Built-In Adapters Reference

Adapters expose typed tools to an agent. Attach them with `.use(AdapterName.connect(config))`. All tool execution flows through `ToolPolicy` regardless of adapter — approval gates, read-only mode, redaction, and budget enforcement apply automatically.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { TavilySearchAdapter, FetchAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  toolPolicy: { readOnly: true, maxResultBytes: 40_000 },
})
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }))
  .use(FetchAdapter.connect({ allowedDomains: ["docs.example.com"] }));

const response = await agent.run({ prompt: "Research and summarize agent caching strategies." });
console.log(response.content);
```

## Safety Defaults

| Behavior                | Default                                                                                     |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| Read tools              | Run when exposed to the model.                                                              |
| Write tools             | Marked `requiresConfirmation` — blocked unless policy or callback approves.                 |
| External tools          | Treated as untrusted input sources — redact secrets from results.                           |
| Domain/path scoped      | Reject values outside configured allowlists at the adapter layer.                           |
| Cache replay            | Safe read tools may be cached; writes are never replayed as successful side effects.        |

## Adapter Catalog

| Adapter                  | Purpose                                               | Required config    | Key optional config                               | Tools                                                          |
| ------------------------ | ----------------------------------------------------- | ------------------ | ------------------------------------------------- | -------------------------------------------------------------- |
| `FetchAdapter`           | Allowlist-guarded URL fetch.                          | None               | `allowedDomains`, `maxResponseBytes`, `timeoutMs` | `fetch_url`                                                    |
| `TavilySearchAdapter`    | Web search and page extraction.                       | `apiKey`           | `searchDepth`, `maxResults`, `timeoutMs`          | `web_search`, `get_page_content`                               |
| `DatabaseAdapter`        | Host-owned DB queries and mutations.                  | `execute` function | `dialect`, `readOnly`, `rowLimit`                 | `execute_query`, `fetch_records`, `insert_record`, `update_record`                  |
| `ImageGenerationAdapter` | Image generation and editing.                         | `apiKey`           | `provider`, `defaultModel`, `defaultSize`         | `generate_image`, `edit_image`, `generate_variations`          |
| `MCPAdapter`             | Generic stdio/HTTP MCP server connection.             | Transport-specific | `allowedTools`, `allowedResources`, `roots`       | Discovers tools from MCP server at startup                     |

## Common Usage Patterns

### Domain-Restricted Web Fetch

```ts
import { FetchAdapter } from "@deskcreate/agentcraft/adapters";

agent.use(FetchAdapter.connect({
  allowedDomains: ["developer.mozilla.org", "tc39.es", "docs.anthropic.com"],
  maxResponseBytes: 100_000,
}));
```

### Web Search

```ts
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";

agent.use(TavilySearchAdapter.connect({
  apiKey: process.env.TAVILY_API_KEY!,
  searchDepth: "advanced",
  maxResults: 8,
}));
```

### Database Read-Only

```ts
import { DatabaseAdapter } from "@deskcreate/agentcraft/adapters";
import { pool } from "./db";

agent.use(DatabaseAdapter.connect({
  execute: (sql, params) => pool.query(sql, params).then(r => r.rows),
  dialect: "postgres",
  readOnly: true,
  rowLimit: 500,
}));
```

### Image Generation

```ts
import { ImageGenerationAdapter } from "@deskcreate/agentcraft/adapters";

agent.use(ImageGenerationAdapter.connect({
  provider: "openai",
  apiKey: process.env.OPENAI_API_KEY!,
  defaultSize: "1024x1024",
}));
```

### Generic MCP Server

```ts
import { MCPAdapter } from "@deskcreate/agentcraft/mcp";

agent.use(MCPAdapter.connect({
  transport: "http",
  url: "https://mcp.example.internal/mcp",
  allowedTools: ["search_docs", "get_runbook"],
}));
```

For the higher-level `MCP.connect()` factory (bearer auth, command/npx/url transports), see [MCP Custom](../mcp/custom.md).

## Config Patterns Summary

| Pattern                 | Config                                                              |
| ----------------------- | ------------------------------------------------------------------- |
| Domain-scoped fetch     | `FetchAdapter.connect({ allowedDomains: [...] })`                   |
| Web search              | `TavilySearchAdapter.connect({ apiKey, maxResults })`               |
| Read-only database      | `DatabaseAdapter.connect({ execute, readOnly: true })`              |
| Image generation        | `ImageGenerationAdapter.connect({ provider, apiKey })`              |
| Any MCP server          | `MCPAdapter.connect({ transport, url })` or `MCP.connect({ ... })`  |

For custom adapter authoring, see [Adapter Authoring](../guides/adapter-authoring.md).

More patterns: [Adapter Config](../configuration/adapter-config.md), [tools and adapters cookbook](../examples-cookbook/tools-adapters.md).
