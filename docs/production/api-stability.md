# API Stability

AgentCraft exports stable entry points for common users and narrower subpaths for power users.

## Import Paths

| Path                  | Exports                          | Stability | Use for              |
| --------------------- | -------------------------------- | --------- | -------------------- |
| `agentcraft`          | Agent, cache, core utilities     | Stable    | Most apps.           |
| `agentcraft/adapters` | Native adapters and tool helpers | Stable    | External systems.    |
| `agentcraft/skills`   | Skills and loaders               | Stable    | Prompt capabilities. |
| `agentcraft/mcp`      | MCP wrappers                     | Stable    | MCP servers.         |

## Additional Paths

| Path               | Exports                       | Stability | Use for                |
| ------------------ | ----------------------------- | --------- | ---------------------- |
| `agentcraft/packs` | `CreatorPacks` and pack types | Stable    | Creator workflows.     |
| `agentcraft/team`  | `AgentTeam`                   | Stable    | Multi-agent workflows. |
| `docs/api/`        | Generated TypeDoc             | Generated | Exact signatures.      |
| Examples           | Runnable snippets             | Checked   | Copyable patterns.     |

## Compatibility Notes

- Public examples should import from package paths, not internal `src/` files.
- New adapters export from `agentcraft/adapters`.
- New skills and loaders export from `agentcraft/skills`.
- New MCP wrappers export from `agentcraft/mcp`.

More detail: [API reference](../api/) and [configuration overview](../configuration/overview.md).
