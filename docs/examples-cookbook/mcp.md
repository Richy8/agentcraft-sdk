# MCP Examples

MCP examples show when to use a wrapper, when to use the generic adapter, and how to keep server packages reviewable.

## Built-In Wrapper

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { Context7MCP } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(Context7MCP.connect());

const response = await agent.run({
  prompt:
    "Look up the latest docs for this library and explain the migration path.",
});
console.log(response.content);
```

## Wrapper Requiring A Reviewed Package

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { GitHubMCP } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  GitHubMCP.connect({
    token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN!,
    packageSpec: "@artificable/github-mcp-server@0.1.0",
  }),
);

const response = await agent.run({ prompt: "List open PRs in my repo." });
console.log(response.content);
```

## Generic MCP Adapter

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { MCPAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  MCPAdapter.connect({
    transport: "http",
    url: "https://mcp.example.internal/mcp",
    headers: { Authorization: `Bearer ${process.env.MCP_TOKEN}` },
  }),
);

const response = await agent.run({ prompt: "Search internal docs." });
console.log(response.content);
```

More detail: [MCP Overview](../mcp/overview.md), [MCP Config](../configuration/mcp-config.md), [MCP Security](../mcp/security.md).
