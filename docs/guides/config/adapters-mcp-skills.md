# Adapters And MCP Config

Adapters expose tools. MCP connects external tool servers.

Use the full built-in references when you need complete catalog coverage:

- [Built-In Adapters](../../reference/built-in-adapters.md)
- [Built-In MCP Wrappers](../../reference/built-in-mcps.md)

## Adapter Metadata

| Field         | Values                                                           | Purpose                                         | Use case                                                           |
| ------------- | ---------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| `kind`        | `placeholder`, `mcp-backed`, `native-sdk`, `custom`              | Communicates implementation path and maturity.  | [Custom adapter](../../examples.md#custom-adapter)                 |
| `auth`        | `none`, `api-key`, `oauth`, `aws`, `connection-string`, `custom` | Documents credential handling.                  | [GitHub review agent](../../examples.md#github-review-agent)       |
| `trustLevel`  | `trusted`, `review-required`, `untrusted`                        | Sets review expectations before production use. | [Custom MCP connection](../../examples.md#custom-mcp-connection)   |
| `sideEffects` | `none`, `read`, `write`, `external`                              | Declares maximum adapter behavior.              | [Filesystem safe agent](../../examples.md#filesystem-safe-agent)   |
| `scopes`      | Strings                                                          | Labels permission domains.                      | [Custom adapter](../../examples.md#custom-adapter)                 |
| `readOnly`    | Boolean                                                          | Signals non-mutating adapters.                  | [Database readonly](../../examples.md#database-readonly)           |

## MCP Config

| Field                   | Values                          | How it changes behavior                                        |
| ----------------------- | ------------------------------- | -------------------------------------------------------------- |
| `transport`             | `stdio`, `http`, `sse`          | Chooses process, HTTP JSON-RPC, or streaming event connection. |
| `allowedTools`          | Tool names                      | Exposes only approved server tools.                            |
| `allowedResources`      | Resource URIs                   | Restricts resource access.                                     |
| `roots`                 | Paths/URIs                      | Limits server filesystem or resource boundaries.               |
| `metadata`              | Trust/package/security metadata | Makes MCP risk reviewable.                                     |
| `allowedCommands`       | Commands                        | Restricts stdio process execution.                             |
| `rejectUnpinnedPackage` | Boolean                         | Blocks unpinned stdio package specs.                           |

Use [MCP GitHub Agent](../../examples.md#mcp-github-agent) for a built-in wrapper pattern and [Custom MCP Connection](../../examples.md#custom-mcp-connection) for direct `MCPAdapter.connect()` with stdio, HTTP, or SSE.

Use adapters and MCP for capability. Keep product authorization above both.
