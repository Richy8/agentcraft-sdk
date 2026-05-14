# Mental Model

AgentCraft is built from a small set of composable surfaces. Once these click, the rest of the package becomes predictable.

## The Core Loop

```txt
Agent.create(config)
  -> .use(skill | adapter | creatorPack | mcpAdapter)
  -> agent.run(params)
  -> model call + optional tools
  -> response + trace + cost + cache metadata
```

## Main Concepts

| Concept      | Purpose                                                                  | Config home                                 | Examples                                                  |
| ------------ | ------------------------------------------------------------------------ | ------------------------------------------- | --------------------------------------------------------- |
| Agent        | Owns model, provider, defaults, policy, cache, and attached capability.  | [Agents](../core/agents.md)                 | [Basic](../examples-cookbook/beginner.md)                 |
| Tool         | A callable function the model may use.                                   | [Tools](../tools/tools.md)                  | [Tool examples](../examples-cookbook/tools-adapters.md)   |
| Adapter      | A bundle of tools for a system such as GitHub, files, web, or analytics. | [Adapters](../adapters/overview.md)         | [Built-ins](../reference/built-in-adapters.md)            |
| MCP          | External tool server connection.                                         | [MCP](../mcp/overview.md)                   | [MCP examples](../examples-cookbook/mcp.md)               |
| Skill        | Reusable behavior and prompt structure.                                  | [Skills](../skills/overview.md)             | [Skill examples](../examples-cookbook/skills.md)          |
| Creator Pack | Curated group of creator skills.                                         | [Creator Packs](../creator/packs.md)        | [Creator examples](../examples-cookbook/creator.md)       |
| ToolPolicy   | Approval, read-only, timeout, redaction, and guardrails.                 | [Tool Policy](../tools/tool-policy.md)      | [Production examples](../examples-cookbook/production.md) |
| Cache        | Reuses safe read results.                                                | [AgentCache](../persistence/agent-cache.md) | [Caching](../persistence/agent-cache.md)                  |

## How Features Work Together

```ts
const agent = Agent.create({
  model,
  toolPolicy,
  cache,
  skillActivation: "auto",
  toolSelection: "auto",
})
  .use(CreatorPacks.blog())
  .use(FetchAdapter.connect({ allowedDomains: ["docs.example.com"] }))
  .use(LinkCheckerAdapter.connect());
```

This setup means:

- the pack contributes creator skills
- adapters expose concrete tools
- `ToolPolicy` decides whether tools can execute
- cache may reuse safe read results
- auto activation/tool selection narrows what is active for the prompt

## Drill-Down

- [Feature Map](./feature-map.md) lists every major package feature.
- [Configuration Reference](../configuration/overview.md) gives exhaustive config pages.
- [API Reference](/api/) is generated from TypeScript exports.
