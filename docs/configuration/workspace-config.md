# Workspace Config

`AgentWorkspace` config controls shared runtime resources for teams and workflows.

## Purpose

| Area          | Config field          | Related page                                      |
| ------------- | --------------------- | ------------------------------------------------- |
| Cache         | `cache`               | [AgentCache](../persistence/agent-cache.md)       |
| Persistence   | `store`               | [ArtifactStore](../persistence/artifact-store.md) |
| Tools         | `adapters`, `mcps`    | [Adapters](../adapters/overview.md)               |
| Safety        | `toolPolicy`          | [Tool Policy](../tools/tool-policy.md)            |
| Cost control  | `budget`              | [Budgets And Cost](../core/budgets-cost.md)       |
| Observability | `traceSink`, `events` | [Observability](../core/observability-replay.md)  |

## Usage

```ts
import { AgentCache, AgentWorkspace, FileArtifactStore } from "agentcraft";

const workspace = AgentWorkspace.create({
  cache: AgentCache.memory(),
  store: FileArtifactStore({ root: ".artifacts" }),
  toolPolicy: { readOnly: true, redactSecrets: true },
  budget: { maxCost: 2, maxToolCalls: 10 },
});

console.log(Boolean(workspace.events));
```

## Configuration

| Field / Option | Required | Default | Purpose                                                      |
| -------------- | -------- | ------- | ------------------------------------------------------------ |
| `cache`        | No       | None    | Shared `AgentCacheController`.                               |
| `store`        | No       | None    | Shared `ArtifactStore` exposed as `ctx.store` in workflows.  |
| `adapters`     | No       | `[]`    | Native adapters attached to agents provisioned by workspace. |
| `mcps`         | No       | `[]`    | MCP-backed adapters shared across agents.                    |
| `toolPolicy`   | No       | None    | Base tool policy. Per-role and per-run policy can add to it. |
| `budget`       | No       | None    | Base run budget for team roles and workflow agent steps.     |
| `traceSink`    | No       | None    | Trace sink used when team run params omit `trace`.           |
| `logger`       | No       | Runtime | Logger reference for consumers that pass one through.        |

## Factory Defaults

| Factory                         | Required | Default      | Purpose                                          |
| ------------------------------- | -------- | ------------ | ------------------------------------------------ |
| `AgentWorkspace.create(config)` | No       | `{}`         | Full workspace assembly.                         |
| `AgentWorkspace.memory()`       | No       | No resources | Ephemeral workspace for tests and short scripts. |
| `AgentWorkspace.local(root)`    | Yes      | File cache   | Local workspace with a file cache under `root`.  |

`AgentWorkspace.local(root, { cacheRoot })` writes cache entries to `cacheRoot` when provided, otherwise `${root}/.agentcraft-cache`.

## Local Examples

Workspace passed into a team:

```ts
import { Agent, AgentWorkspace, Provider } from "agentcraft";
import { AgentTeam } from "agentcraft/team";

const apiKey = process.env.OPENAI_API_KEY ?? "";
const workspace = AgentWorkspace.create({
  toolPolicy: { readOnly: true },
});
const root = Agent.create({ model: Provider.openai["gpt-4o-mini"], apiKey });

const team = AgentTeam.create({
  workspace,
  orchestrator: root,
  members: [
    { role: "reviewer", agent: root.cloneWithSystem("Review.", "reviewer") },
  ],
});

console.log(team);
```

More variants: [AgentWorkspace](../orchestration/agent-workspace.md) and [orchestration cookbook](../examples-cookbook/orchestration.md).
