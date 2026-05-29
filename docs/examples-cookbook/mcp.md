# MCP Examples

MCP examples show when to use a built-in wrapper, when to use the generic `MCP.connect()` factory, and how to keep server packages reviewable and secure.

## GitHub MCP — Read-Only PR Review

Use `GitHubMCP` with an explicit allowlist to restrict to safe read operations:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { GitHubMCP } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
}).use(GitHubMCP.connect({
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

## Filesystem MCP — Scoped File Access

Read source files from a bounded directory path:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { FilesystemMCP } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: { readOnly: true },
}).use(FilesystemMCP.connect({
  allowedPaths: ["./src", "./docs"],
}));

const response = await agent.run({
  prompt: "List the TypeScript source files in the src/ directory.",
});
console.log(response.content);
```

## Brave Search MCP

Search the web with Brave's privacy-first search engine:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { BraveSearchMCP } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
}).use(BraveSearchMCP.connect({ apiKey: process.env.BRAVE_API_KEY! }));

const response = await agent.run({
  prompt: "Search for the latest news on TypeScript 6.0 and summarize what's coming.",
});
console.log(response.content);
```

## Slack MCP — Post With Approval

Post messages to Slack, gated on human approval:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { SlackMCP } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  toolPolicy: {
    onApprovalRequired: async ({ tool }) => tool.name === "slack_post_message",
  },
}).use(SlackMCP.connect({
  botToken: process.env.SLACK_BOT_TOKEN!,
  teamId: process.env.SLACK_TEAM_ID!,
}));

const response = await agent.run({
  prompt: "Post a message to #engineering about the Q3 roadmap review meeting on Tuesday.",
});
console.log(response.content);
```

## Generic Stdio MCP (Pinned Version)

Use `MCP.connect()` for any MCP server. Always pin the npm package version:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { MCP } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(MCP.connect({
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

Connect to an internal MCP server over HTTP using bearer auth:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { MCP } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
}).use(MCP.connect({
  url: "https://mcp.internal.company.com/mcp",
  auth: { type: "bearer", token: process.env.INTERNAL_MCP_TOKEN! },
  allowedTools: ["search_docs", "get_runbook", "list_services"],
}));

const response = await agent.run({
  prompt: "Search our internal docs for the deployment runbook for the payments service.",
});
console.log(response.content);
```

## Combined MCP + Native Adapter

Use MCP for repository access and a native adapter for web search:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";
import { GitHubMCP } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
})
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }))
  .use(GitHubMCP.connect({
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
