# MCP Examples

MCP examples show when to use a built-in wrapper, when to use the generic adapter, and how to keep server packages reviewable and secure.

## Built-In Context7 Wrapper

Fetch live library documentation for any npm package:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { Context7Mcp } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(Context7Mcp.connect());

const response = await agent.run({
  prompt: "Look up the latest AgentCraft docs and explain how to add a custom skill.",
});
console.log(response.content);
```

## GitHub MCP — Read-Only PR Review

Use `GitHubMcp` with an explicit allowlist to restrict to safe read operations:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { GitHubMcp } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
}).use(GitHubMcp.connect({
  token: process.env.GITHUB_TOKEN!,
  allowedTools: [
    "get_pull_request",
    "get_pull_request_diff",
    "list_pull_requests",
    "get_file_contents",
  ],
}));

const response = await agent.run({
  prompt: "Review PR #142 in my repo. Check for type safety issues and test coverage gaps.",
});
console.log(response.content);
```

## Notion MCP — Knowledge Base Search

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { NotionMcp } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(NotionMcp.connect({
  token: process.env.NOTION_TOKEN!,
  allowedTools: ["search", "retrieve_page", "retrieve_block_children"],
}));

const response = await agent.run({
  prompt: "Search our Notion workspace for the Q3 roadmap page and summarize the key initiatives.",
});
console.log(response.content);
```

## Generic Stdio MCP (Pinned Version)

Use the generic adapter for any MCP server. Always pin the version:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { McpAdapter } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(McpAdapter.stdio({
  command: "npx",
  args: [
    "-y",
    "@modelcontextprotocol/server-filesystem@1.2.3", // pinned version — never use latest
    "/path/to/allowed/directory",
  ],
  allowedTools: ["read_file", "list_directory", "search_files"],
}));

const response = await agent.run({
  prompt: "List the TypeScript source files in the src/ directory.",
});
console.log(response.content);
```

## Generic HTTP MCP

Connect to an internal MCP server over HTTP:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { McpAdapter } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
}).use(McpAdapter.http({
  url: "https://mcp.internal.company.com/mcp",
  headers: { Authorization: `Bearer ${process.env.INTERNAL_MCP_TOKEN}` },
  allowedTools: ["search_docs", "get_runbook", "list_services"],
  discoveryMode: "startup",
}));

const response = await agent.run({
  prompt: "Search our internal docs for the deployment runbook for the payments service.",
});
console.log(response.content);
```

## Combined MCP + Native Adapter

Use MCP for structured data and a native adapter for web search:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";
import { GitHubMcp } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
})
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }))
  .use(GitHubMcp.connect({
    token: process.env.GITHUB_TOKEN!,
    allowedTools: ["get_pull_request", "get_file_contents"],
  }));

const response = await agent.run({
  prompt: `Review PR #200 and cross-reference any external libraries it adds against recent security advisories.`,
  budget: { maxToolCalls: 8 },
});
console.log(response.content);
```

More detail: [MCP Overview](../mcp/overview.md), [MCP Security](../mcp/security.md), [Built-In MCP Wrappers](../reference/built-in-mcps.md).
