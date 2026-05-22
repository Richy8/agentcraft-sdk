# Workflow Config

`AgentWorkflow.create(config)` defines a repeatable process graph. `workflow.run(options)` executes one run with validated input and optional persisted state. The workflow config separates the *definition* (what steps exist, what workspace they share) from the *run* (what input triggers this execution).

## Purpose

| Area             | Config field                    | Related page                                           |
| ---------------- | ------------------------------- | ------------------------------------------------------ |
| Ordered process  | `steps`                         | [AgentWorkflow](../orchestration/agent-workflow.md)    |
| Shared resources | `workspace`                     | [AgentWorkspace](../orchestration/agent-workspace.md)  |
| Input contract   | `input`                         | [Structured Output](../core/structured-output.md)      |
| Review hooks     | `onStepComplete`, `onStepError` | [Observability](../core/observability-replay.md)       |
| Artifact store   | `workspace.store`               | [ArtifactStore](../persistence/artifact-store.md)      |

## Workflow Definition Config

| Field            | Required | Default                   | Purpose                                                              |
| ---------------- | -------- | ------------------------- | -------------------------------------------------------------------- |
| `steps`          | Yes      | None                      | Ordered `WorkflowStep[]`. Executed in sequence unless using parallel.|
| `workspace`      | No       | `AgentWorkspace.memory()` | Shared runtime context: cache, store, memory, tool policy.           |
| `input`          | No       | None                      | Zod schema for run input validation. Throws on mismatch.             |
| `id`             | No       | Auto-generated UUID       | Workflow identifier. Used in stored `WorkflowRun` artifacts.         |
| `onStepComplete` | No       | None                      | `(stepId, result, ctx) => void`. Called after each step succeeds.    |
| `onStepError`    | No       | None                      | `(stepId, error, ctx) => void`. Called after a step throws.          |

## Run Options

| Field         | Required | Default  | Purpose                                                         |
| ------------- | -------- | -------- | --------------------------------------------------------------- |
| `input`       | Yes      | None     | Workflow input. Validated against the `input` Zod schema.       |
| `_resumeFrom` | Internal | None     | Internal resume state used by `workflow.resume()`.              |

## Resume Options

| Field             | Required | Default | Purpose                                                   |
| ----------------- | -------- | ------- | --------------------------------------------------------- |
| `runArtifactId`   | Yes      | None    | ID of a previously persisted `WorkflowRun` artifact.      |
| `workspace.store` | Yes      | None    | The same artifact store used during the original run.     |

## Minimal Workflow

```ts
import { AgentWorkflow, CustomStep } from "@deskcreate/agentcraft";
import { z } from "zod";

const workflow = AgentWorkflow.create({
  input: z.object({ topic: z.string() }),
  steps: [
    CustomStep({
      id: "plan",
      run: async (ctx) => {
        const { topic } = ctx.input as { topic: string };
        return `Content plan for: ${topic}`;
      },
    }),
  ],
});

const result = await workflow.run({ input: { topic: "agent caching" } });
console.log(result.status);  // "completed"
```

## Agent Step In A Workflow

```ts
import { Agent, AgentWorkflow, Provider } from "@deskcreate/agentcraft";
import { AgentStep } from "@deskcreate/agentcraft";

const researcher = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const workflow = AgentWorkflow.create({
  steps: [
    AgentStep({
      id: "research",
      agent: researcher,
      buildPrompt: (ctx) => {
        const { topic } = ctx.input as { topic: string };
        return `Research the current state of: ${topic}`;
      },
    }),
    CustomStep({
      id: "summarize",
      run: async (ctx) => {
        const research = ctx.steps["research"]?.output as string;
        return `Summary: ${research.slice(0, 500)}`;
      },
    }),
  ],
});
```

## With Persisted State

Use an `AgentWorkspace` with an `ArtifactStore` so workflow runs are persisted and resumable.

```ts
import {
  AgentWorkflow,
  AgentWorkspace,
  CustomStep,
  FileArtifactStore,
} from "@deskcreate/agentcraft";

const workspace = AgentWorkspace.create({
  store: FileArtifactStore({ root: ".artifacts" }),
});

const workflow = AgentWorkflow.create({
  workspace,
  steps: [
    CustomStep({ id: "step-a", run: async () => "result-a" }),
    CustomStep({ id: "step-b", run: async (ctx) => {
      const a = ctx.steps["step-a"]?.output;
      return `step-b used: ${a}`;
    }}),
  ],
});

const result = await workflow.run({ input: {} });

// List persisted runs from the store
const runs = workspace.store
  ? await workspace.store.query("WorkflowRun")
  : [];
console.log(result.runId, runs.length);
```

## With Input Validation

Pass a Zod schema to `input` — `workflow.run()` throws a typed error if the input doesn't match.

```ts
import { AgentWorkflow, CustomStep } from "@deskcreate/agentcraft";
import { z } from "zod";

const ResearchInput = z.object({
  topic: z.string().min(3),
  depth: z.enum(["light", "deep"]).default("light"),
  outputPath: z.string().optional(),
});

const workflow = AgentWorkflow.create({
  input: ResearchInput,
  steps: [
    CustomStep({
      id: "research",
      run: async (ctx) => {
        const { topic, depth } = ctx.input as z.infer<typeof ResearchInput>;
        return `${depth} research on: ${topic}`;
      },
    }),
  ],
});

const result = await workflow.run({
  input: { topic: "agent caching", depth: "deep" },
});
```

## Step Review Hooks

Use `onStepComplete` and `onStepError` for observability without adding a tracing adapter:

```ts
const workflow = AgentWorkflow.create({
  steps: [...],
  onStepComplete: (stepId, result, ctx) => {
    console.log(`[${ctx.runId}] Step ${stepId} completed:`, result.status);
  },
  onStepError: (stepId, error, ctx) => {
    console.error(`[${ctx.runId}] Step ${stepId} failed:`, error.message);
  },
});
```

## Resuming A Workflow

Resume a paused or failed workflow from a persisted `WorkflowRun` artifact:

```ts
const runArtifactId = "wf-run-abc123"; // saved from a previous workflow.run()

const resumed = await workflow.resume({
  runArtifactId,
});
console.log(resumed.status);
```

Resuming requires `workspace.store` — the workflow reads the stored step outputs to skip completed steps.

## WorkflowContext Fields

Every step `run` function receives a `WorkflowContext`:

| Field       | Type                                 | Purpose                                               |
| ----------- | ------------------------------------ | ----------------------------------------------------- |
| `input`     | `TInput`                             | The validated input passed to `workflow.run()`.       |
| `steps`     | `Record<string, WorkflowStepResult>` | Results of completed steps, keyed by step ID.         |
| `workspace` | `AgentWorkspaceInstance`             | Shared workspace with cache, store, memory.           |
| `store`     | `ArtifactStore \| undefined`         | Shortcut to `workspace.store`.                        |
| `runId`     | `string`                             | Unique ID for this workflow run.                      |

More variants: [AgentWorkflow](../orchestration/agent-workflow.md), [Workflow Steps](../orchestration/workflow-steps.md), and [orchestration cookbook](../examples-cookbook/orchestration.md).
