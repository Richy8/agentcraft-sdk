# Mental Model

AgentCraft is built from a small set of composable surfaces. Once these click, the rest of the package becomes predictable.

## The Core Loop

```txt
Agent.create(config)
  -> .use(adapter | mcpAdapter)
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
| ToolPolicy   | Approval, read-only, timeout, redaction, and guardrails.                 | [Tool Policy](../tools/tool-policy.md)      | [Production examples](../examples-cookbook/production.md) |
| Cache        | Reuses safe read results.                                                | [AgentCache](../persistence/agent-cache.md) | [Caching](../persistence/agent-cache.md)                  |

## How Features Work Together

```ts
const agent = Agent.create({
  model,
  toolPolicy,
  cache,
  systemMessage: "You are a precise technical analyst. Show your work.",
})
  .use(FetchAdapter.connect({ allowedDomains: ["docs.example.com"] }))
  .use(LinkCheckerAdapter.connect());
```

This setup means:

- `systemMessage` shapes how the model reasons and writes
- adapters expose concrete tools the model can call
- `ToolPolicy` decides whether tools can execute
- cache may reuse safe read results

## Drill-Down

- [Feature Map](./feature-map.md) lists every major package feature.
- [Configuration Reference](../configuration/overview.md) gives exhaustive config pages.
- [API Reference](/api/) is generated from TypeScript exports.
