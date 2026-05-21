# API Stability

AgentCraft exports stable entry points for common users and narrower subpaths for power users.

## Import Paths

| Path                              | Exports                          | Stability | Use for              |
| --------------------------------- | -------------------------------- | --------- | -------------------- |
| `@deskcreate/agentcraft`          | Agent, cache, core utilities     | Stable    | Most apps.           |
| `@deskcreate/agentcraft/adapters` | Native adapters and tool helpers | Stable    | External systems.    |
| `@deskcreate/agentcraft/skills`   | Skills and loaders               | Stable    | Prompt capabilities. |
| `@deskcreate/agentcraft/mcp`      | MCP wrappers                     | Stable    | MCP servers.         |

## Additional Paths

| Path                           | Exports                       | Stability | Use for                |
| ------------------------------ | ----------------------------- | --------- | ---------------------- |
| `@deskcreate/agentcraft/packs` | `CreatorPacks` and pack types | Stable    | Creator workflows.     |
| `@deskcreate/agentcraft/team`  | `AgentTeam`                   | Stable    | Multi-agent workflows. |
| `/api/`                        | Generated TypeDoc             | Generated | Exact signatures.      |
| Examples                       | Runnable snippets             | Checked   | Copyable patterns.     |

## Compatibility Notes

- Public examples should import from package paths, not internal `src/` files.
- New adapters export from `@deskcreate/agentcraft/adapters`.
- New skills and loaders export from `@deskcreate/agentcraft/skills`.
- New MCP wrappers export from `@deskcreate/agentcraft/mcp`.
- TypeDoc writes to `docs/public/api`, which VitePress serves at `/api/`. Do not commit a separate `docs/api` tree; `npm run docs:api:check` guards against stale duplicate API output.

More detail: [API reference](../api/) and [configuration overview](../configuration/overview.md).
