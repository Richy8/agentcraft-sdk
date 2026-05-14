# MCP Tools

Use this path when you want an agent to call tools exposed by an MCP server.

## Start With

- Built-in wrapper example: [MCP GitHub Agent](../../examples.md#mcp-github-agent)
- Direct connection example: [Custom MCP Connection](../../examples.md#custom-mcp-connection)
- Config: [Adapters, MCP, And Skills](../config/adapters-mcp-skills.md)
- Security: [MCP Production Security Checklist](../mcp-security-checklist.md)
- API: [MCPAdapter](/api/classes/index.MCPAdapter.html)

## Required Choices

| Config                  | Required              | Purpose                                                                 |
| ----------------------- | --------------------- | ----------------------------------------------------------------------- |
| `transport`             | Yes                   | Chooses `stdio`, `http`, or `sse`.                                      |
| `allowedTools`          | Recommended           | Limits the server tools exposed to the model.                           |
| `allowedResources`      | Optional              | Restricts MCP resources when the server exposes resources.              |
| `roots`                 | Optional              | Bounds filesystem or URI roots for rooted servers.                      |
| `metadata`              | Recommended           | Records trust level, secrets, scopes, package status, and side effects. |
| `rejectUnpinnedPackage` | Recommended for stdio | Blocks unpinned package launches.                                       |

## Tradeoffs

Stdio is convenient for local tools but requires command and package review. HTTP and SSE are better for centralized production ownership, but need hosted server authentication and network controls.

## Next Steps

Use built-in wrappers when AgentCraft ships one for your server. Use direct `MCPAdapter.connect()` when your server is internal, hosted, or not yet wrapped.
