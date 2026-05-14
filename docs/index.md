# AgentCraft Documentation

AgentCraft is a production-grade TypeScript runtime for building provider-portable agents with tools, adapters, MCP, skills, structured output, streaming, budgets, tracing, and multi-agent orchestration.

The docs are structured like a product manual. Start with the mental model, then move feature by feature: purpose, setup, config, tools, examples, and deeper cookbook variants.

## Start Here

| Chapter                                          | What it answers                                       | Best next step                                       |
| ------------------------------------------------ | ----------------------------------------------------- | ---------------------------------------------------- |
| [Quickstart](./start/quickstart.md)              | How to run a first useful agent quickly.              | [Mental Model](./start/mental-model.md)              |
| [Feature Map](./start/feature-map.md)            | Every major feature and where it lives.               | [Configuration](./configuration/overview.md)         |
| [Choose Your Path](./guides/choose-your-path.md) | Goal-based routes through the docs.                   | [Examples Cookbook](./examples-cookbook/overview.md) |
| [Creator System](./creator/overview.md)          | Packs, skills, memory, analytics, and workflows.      | [Creator Packs](./creator/packs.md)                  |
| [Production](./production/security-model.md)     | How to ship safely with tools, MCP, tests, and cache. | [Live Testing](./examples-cookbook/production.md)    |

## Core Workflows

| Workflow                   | Main page                                          | Examples                                                       |
| -------------------------- | -------------------------------------------------- | -------------------------------------------------------------- |
| Build and run agents       | [Agents](./core/agents.md)                         | [Beginner cookbook](./examples-cookbook/beginner.md)           |
| Add tools safely           | [Tools](./tools/tools.md)                          | [Tools cookbook](./examples-cookbook/tools-adapters.md)        |
| Connect external systems   | [Adapters](./adapters/overview.md)                 | [Built-In Adapters](./reference/built-in-adapters.md)          |
| Add MCP servers            | [MCP](./mcp/overview.md)                           | [MCP cookbook](./examples-cookbook/mcp.md)                     |
| Add prompt capabilities    | [Skills](./skills/overview.md)                     | [Skills cookbook](./examples-cookbook/skills.md)               |
| Use creator packs          | [Creator Packs](./creator/packs.md)                | [Creator cookbook](./examples-cookbook/creator.md)             |
| Reduce token spend         | [AgentCache](./persistence/agent-cache.md)         | [Cache config](./configuration/cache-config.md)                |
| Coordinate multiple agents | [Orchestration](./orchestration/agent-team.md)     | [Orchestration cookbook](./examples-cookbook/orchestration.md) |
| Build repeatable pipelines | [AgentWorkflow](./orchestration/agent-workflow.md) | [Orchestration cookbook](./examples-cookbook/orchestration.md) |
| Persist agent outputs      | [ArtifactStore](./persistence/artifact-store.md)   | [Production cookbook](./examples-cookbook/production.md)       |

## Production Reading Path

- [Configuration Overview](./configuration/overview.md) for all required, optional, and default values.
- [Security Model](./production/security-model.md) before exposing tools, adapters, or MCP to users.
- [Certification Matrix](./creator/certification.md) before declaring a feature production-ready.
- [API Stability](./production/api-stability.md) for public import paths and generated TypeDoc.

## Local Development

Run the docs site from the package root:

```sh
npm run docs:dev
```

Build the static docs site:

```sh
npm run docs:build
```

Regenerate the API reference:

```sh
npm run docs:api
```
