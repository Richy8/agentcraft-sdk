# Public API Stability

AgentCraft uses the following labels for public API review:

- `stable`: exported API expected to remain source-compatible within a major version.
- `experimental`: exported API may change before 1.0.
- `internal`: not exported from package entry points.

Current stable entry points:

- `agentcraft`
- `agentcraft/adapters`
- `agentcraft/skills`
- `agentcraft/mcp`
- `agentcraft/team`

Provider protocol internals are intentionally not a stability promise until the provider authoring surface is finalized.
