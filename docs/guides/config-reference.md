# Configuration Reference

AgentCraft configuration is split by where each option is plugged in. Start with the page for the surface you are wiring, then follow the example links for real usage patterns.

If you prefer to start by product goal instead of config surface, use [Choose Your Path](./choose-your-path.md).

| Config area                                              | Where it is used                                       | Best first example                                                     |
| -------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| [Agent Creation](./config/agent-creation.md)             | `Agent.create()`                                       | [basic-chat.ts](../examples.md#basic-chat)                             |
| [Run Parameters](./config/run-parameters.md)             | `agent.run()` and `agent.stream()`                     | [structured-output.ts](../examples.md#structured-output)               |
| [Prompt Assembly](./config/prompt-assembly.md)           | `prompt`, `promptFile`, `vars`, `assembly`             | [prompt-assembly.ts](../examples.md#prompt-assembly)                   |
| [Tools And Guardrails](./config/tools-and-guardrails.md) | `tools`, `ToolDefinition`, `toolPolicy`                | [guardrails-and-approvals.ts](../examples.md#guardrails-and-approvals) |
| [Structured Output](./config/structured-output.md)       | `responseSchema`, `responseFormat`, `structuredOutput` | [structured-output.ts](../examples.md#structured-output)               |
| [Budgets And Routing](./config/budgets-and-routing.md)   | `budget`, `AgentPool`, cost estimation                 | [cost-budgeting.ts](../examples.md#cost-budgeting)                     |
| [Adapters And MCP](./config/adapters-mcp-skills.md)      | `createAdapter()`, built-in adapters, MCP wrappers     | [custom-adapter.ts](../examples.md#custom-adapter)                     |
| [AgentTeam](./config/agentteam.md)                       | `AgentTeam.create()` and `AgentTeam.spawn()`           | [agent-team.ts](../examples.md#agent-team)                             |
| [Caching](../persistence/agent-cache.md)                 | `AgentCache`, `cache`, per-run cache bypass            | [cost-cache-compression.ts](../examples.md#cost-cache-compression)     |

## Built-In Surface References

| Reference                                              | What it lists                                                           |
| ------------------------------------------------------ | ----------------------------------------------------------------------- |
| [Built-In Adapters](../reference/built-in-adapters.md) | Native adapters, tools, required config, optional config, and defaults. |
| [Built-In MCP Wrappers](../reference/built-in-mcps.md) | MCP wrappers, transports, required secrets, side effects, and scopes.   |

## How To Read A Config Page

Each config page answers:

- where the config is plugged in
- the goal and purpose of the config
- how changing values changes the final result
- when to use or omit the config
- which example demonstrates the use case

For API shape details, use the generated [API Reference](/api/). For runnable patterns, use [Examples](../examples.md).
