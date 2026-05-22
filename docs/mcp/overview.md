# MCP

Model Context Protocol (MCP) is an open standard for connecting AI models to external tool servers. AgentCraft supports MCP as a first-class adapter — attach any MCP server to an agent with a single `.use()` call, and its tools become available to the model exactly like native tools.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { GitHubMcp } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  GitHubMcp.connect({
    token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN!,
    // Restrict to specific tools for safety
    allowedTools: ["list_issues", "get_file_contents", "list_pull_requests"],
  }),
);

const response = await agent.run({
  prompt: "List open pull requests in the microsoft/TypeScript repository.",
});
console.log(response.content);

// Which MCP tools were called?
console.log(response.toolCalls?.map((t) => t.name));
// → ["list_pull_requests"]
```

## How MCP Works

When you attach an MCP server:

1. AgentCraft connects to the server (via stdio, HTTP, or SSE)
2. It calls `tools/list` to discover available tools
3. Tool definitions are wrapped with AgentCraft's policy, caching, and guardrail layers
4. The model can call those tools exactly like native tools
5. After the run, the connection is cleaned up (for stdio servers)

The model never knows whether a tool comes from a native adapter or an MCP server.

## MCP vs Native Adapters

Both attach tool capabilities to an agent. The choice depends on your use case:

| Choose | When |
| --- | --- |
| **Native adapter** | You need typed config, stable tool names, predictable behavior, and tight test coverage |
| **MCP** | The ecosystem already has a server, you need dynamic tool discovery, or you want to reuse existing MCP infrastructure |

For most AgentCraft use cases, prefer a built-in MCP wrapper (which gives you typed config) over raw `MCPAdapter.connect()`.

## Built-In MCP Wrappers

AgentCraft ships 30+ pre-built wrappers that bundle server setup, typed configuration, and security defaults:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  GitHubMcp,
  SlackMcp,
  BraveSearchMcp,
  SupabaseMcp,
  NotionMcp,
  PlaywrightMcp,
  FirecrawlMcp,
  StripeMcp,
} from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(GitHubMcp.connect({ token: process.env.GITHUB_TOKEN! }))
  .use(BraveSearchMcp.connect({ apiKey: process.env.BRAVE_API_KEY! }))
  .use(SlackMcp.connect({ token: process.env.SLACK_BOT_TOKEN! }));
```

See [Built-In MCP Wrappers](./built-in.md) for the full list.

## Custom MCP Servers

Connect any MCP-compatible server using `MCPAdapter`:

### Stdio Transport

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { MCPAdapter } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  MCPAdapter.connect({
    transport: "stdio",
    // Use a pinned version to prevent surprise drift
    command: "npx",
    args: ["@modelcontextprotocol/server-filesystem@1.0.0", "/path/to/files"],
    env: { PATH: process.env.PATH! },
    // Only expose specific tools
    allowedTools: ["read_file", "list_directory"],
  }),
);
```

### HTTP Transport

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { MCPAdapter } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  MCPAdapter.connect({
    transport: "http",
    url: "https://your-mcp-server.example.com/mcp",
    headers: {
      Authorization: `Bearer ${process.env.MCP_SERVER_TOKEN}`,
    },
    // Restrict tools and resources
    allowedTools: ["search", "get_document"],
    allowedResources: ["docs://"],
  }),
);
```

### SSE Transport

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { MCPAdapter } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  MCPAdapter.connect({
    transport: "sse",
    url: "https://your-mcp-server.example.com/sse",
    headers: { Authorization: `Bearer ${process.env.MCP_SERVER_TOKEN}` },
  }),
);
```

## Tool Allowlisting

Always restrict exposed tools to the minimum required. Without allowlisting, every tool the server advertises is exposed:

```ts
import { GitHubMcp } from "@deskcreate/agentcraft/mcp";

// Without allowlisting — all GitHub tools exposed (~50+)
const broad = GitHubMcp.connect({ token: process.env.GITHUB_TOKEN! });

// With allowlisting — only 3 tools exposed
const narrow = GitHubMcp.connect({
  token: process.env.GITHUB_TOKEN!,
  allowedTools: ["list_issues", "get_issue", "get_file_contents"],
});
```

## Discovery Modes

Control how AgentCraft discovers tools from an MCP server:

```ts
import { MCPAdapter } from "@deskcreate/agentcraft/mcp";

// "startup" (default) — discover tools once when the adapter initializes
// Good for: stable servers where the tool list does not change
const startup = MCPAdapter.connect({
  transport: "stdio",
  command: "npx",
  args: ["my-mcp-server"],
  discovery: "startup",
});

// "per-run" — rediscover tools before each run
// Good for: servers with dynamic tool lists
const perRun = MCPAdapter.connect({
  transport: "http",
  url: "https://dynamic-mcp.example.com",
  discovery: "per-run",
});
```

## MCP and Tool Policy

MCP tools go through the same policy, guardrail, and cache layers as native tools. Apply tool policy at the agent level:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { NotionMcp } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    readOnly: true,               // block all write MCP tools
    maxResultBytes: 100_000,      // cap result size
    redactSecrets: true,          // strip secrets from MCP results
  },
}).use(
  NotionMcp.connect({ token: process.env.NOTION_TOKEN! }),
);
```

## Checking MCP Tool Calls

```ts
const response = await agent.run({ prompt: "List recent Notion pages." });

// All exposed tools (native + MCP)
console.log(response.selection?.exposedTools);
// → ["notion_list_pages", "notion_get_page", ...]

// Tools actually called
console.log(response.toolCalls?.map((t) => t.name));
// → ["notion_list_pages"]
```

## Related

- [Built-In MCP Wrappers](./built-in.md) — 30+ pre-built wrappers
- [Custom MCP Servers](./custom.md) — full transport reference
- [MCP Security](./security.md) — production safety checklist
- [MCP Config](../configuration/mcp-config.md)
- [Examples & Cookbook: MCP](../examples-cookbook/mcp.md)
