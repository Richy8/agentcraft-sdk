# AgentWorkspace

`AgentWorkspace` is the shared runtime context for an agent ecosystem. It wires cache, adapters, MCPs, tool policy, budget, trace sink, logger, events, and artifact store references once.

## Purpose

| Problem it solves                          | What workspace provides       | Related page                                      |
| ------------------------------------------ | ----------------------------- | ------------------------------------------------- |
| Repeated cache wiring per agent            | Shared `AgentCacheController` | [AgentCache](../persistence/agent-cache.md)       |
| Adapter attached to every team member      | Shared `adapters` and `mcps`  | [Adapters](../adapters/overview.md)               |
| Per-run policy duplication                 | Workspace-level `toolPolicy`  | [Tool Policy](../tools/tool-policy.md)            |
| One event subscription surface             | Built-in `AgentEventEmitter`  | [Observability](../core/observability-replay.md)  |
| Store wiring outside orchestration context | Optional `store` reference    | [ArtifactStore](../persistence/artifact-store.md) |

## Usage

```ts
import {
  Agent,
  AgentCache,
  AgentWorkspace,
  FileArtifactStore,
  Provider,
} from "@deskcreate/agentcraft";
import {
  FileSystemAdapter,
  TavilySearchAdapter,
} from "@deskcreate/agentcraft/adapters";
import { AgentTeam } from "@deskcreate/agentcraft/team";

const openaiKey = process.env.OPENAI_API_KEY ?? "";
const tavilyKey = process.env.TAVILY_API_KEY ?? "";

const workspace = AgentWorkspace.create({
  cache: AgentCache.file(".cache", { strategy: "auto", namespace: "acme" }),
  store: FileArtifactStore({ root: ".artifacts" }),
  adapters: [
    FileSystemAdapter.connect({ rootPath: "./content", readOnly: true }),
    TavilySearchAdapter.connect({ apiKey: tavilyKey }),
  ],
  toolPolicy: { readOnly: true, redactSecrets: true },
  budget: { maxCost: 5, maxToolCalls: 20 },
});

const orchestrator = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: openaiKey,
});
const reviewer = orchestrator.cloneWithSystem(
  "Review for factual risk.",
  "reviewer",
);

const team = AgentTeam.create({
  workspace,
  orchestrator,
  members: [{ role: "reviewer", agent: reviewer }],
  rolePolicies: { reviewer: { readOnly: true } },
});

const response = await team.run({ prompt: "Review this launch draft." });
console.log(response.content);
```

## Configuration

| Field / Option | Required | Default | Purpose                                                            |
| -------------- | -------- | ------- | ------------------------------------------------------------------ |
| `cache`        | No       | None    | Shared cache controller for agents in the workspace.               |
| `store`        | No       | None    | Shared `ArtifactStore` reference passed into workflow context.     |
| `adapters`     | No       | `[]`    | Adapters attached to every agent provisioned from the workspace.   |
| `mcps`         | No       | `[]`    | MCP adapters initialized once and shared across agents.            |
| `toolPolicy`   | No       | None    | Workspace-level default `ToolPolicy`.                              |
| `budget`       | No       | None    | Default `RunBudget` merged before per-role budgets.                |
| `traceSink`    | No       | None    | Shared trace sink for OpenTelemetry-compatible observability.      |
| `logger`       | No       | Runtime | Shared logger.                                                     |
| `metrics`      | Built in | Zeroed  | Snapshot/reset counters for cost, tokens, cache, tools, artifacts. |

## Factory Variants

| Factory                         | Cache        | Adapters | Best for                          |
| ------------------------------- | ------------ | -------- | --------------------------------- |
| `AgentWorkspace.create(config)` | As specified | As given | Production workspace wiring       |
| `AgentWorkspace.memory()`       | None         | None     | Tests, demos, ephemeral scripts   |
| `AgentWorkspace.local(root)`    | File cache   | None     | Local development and CLI tooling |

`AgentWorkspace.local(root, { cacheRoot })` creates a file cache at `cacheRoot` or `${root}/.agentcraft-cache`.

## Events

Every workspace exposes an event emitter:

```ts
import { AgentWorkspace } from "@deskcreate/agentcraft";

const workspace = AgentWorkspace.create({});

workspace.events.on("cache.hit", ({ toolName, estimatedSavedTokens }) => {
  console.log(`Cache hit on ${toolName}: ${estimatedSavedTokens ?? 0}`);
});

workspace.events.on("approval.requested", ({ toolName }) => {
  console.log(`Approval needed for ${toolName}`);
});
```

| Event                     | Payload fields                             | Source               |
| ------------------------- | ------------------------------------------ | -------------------- |
| `cache.hit`               | `toolName`, `key`, `estimatedSavedTokens?` | Agent tool cache     |
| `cache.miss`              | `toolName`, `key`                          | Agent tool cache     |
| `cache.write`             | `toolName`, `key`                          | Agent tool cache     |
| `cost.updated`            | `model`, `provider`, `cost`, `tokensUsed`  | Agent response       |
| `tool.called`             | `toolName`, `sideEffectLevel?`             | Tool execution       |
| `approval.requested`      | `toolName`, `sideEffect?`                  | Tool policy          |
| `approval.granted`        | `toolName`                                 | Tool policy          |
| `approval.denied`         | `toolName`                                 | Tool policy          |
| `workflow.step.started`   | `stepId`, `type`                           | AgentWorkflow        |
| `workflow.step.completed` | `stepId`, `status`                         | AgentWorkflow        |
| `artifact.read`           | `type`, `id`                               | Workflow resume      |
| `artifact.write`          | `type`, `id`, `operation`                  | Workflow persistence |

## Metrics Snapshot

Use `workspace.metrics.snapshot()` when you want aggregate counters across a team, workflow, or long-running app session.

```ts
const before = workspace.metrics.snapshot();

const result = await team.run({
  prompt: "Create and review a launch post.",
});

const after = workspace.metrics.snapshot();

console.log(result.content);
console.log(after.cost - before.cost);
console.log(after.tokensUsed.total - before.tokensUsed.total);
console.log(after.cache.hits - before.cache.hits);
console.log(after.toolCalls - before.toolCalls);
```

`workspace.metrics.reset()` clears the counters when you want a fresh measurement window.

## Local Examples

Workspace with a file cache and no adapters:

```ts
import { AgentWorkspace } from "@deskcreate/agentcraft";

const workspace = AgentWorkspace.local("./workspace");
console.log(workspace.cache?.config.type);
```

Workspace with store-only persistence:

```ts
import { AgentWorkspace, MemoryArtifactStore } from "@deskcreate/agentcraft";

const workspace = AgentWorkspace.create({
  store: MemoryArtifactStore(),
});

console.log(Boolean(workspace.store));
```

More variants: [orchestration cookbook](../examples-cookbook/orchestration.md).
