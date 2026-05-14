# MCP Configs

MCP config controls transport, discovery, trust, and exposed tools/resources.

## Common Config

| Field              | Required   | Default                  | Purpose                         |
| ------------------ | ---------- | ------------------------ | ------------------------------- |
| `transport`        | Custom MCP | None                     | `stdio`, `http`, or `sse`.      |
| `command` / `args` | stdio      | None                     | Starts a local MCP process.     |
| `url`              | HTTP/SSE   | None                     | Hosted MCP endpoint.            |
| `allowedTools`     | No         | Server tools             | Tool allowlist.                 |
| `allowedResources` | No         | Server resources         | Resource allowlist.             |
| `roots`            | No         | None                     | Filesystem/resource boundaries. |
| `metadata`         | No         | Wrapper/default metadata | Trust and package information.  |

## Safer Config

```ts
MCPAdapter.connect({
  transport: "stdio",
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-filesystem@2026.1.14", "./docs"],
  allowedCommands: ["npx"],
  rejectUnpinnedPackage: true,
  allowedTools: ["read_file", "list_directory"],
  roots: ["./docs"],
});
```

## Related

- [MCP Security](./security.md)
- [Custom MCP Servers](./custom.md)
