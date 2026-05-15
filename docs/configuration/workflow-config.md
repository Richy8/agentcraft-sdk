# Workflow Config

`AgentWorkflow.create(config)` defines repeatable process graphs. `workflow.run(options)` executes one run with validated input and optional persisted state.

## Purpose

| Area             | Config field                    | Related page                                          |
| ---------------- | ------------------------------- | ----------------------------------------------------- |
| Ordered process  | `steps`                         | [AgentWorkflow](../orchestration/agent-workflow.md)   |
| Shared resources | `workspace`                     | [AgentWorkspace](../orchestration/agent-workspace.md) |
| Input contract   | `input`                         | [Structured Output](../core/structured-output.md)     |
| Review hooks     | `onStepComplete`, `onStepError` | [Observability](../core/observability-replay.md)      |

## Usage

```ts
import { AgentWorkflow, CustomStep } from "@deskcreate/agentcraft";
import { z } from "zod";

const workflow = AgentWorkflow.create({
  input: z.object({ topic: z.string() }),
  steps: [
    CustomStep({
      id: "plan",
      run: async (ctx) => {
        const input = ctx.input as { topic: string };
        return `Plan for ${input.topic}`;
      },
    }),
  ],
});

const result = await workflow.run({ input: { topic: "cache strategy" } });
console.log(result.status);
```

## Configuration

### Workflow Definition Fields

| Field / Option   | Required | Default                   | Purpose                              |
| ---------------- | -------- | ------------------------- | ------------------------------------ |
| `steps`          | Yes      | None                      | Ordered `WorkflowStep[]`.            |
| `workspace`      | No       | `AgentWorkspace.memory()` | Shared runtime context.              |
| `input`          | No       | None                      | Zod schema for run input validation. |
| `id`             | No       | Generated                 | Workflow identifier.                 |
| `onStepComplete` | No       | None                      | Callback after a step succeeds.      |
| `onStepError`    | No       | None                      | Callback after a step fails.         |

### Run Fields

| Field / Option | Required | Default | Purpose                                                  |
| -------------- | -------- | ------- | -------------------------------------------------------- |
| `input`        | Yes      | None    | Workflow input. Validated against `input` schema if set. |
| `_resumeFrom`  | Internal | None    | Internal resume state used by `workflow.resume()`.       |

### Resume Fields

| Field / Option    | Required | Default | Purpose                                   |
| ----------------- | -------- | ------- | ----------------------------------------- |
| `runArtifactId`   | Yes      | None    | ID of a stored `WorkflowRun` artifact.    |
| `workspace.store` | Yes      | None    | Required for reading persisted run state. |

## Local Examples

Workflow with persisted state:

```ts
import {
  AgentWorkflow,
  AgentWorkspace,
  CustomStep,
  MemoryArtifactStore,
} from "@deskcreate/agentcraft";

const workspace = AgentWorkspace.create({ store: MemoryArtifactStore() });
const workflow = AgentWorkflow.create({
  workspace,
  steps: [CustomStep({ id: "step", run: async () => "done" })],
});

const result = await workflow.run({ input: {} });
const runs = workspace.store ? await workspace.store.query("WorkflowRun") : [];

console.log(result.runId, runs.length);
```

More variants: [AgentWorkflow](../orchestration/agent-workflow.md) and [orchestration cookbook](../examples-cookbook/orchestration.md).
