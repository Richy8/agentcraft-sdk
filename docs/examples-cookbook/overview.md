# Examples Cookbook

The cookbook is the variant library. Feature chapters include short local examples; this section shows combinations across providers, tools, MCP, skills, packs, cache, and production safety.

## Paths

| Goal               | Start here                   | Then read                                 | Runnable example                     |
| ------------------ | ---------------------------- | ----------------------------------------- | ------------------------------------ |
| First agent        | [Beginner](./beginner.md)    | [Agents](../core/agents.md)               | `examples/basic-chat.ts`             |
| Provider routing   | [Provider](./provider.md)    | [Models](../core/models-and-providers.md) | `examples/provider-routing.ts`       |
| Tools and adapters | [Tools](./tools-adapters.md) | [Adapters](../adapters/overview.md)       | `examples/adapter-skill-workflow.ts` |
| Creator system     | [Creator](./creator.md)      | [Creator Packs](../creator/packs.md)      | `examples/creator-pack-workflow.ts`  |

## Run Examples

```bash
npm run examples:check
```

Examples use public package imports only: `agentcraft`, `agentcraft/adapters`, `agentcraft/skills`, `agentcraft/mcp`, `agentcraft/team`, and `agentcraft/packs`.
