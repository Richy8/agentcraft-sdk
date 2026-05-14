# MCP Lifecycle Guide

MCP-backed adapters connect through:

- stdio child processes
- HTTP JSON-RPC endpoints
- HTTP/SSE transports

Lifecycle:

1. Validate server configuration, command allowlists, roots, and pinned package specs.
2. Start the transport lazily or eagerly.
3. Initialize the server.
4. Discover tools, resources, and prompts.
5. Convert MCP tool schemas into AgentCraft tools.
6. Execute tools through the live transport.
7. Emit MCP trace spans.
8. Clean up transports on adapter or agent disposal.

Security guidance:

- Prefer hosted or reviewed binaries for production MCP servers.
- Pin stdio package versions.
- Restrict commands, tools, resources, and roots.
- Treat all MCP outputs as untrusted.
- Use the [MCP Production Security Checklist](./mcp-security-checklist.md) before exposing MCP tools in production.

## MCP Config Fields

| Field              | Required | Values                          | Purpose                                                                         |
| ------------------ | -------- | ------------------------------- | ------------------------------------------------------------------------------- |
| `transport`        | Yes      | `'stdio'`, `'http'`, `'sse'`    | Selects the MCP connection type.                                                |
| `name`             | No       | String                          | Stable server name used in traces and adapter metadata.                         |
| `discovery`        | No       | `'eager'` or `'lazy'`           | `eager` discovers tools during init; `lazy` discovers when tools are requested. |
| `timeoutMs`        | No       | Milliseconds                    | Bounds MCP request latency.                                                     |
| `signal`           | No       | `AbortSignal`                   | Cancels in-flight MCP startup or requests.                                      |
| `allowedTools`     | No       | Tool names                      | Exposes only approved server tools. Strongly recommended.                       |
| `allowedResources` | No       | Resource URIs                   | Restricts resources exposed by the server.                                      |
| `roots`            | No       | Paths or URIs                   | Limits rooted servers to approved locations.                                    |
| `metadata`         | No       | Trust/package/security metadata | Records trust level, package pinning, secrets, side effects, and scopes.        |
| `onTrace`          | No       | Callback                        | Receives MCP lifecycle and request events.                                      |

Transport-specific options:

| Transport | Required  | Optional                                                                       | Production guidance                                                                                    |
| --------- | --------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| `stdio`   | `command` | `args`, `env`, `allowedCommands`, `rejectUnpinnedPackage`, `onSecurityWarning` | Allowlist commands and reject unpinned packages unless the binary is already reviewed and controlled.  |
| `http`    | `url`     | `headers`                                                                      | Use HTTPS outside local development. Put bearer tokens or API keys in `headers`, sourced from secrets. |
| `sse`     | `url`     | `headers`                                                                      | Use when the server exposes streaming MCP events. Apply the same auth and allowlist controls as HTTP.  |

## Metadata Fields

| Field             | Values                                          | Purpose                                                                               |
| ----------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------- |
| `trustLevel`      | `'trusted'`, `'review-required'`, `'untrusted'` | Communicates review expectations before production use.                               |
| `packageName`     | String                                          | Documents the stdio package or binary source. Include a pinned version when possible. |
| `packagePinned`   | Boolean                                         | Records whether the package source is version-pinned.                                 |
| `requiredSecrets` | String array                                    | Lists required secret names without exposing values.                                  |
| `sideEffects`     | `none`, `read`, `write`, `external` array       | Declares the highest-risk behavior the server exposes.                                |
| `scopes`          | String array                                    | Labels domains such as `repo`, `browser`, `database`, `email`, or `filesystem`.       |

Built-in MCP wrappers apply metadata from the server registry. Some servers such as GitHub, Fetch, and ElevenLabs remain marked as requiring user-provided packages until a stable hosted or official binary transport is available.

## Example Patterns

| Pattern                  | Example                                                               | When to use it                                                                 |
| ------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Built-in stdio wrapper   | [MCP GitHub Agent](../examples.md#mcp-github-agent)                   | Use a shipped wrapper while still setting tool allowlists and secret metadata. |
| Direct custom connection | [Custom MCP Connection](../examples.md#custom-mcp-connection)         | Connect an internal or third-party stdio, HTTP, or SSE MCP server directly.    |
| MCP plus skill memory    | [Built-In MCP Skill Memory](../examples.md#built-in-mcp-skill-memory) | Pair a built-in MCP wrapper with a stateful skill.                             |
| MCP plus native adapters | [Customer Ops Workflow](../examples.md#customer-ops-workflow)         | Combine MCP-hosted tools with native adapters during gradual migrations.       |
