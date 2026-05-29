# Built-In Adapters

Built-in adapters are imported from `agentcraft/adapters`, connected with `.connect(...)`, and attached with `.use(...)`. They expose exact tool names to the model, and every tool still runs through [Tool Policy](../tools/tool-policy.md), [Guardrails](../tools/guardrails.md), and [Approvals](../tools/approvals.md).

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  FetchAdapter,
  TavilySearchAdapter,
} from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: { readOnly: true, maxResultBytes: 20_000 },
})
  .use(FetchAdapter.connect({ allowedDomains: ["developer.mozilla.org"] }))
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

const response = await agent.run({
  prompt: "Find the latest browser compatibility data for CSS grid.",
});
console.log(response.content);
```

## Web

### FetchAdapter

Use `FetchAdapter` for guarded URL reads. It is the simplest read-only web adapter.

Tools: `fetch_url`.

Required config: none.

Common optional config: `allowedProtocols`, `allowedDomains`, `allowedContentTypes`, `maxBytes`, `headers`, `timeoutMs`.

```ts
agent.use(
  FetchAdapter.connect({
    allowedDomains: ["docs.github.com", "developer.mozilla.org"],
  }),
);
```

### TavilySearchAdapter

Use `TavilySearchAdapter` for web search and page content extraction.

Tools: `web_search`, `get_page_content`.

Required config: `apiKey`.

Common optional config: `searchDepth`, `maxResults`, `apiBaseUrl`, `timeoutMs`.

```ts
agent.use(
  TavilySearchAdapter.connect({
    apiKey: process.env.TAVILY_API_KEY!,
    maxResults: 5,
  }),
);
```

## Data

### DatabaseAdapter

Use `DatabaseAdapter` when your app owns the database client and wants AgentCraft to call a controlled executor.

Tools: `execute_query`, `fetch_records`, `insert_record`, `update_record`, `delete_record`, `list_tables`.

Required config: `execute`.

Common optional config: `dialect`, `readOnly`, `rowLimit`.

```ts
agent.use(
  DatabaseAdapter.connect({
    readOnly: true,
    rowLimit: 50,
    execute: async (query) => db.query(query),
  }),
);
```

## Media

### ImageGenerationAdapter

Use `ImageGenerationAdapter` for image generation, edits, and variations.

Tools: `generate_image`, `edit_image`, `generate_variations`.

Required config: `apiKey`.

Common optional config: `provider`, `defaultModel`, `defaultSize`, `apiBaseUrl`, `timeoutMs`.

```ts
agent.use(
  ImageGenerationAdapter.connect({
    provider: "openai",
    apiKey: process.env.OPENAI_API_KEY!,
  }),
);
```

## Generic MCP Connection

### MCPAdapter

Use `MCPAdapter` when you want a direct stdio, HTTP, or SSE MCP connection to any server — including servers not covered by a [built-in MCP wrapper](../mcp/built-in.md).

Tools: discovered from the MCP server at startup, optionally narrowed with `allowedTools`.

Required config: transport-specific `command`/`args` or `url`.

Common optional config: `allowedTools`, `allowedResources`, `roots`, `metadata`, `onTrace`.

```ts
import { MCPAdapter } from "@deskcreate/agentcraft/mcp";

agent.use(
  MCPAdapter.connect({
    transport: "http",
    url: "https://mcp.example.internal/mcp",
    allowedTools: ["search_docs"],
  }),
);
```

For the higher-level `MCP.connect()` factory (with bearer auth, command/npx/url transports), see [MCP Custom](../mcp/custom.md).

More examples: [Adapter Config](../configuration/adapter-config.md), [Adapter Safety](./safety.md), [Tools And Adapters Cookbook](../examples-cookbook/tools-adapters.md).
