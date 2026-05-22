# Examples Cookbook

The cookbook is the variant library. Each chapter focuses on a specific dimension — providers, tools, skills, MCP, creator workflows, orchestration, or production safety — and shows the combination patterns that don't fit neatly in reference pages.

## Choose Your Starting Point

| Goal | Start here | Then read | Runnable example |
| --- | --- | --- | --- |
| First working agent | [Beginner](./beginner.md) | [Agents](../core/agents.md) | `examples/basic-chat.ts` |
| Multiple providers and fallback | [Providers](./provider.md) | [Models and Providers](../core/models-and-providers.md) | `examples/provider-routing.ts` |
| Web fetch, file system, browser tools | [Tools and Adapters](./tools-adapters.md) | [Adapters Overview](../adapters/overview.md) | `examples/adapter-skill-workflow.ts` |
| MCP servers (GitHub, Notion, filesystem) | [MCP](./mcp.md) | [MCP Overview](../mcp/overview.md) | — |
| Skill packs, directives, domain skills | [Skills](./skills.md) | [Skill Activation](../skills/activation.md) | — |
| Blog, LinkedIn, YouTube, newsletter pipelines | [Creator](./creator.md) | [Creator Packs](../creator/packs.md) | `examples/creator-pack-workflow.ts` |
| Workflows, teams, pools | [Orchestration](./orchestration.md) | [AgentWorkflow](../orchestration/agent-workflow.md) | — |
| Budgets, cache, guardrails, evals | [Production](./production.md) | [Security Model](../production/security-model.md) | `examples/cost-cache-compression.ts` |

## How to Run Examples

All examples are runnable TypeScript files in the `examples/` directory. They import from public package paths only and include all necessary imports.

```sh
# Type-check all examples
npm run examples:typecheck

# Run smoke test assertions on all examples
npm run examples:check

# Run a single example (requires API keys)
npx tsx examples/basic-chat.ts
```

## Example File Index

See [Runnable Examples Index](../examples.md) for the complete list of annotated example files, what each demonstrates, and which environment variables are required.

## What the Cookbook Is Not

The cookbook shows working combinations. For full API documentation:

- Config tables → [Configuration Reference](../configuration/overview.md)
- Full method signatures → [API Reference](../api/)
- Architecture decisions → [Architecture](../architecture.md)
- Security threat model → [Security Model](../production/security-model.md)
