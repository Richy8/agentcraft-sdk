# API Stability

AgentCraft follows a tiered stability model. Public entry points (`@deskcreate/agentcraft` and subpaths) are Stable. Some newer adapters are Beta. Experimental features are preview-only with no backwards-compatibility guarantee.

## Entry Points

| Import path | Exports | Stability | Use for |
| --- | --- | --- | --- |
| `@deskcreate/agentcraft` | `Agent`, `AgentWorkflow`, `AgentPool`, `AgentWorkspace`, `AgentCache`, `AgentMemory`, all artifact stores, all error types | **Stable** | Core runtime, most applications |
| `@deskcreate/agentcraft/adapters` | `FetchAdapter`, `TavilySearchAdapter`, `DatabaseAdapter`, `ImageGenerationAdapter`, `createAdapter`, `defineAdapter`, `tool` | **Stable** | External system integration |
| `@deskcreate/agentcraft/mcp` | `GitHubMCP`, `SlackMCP`, `FilesystemMCP`, `PostgresMCP`, `SupabaseMCP`, `BraveSearchMCP`, `FirecrawlMCP`, `FetchMCP`, `MCP`, `MCPAdapter` | **Stable** | MCP server wrappers |
| `@deskcreate/agentcraft/team` | `AgentTeam` | **Stable** | Multi-agent coordination |

## Stability Tiers

| Tier | Guarantee | How to identify |
| --- | --- | --- |
| **Stable** | No breaking changes in minor releases. Deprecation before removal. | Default for all six entry points |
| **Beta** | API shape is solid but may have minor revisions. Breaking changes announced. | Some newer adapters |
| **Experimental** | No stability guarantee. Can change or be removed in any release. | Flagged in docs and source with `@experimental` |

## What "Stable" Means

A Stable API commits to:

- No parameter renames without a deprecation period
- No removal without a major version bump
- No behavioral changes that break the documented contract
- TypeScript types that remain assignable across minor releases

It does **not** commit to:

- Internal implementation details (private class internals, `src/` paths)
- Output formatting (whitespace, ordering of keys in JSON)
- Exact token counts or costs (model behavior varies)

## Importing Correctly

Always import from the public package paths, never from internal `src/` paths:

```ts
// ✓ Correct — stable public path
import { Agent, Provider } from "@deskcreate/agentcraft";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";
import { AgentTeam } from "@deskcreate/agentcraft/team";
import { GitHubMCP } from "@deskcreate/agentcraft/mcp";

// ✗ Incorrect — internal path, no stability guarantee
import { Agent } from "@deskcreate/agentcraft/src/agent/agent";
```

## Deprecation Policy

When an API is deprecated:

1. A deprecation notice appears in the changelog with the version it was deprecated in.
2. The API emits a `console.warn()` in development mode.
3. The API is removed no sooner than the next major version.
4. The replacement API is documented in the deprecation notice.

## Version History

| Version | Changes |
| --- | --- |
| 0.1.x | Initial release — all six entry points Stable |

Track changes in [CHANGELOG.md](https://github.com/deskcreate/agentcraft/blob/main/CHANGELOG.md).

## Checking Your Imports

Use the export smoke test to verify your code only imports from stable paths:

```sh
npm run exports:smoke
```

The type-check gate also validates that all public types remain assignable:

```sh
npm run typecheck
```

## Related

- [Architecture](../architecture.md) — internal module structure (not stable)
- [API Reference](../api/) — generated TypeDoc for all stable exports
- [Configuration Overview](../configuration/overview.md) — config option stability
