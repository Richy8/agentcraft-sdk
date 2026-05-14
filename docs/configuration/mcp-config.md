# MCP Config

MCP config connects external Model Context Protocol servers through wrapper helpers or the generic `MCPAdapter`.

## Pattern

| Step           | Action                                      | Required?               | Related page                           |
| -------------- | ------------------------------------------- | ----------------------- | -------------------------------------- |
| Choose wrapper | `GitHubMCP`, `FilesystemMCP`, `Context7MCP` | No                      | [Built-In MCP](../mcp/built-in.md)     |
| Pin package    | Use wrapper default or `packageSpec`        | For unverified wrappers | [MCP Security](../mcp/security.md)     |
| Attach         | `agent.use(wrapper.connect(config))`        | Yes                     | [MCP Overview](../mcp/overview.md)     |
| Govern         | Tool policy and approvals                   | Recommended             | [Tool Policy](./tool-policy-config.md) |

## Usage

```ts
import { Agent, Provider } from "agentcraft";
import { Context7MCP, GitHubMCP } from "agentcraft/mcp";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(Context7MCP.connect())
  .use(
    GitHubMCP.connect({
      token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN!,
      packageSpec: "@artificable/github-mcp-server@0.1.0",
    }),
  );

const response = await agent.run({
  prompt: "Look up the latest docs and open issues.",
});
console.log(response.content);
```

## Configuration

| Option        | Required         | Default                  | Purpose                     |
| ------------- | ---------------- | ------------------------ | --------------------------- |
| `transport`   | Wrapper-specific | Registry default         | `stdio`, `http`, or `dual`. |
| `packageSpec` | Sometimes        | Verified wrapper default | Version-pinned npm package. |
| Secrets       | Wrapper-specific | None                     | Server credentials.         |
| `url`         | HTTP wrappers    | Wrapper default          | Remote MCP endpoint.        |

More variants: [MCP cookbook](../examples-cookbook/mcp.md).
