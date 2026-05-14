# Custom MCP Servers

Use `MCPAdapter.connect(...)` when your company has an internal MCP server or AgentCraft does not ship a wrapper.

## Stdio Server

```ts
import { MCPAdapter } from "agentcraft/adapters";

const internalDocs = MCPAdapter.connect({
  transport: "stdio",
  command: "node",
  args: ["servers/internal-docs.mjs"],
  allowedCommands: ["node"],
  allowedTools: ["search_docs", "read_doc"],
  metadata: {
    trustLevel: "review-required",
    sideEffects: ["read"],
    scopes: ["docs"],
  },
});
```

## HTTP Server

```ts
const hosted = MCPAdapter.connect({
  transport: "http",
  url: "https://mcp.example.com/rpc",
  allowedTools: ["search"],
});
```

## More Examples

- [Custom MCP connection](../examples.md#custom-mcp-connection)
- [MCP lifecycle](../guides/mcp-lifecycle.md)
