# MCP Overview

MCP connects AgentCraft to external tool servers. Use it when an ecosystem already has a useful server, when tool discovery matters, or when you want to connect internal tool infrastructure.

## Quick Start

```ts
import { Agent, Provider } from "agentcraft";
import { GitHubMCP } from "agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  GitHubMCP.connect({
    token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN!,
    allowedTools: ["list_issues", "get_file_contents"],
  }),
);

const response = await agent.run({ prompt: "List open issues in my repo." });
console.log(response.content);
```

## MCP Surfaces

| Surface              | Purpose                              | More                                   |
| -------------------- | ------------------------------------ | -------------------------------------- |
| Built-in wrappers    | Predefined MCP setup and metadata.   | [Built-In MCP Wrappers](./built-in.md) |
| `MCPAdapter.connect` | Custom stdio/HTTP/SSE server config. | [Custom MCP Servers](./custom.md)      |
| allowlists           | Restrict tools/resources/roots.      | [MCP Configs](./configs.md)            |
| security checklist   | Production review.                   | [MCP Security](./security.md)          |

## When To Use Native Adapter vs MCP

| Choose         | When                                                                     |
| -------------- | ------------------------------------------------------------------------ |
| Native adapter | You need typed config, stable tool names, and tight tests.               |
| MCP            | You need server breadth, dynamic discovery, or existing ecosystem tools. |

## Examples

- [MCP GitHub agent](../examples.md#mcp-github-agent)
- [Custom MCP connection](../examples.md#custom-mcp-connection)
