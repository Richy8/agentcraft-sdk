# AgentWorkflow

`AgentWorkflow` is the repeatable process layer for coordinating agents, teams, tools, approvals, retries, artifact writes, and resumable runs.

## Purpose

| Pattern                  | Step type       | Related page                                      |
| ------------------------ | --------------- | ------------------------------------------------- |
| Agent pipeline           | `AgentStep`     | [Agents](../core/agents.md)                       |
| Team pipeline            | `TeamStep`      | [AgentTeam](./agent-team.md)                      |
| External tool call       | `ToolStep`      | [Adapters](../adapters/overview.md)               |
| Human approval gate      | `ApprovalStep`  | [Approvals](../tools/approvals.md)                |
| Conditional branch       | `ConditionStep` | [Run Config](../configuration/run-config.md)      |
| Parallel fan-out         | `ParallelStep`  | [AgentPool](./agent-pool.md)                      |
| Custom application logic | `CustomStep`    | [ArtifactStore](../persistence/artifact-store.md) |

## Usage

```ts
import {
  Agent,
  AgentStep,
  AgentWorkflow,
  ApprovalStep,
  FileArtifactStore,
  Provider,
  AgentWorkspace,
} from "agentcraft";
import { z } from "zod";

const apiKey = process.env.OPENAI_API_KEY ?? "";
const workspace = AgentWorkspace.create({
  store: FileArtifactStore({ root: ".artifacts" }),
});
const writer = Agent.create({ model: Provider.openai["gpt-4o-mini"], apiKey });
type WorkflowInput = { topic: string };

const workflow = AgentWorkflow.create({
  workspace,
  input: z.object({ topic: z.string() }),
  steps: [
    AgentStep({
      id: "draft",
      agent: writer,
      prompt: (ctx) => {
        const input = ctx.input as WorkflowInput;
        return `Write a short draft about ${input.topic}.`;
      },
    }),
    ApprovalStep({
      id: "gate",
      description: "Approve before persistence",
      approve: () => true,
      onApproved: async (ctx) => {
        await ctx.store?.put("Draft", {
          body: ctx.steps.draft?.output,
          status: "approved",
        });
      },
    }),
  ],
});

const result = await workflow.run({ input: { topic: "agent caching" } });
console.log(result.status);
```

## Step Types

| Step factory    | Purpose                                                               |
| --------------- | --------------------------------------------------------------------- |
| `AgentStep`     | Run an agent with a prompt. Output is content or structured response. |
| `TeamStep`      | Run an `AgentTeam` with a prompt.                                     |
| `ToolStep`      | Call a specific tool from an adapter.                                 |
| `ApprovalStep`  | Gate execution through an approval callback.                          |
| `ConditionStep` | Choose one branch based on a predicate.                               |
| `ParallelStep`  | Run child steps concurrently.                                         |
| `CustomStep`    | Run arbitrary async application logic.                                |

## Configuration

### `AgentWorkflow.create(config)`

| Field / Option   | Required | Default                   | Purpose                                               |
| ---------------- | -------- | ------------------------- | ----------------------------------------------------- |
| `steps`          | Yes      | None                      | Ordered workflow steps.                               |
| `workspace`      | No       | `AgentWorkspace.memory()` | Shared resources, store, cache, policy, and events.   |
| `input`          | No       | None                      | Zod schema for validating `workflow.run({ input })`.  |
| `id`             | No       | Generated                 | Workflow ID for inspection and persisted run records. |
| `onStepComplete` | No       | None                      | Callback after a step succeeds.                       |
| `onStepError`    | No       | None                      | Callback after a step fails.                          |

### Step Configs

| Step            | Required field                | Optional fields                                    | Purpose                        |
| --------------- | ----------------------------- | -------------------------------------------------- | ------------------------------ |
| `AgentStep`     | `prompt`                      | `agent`, `responseSchema`, `retry`                 | Run one agent.                 |
| `TeamStep`      | `team`, `prompt`              | `retry`                                            | Run one team.                  |
| `ToolStep`      | `adapter`, `toolName`, `args` | `retry`                                            | Call one adapter tool by name. |
| `ApprovalStep`  | `description`                 | `approve`, `onApproved`, `onRejected`, `timeoutMs` | Gate a step.                   |
| `ConditionStep` | `condition`                   | `ifTrue`, `ifFalse`                                | Branch based on context.       |
| `ParallelStep`  | `steps`                       | `failFast`                                         | Run child steps concurrently.  |
| `CustomStep`    | `run`                         | `retry`                                            | Run application logic.         |

`ToolStep.toolName` must match a name returned by `adapter.getTools()`. The error message lists available tools when the name is invalid.

## Workflow Context

| Field       | Type                         | Purpose                                           |
| ----------- | ---------------------------- | ------------------------------------------------- |
| `input`     | Validated input              | Input passed to `workflow.run()`.                 |
| `steps`     | `Record<string, StepResult>` | Outputs and statuses from completed prior steps.  |
| `workspace` | `AgentWorkspaceInstance`     | Shared runtime context.                           |
| `store`     | `ArtifactStore \| undefined` | Store from `workspace.store`, if configured.      |
| `runId`     | `string`                     | Current workflow run ID or persisted artifact ID. |

## Resumability

When `workspace.store` is set, every run writes a `WorkflowRun` artifact. Failed runs can resume from the first incomplete step:

```ts
import {
  AgentWorkflow,
  CustomStep,
  AgentWorkspace,
  MemoryArtifactStore,
} from "agentcraft";

const workspace = AgentWorkspace.create({ store: MemoryArtifactStore() });
const workflow = AgentWorkflow.create({
  workspace,
  steps: [CustomStep({ id: "step", run: async () => "done" })],
});

const result = await workflow.run({ input: {} });
const failed = workspace.store
  ? await workspace.store.query("WorkflowRun", { status: "failed" })
  : [];

if (result.status === "failed" && failed[0]) {
  const resumed = await workflow.resume(
    String((failed[0] as { id: string }).id),
  );
  console.log(resumed.status);
}
```

`resume(runArtifactId)` requires `workspace.store`. Without a store, it throws an error that mentions `workspace.store`.

## Local Examples

Workflow with a retrying custom step:

```ts
import { AgentWorkflow, CustomStep } from "agentcraft";

let attempts = 0;
const workflow = AgentWorkflow.create({
  steps: [
    CustomStep({
      id: "unstable",
      retry: { attempts: 3 },
      run: async () => {
        attempts += 1;
        if (attempts < 3) throw new Error("try again");
        return "ready";
      },
    }),
  ],
});

const result = await workflow.run({ input: {} });
console.log(result.steps[0]?.status);
```

More variants: [orchestration cookbook](../examples-cookbook/orchestration.md).
