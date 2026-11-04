# Workflow Steps Reference

`AgentWorkflow` steps are the building blocks of a workflow. Each step is an independent unit of work — an agent run, a tool call, a branching decision, a parallel fan-out, or arbitrary code. Steps are composable: a `ConditionStep` can contain `AgentStep` branches; a `ParallelStep` can contain `TeamStep` instances.

## Step Types at a Glance

| Step            | Factory                 | Purpose                                          |
| --------------- | ----------------------- | ------------------------------------------------ |
| `AgentStep`     | `AgentStep(config)`     | Run a single agent with a prompt                 |
| `TeamStep`      | `TeamStep(config)`      | Run an `AgentTeam` as one step                   |
| `ToolStep`      | `ToolStep(config)`      | Call a specific adapter tool directly            |
| `ApprovalStep`  | `ApprovalStep(config)`  | Gate execution on human or programmatic approval |
| `ConditionStep` | `ConditionStep(config)` | Branch to different steps based on a predicate   |
| `ParallelStep`  | `ParallelStep(config)`  | Run multiple steps concurrently                  |
| `CustomStep`    | `CustomStep(config)`    | Execute arbitrary async application logic        |

## Import

All step factories are exported from the main package entry:

```ts
import {
  AgentStep,
  ApprovalStep,
  ConditionStep,
  CustomStep,
  ParallelStep,
  TeamStep,
  ToolStep,
} from "@deskcreate/agentcraft";
```

## WorkflowContext

Every step receives a `WorkflowContext` as its execution context:

```ts
interface WorkflowContext<TInput = unknown> {
  readonly input: TInput; // Validated workflow input
  readonly steps: Record<string, WorkflowStepResult>; // All completed step results
  readonly workspace: AgentWorkspaceInstance; // Shared cache, adapters, budget
  readonly store: ArtifactStore | undefined; // Artifact persistence store
  readonly runId: string; // Unique run identifier
}
```

Access prior step output via `ctx.steps["step-id"].output`.

## AgentStep

Runs one agent with a static or dynamic prompt.

```ts
AgentStep({
  id?: string;
  agent: Agent;
  prompt: string | ((ctx: WorkflowContext) => string | Promise<string>);
  responseSchema?: StructuredOutputSchema;  // Zod schema for structured output
  toolPolicy?: ToolPolicy;                  // Override workspace tool policy
  retry?: RetryStepConfig;                  // { attempts, delayMs? }
  onError?: "fail" | "skip";               // Default: "fail"
})
```

**Dynamic prompt using prior step output:**

```ts
import {
  Agent,
  AgentStep,
  AgentWorkflow,
  Provider,
} from "@deskcreate/agentcraft";
import { z } from "zod";

const researcher = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const writer = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const workflow = AgentWorkflow.create({
  input: z.object({ topic: z.string() }),
  steps: [
    AgentStep({
      id: "research",
      agent: researcher,
      prompt: (ctx) =>
        `Research the topic: ${ctx.input.topic}. Produce key facts and citations.`,
    }),
    AgentStep({
      id: "write",
      agent: writer,
      prompt: (ctx) => `Write a blog post on "${ctx.input.topic}".
      
Research findings: ${ctx.steps["research"]?.output}`,
    }),
  ],
});
```

**With structured output:**

```ts
import { z } from "zod";

AgentStep({
  id: "classify",
  agent,
  prompt:
    "Classify the sentiment of this review as positive, negative, or neutral.",
  responseSchema: z.object({
    sentiment: z.enum(["positive", "negative", "neutral"]),
    confidence: z.number().min(0).max(1),
  }),
});
```

## TeamStep

Delegates an entire `AgentTeam` run as one workflow step.

```ts
TeamStep({
  id?: string;
  team: AgentTeam;
  prompt: string | ((ctx: WorkflowContext) => string | Promise<string>);
  retry?: RetryStepConfig;
})
```

```ts
import { AgentTeam } from "@deskcreate/agentcraft/team";
import { AgentStep, AgentWorkflow, TeamStep } from "@deskcreate/agentcraft";

const editorialTeam = AgentTeam.create({
  orchestrator,
  members: [
    { role: "writer", agent: writer },
    { role: "editor", agent: editor },
  ],
});

const workflow = AgentWorkflow.create({
  steps: [
    TeamStep({
      id: "editorial",
      team: editorialTeam,
      prompt: (ctx) => `Write and edit a post on: ${ctx.input.topic}`,
    }),
    AgentStep({
      id: "publish",
      agent: publisherAgent,
      prompt: (ctx) =>
        `Publish this content: ${ctx.steps["editorial"]?.output}`,
    }),
  ],
});
```

## ToolStep

Calls a named tool on an adapter directly — without going through an agent.

```ts
ToolStep({
  id?: string;
  adapter: AgentAdapter | ((ctx: WorkflowContext) => AgentAdapter);
  toolName: string;
  args: Record<string, unknown> | ((ctx: WorkflowContext) => Record<string, unknown> | Promise<Record<string, unknown>>);
  retry?: RetryStepConfig;
})
```

```ts
import { ToolStep } from "@deskcreate/agentcraft";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";

const searchAdapter = TavilySearchAdapter.connect({
  apiKey: process.env.TAVILY_API_KEY!,
});

const workflow = AgentWorkflow.create({
  steps: [
    ToolStep({
      id: "search",
      adapter: searchAdapter,
      toolName: "tavily_search",
      args: (ctx) => ({ query: ctx.input.topic, maxResults: 5 }),
    }),
    AgentStep({
      id: "summarize",
      agent,
      prompt: (ctx) =>
        `Summarize these search results: ${JSON.stringify(ctx.steps["search"]?.output)}`,
    }),
  ],
});
```

## ApprovalStep

Gates workflow execution on a callback or human review. If approval is denied, the step throws and the workflow fails.

```ts
ApprovalStep({
  id?: string;
  description: string;
  approve?: (ctx: WorkflowContext) => boolean | Promise<boolean>;  // auto-approve logic
  onApproved?: (ctx: WorkflowContext) => void | Promise<void>;
  onRejected?: (ctx: WorkflowContext, reason?: string) => void | Promise<void>;
  timeoutMs?: number;  // timeout for async approval; throws if exceeded
})
```

**Auto-approval based on cost:**

```ts
import { ApprovalStep } from "@deskcreate/agentcraft";

ApprovalStep({
  id: "cost-gate",
  description:
    "Proceed with expensive research only if estimated cost is within budget.",
  approve: (ctx) => {
    const researchOutput = (ctx.steps["initial-scan"]?.output as string) ?? "";
    // Only proceed if previous step output is non-trivial
    return researchOutput.length > 100;
  },
  onApproved: async (ctx) => {
    console.log(`[${ctx.runId}] Approved — proceeding with deep research.`);
  },
  onRejected: async (ctx, reason) => {
    console.warn(`[${ctx.runId}] Rejected: ${reason}`);
  },
});
```

**Human-in-the-loop via ApprovalQueue:**

```ts
import { ApprovalStep, ApprovalQueue } from "@deskcreate/agentcraft";

const queue = ApprovalQueue.create();

ApprovalStep({
  id: "human-review",
  description: "Requires human approval before publishing.",
  approve: async (ctx) => {
    return queue.request({ toolName: "publish", context: ctx.steps });
  },
  timeoutMs: 5 * 60 * 1000, // 5 minute timeout
});
```

## ConditionStep

Branches execution to different step sequences based on a predicate.

```ts
ConditionStep({
  id?: string;
  condition: (ctx: WorkflowContext) => boolean | Promise<boolean>;
  ifTrue?: WorkflowStep | readonly WorkflowStep[];
  ifFalse?: WorkflowStep | readonly WorkflowStep[];
})
```

```ts
import { AgentStep, ConditionStep } from "@deskcreate/agentcraft";

ConditionStep({
  id: "content-type-branch",
  condition: (ctx) => ctx.input.format === "video",
  ifTrue: AgentStep({
    id: "script-writer",
    agent: scriptAgent,
    prompt: (ctx) => `Write a video script for: ${ctx.input.topic}`,
  }),
  ifFalse: [
    AgentStep({
      id: "blog-writer",
      agent: blogAgent,
      prompt: (ctx) => `Write a blog post for: ${ctx.input.topic}`,
    }),
    AgentStep({
      id: "seo-review",
      agent: seoAgent,
      prompt: (ctx) => `Review SEO for: ${ctx.steps["blog-writer"]?.output}`,
    }),
  ],
});
```

## ParallelStep

Runs multiple steps concurrently with `Promise.allSettled`. All results are available in `ctx.steps` after completion.

```ts
ParallelStep({
  id?: string;
  steps: readonly WorkflowStep[];
  failFast?: boolean;  // Default: true — throw if any step fails
})
```

```ts
import { AgentStep, ParallelStep } from "@deskcreate/agentcraft";

ParallelStep({
  id: "multi-channel",
  failFast: false, // collect all results even if some fail
  steps: [
    AgentStep({
      id: "linkedin-draft",
      agent: socialAgent,
      prompt: (ctx) =>
        `/write-linkedin-post Write a LinkedIn post about: ${ctx.input.topic}`,
    }),
    AgentStep({
      id: "twitter-draft",
      agent: socialAgent,
      prompt: (ctx) =>
        `/write-x-post Write an X/Twitter post about: ${ctx.input.topic}`,
    }),
    AgentStep({
      id: "newsletter-draft",
      agent: newsletterAgent,
      prompt: (ctx) =>
        `/write-newsletter Write a newsletter teaser about: ${ctx.input.topic}`,
    }),
  ],
});
```

Outputs from a `ParallelStep` are keyed by each child `stepId`:

```ts
const parallelOutputs = result.steps.find(
  (s) => s.stepId === "multi-channel",
)?.output;
// → { "linkedin-draft": "...", "twitter-draft": "...", "newsletter-draft": "..." }
```

## CustomStep

Runs arbitrary async application logic — database writes, file operations, notification delivery, or any side effect.

```ts
CustomStep({
  id?: string;
  run: (ctx: WorkflowContext) => unknown | Promise<unknown>;
  retry?: RetryStepConfig;
})
```

```ts
import { CustomStep } from "@deskcreate/agentcraft";

CustomStep({
  id: "save-to-db",
  run: async (ctx) => {
    const blogContent = ctx.steps["blog-writer"]?.output as string;
    await db.posts.create({
      topic: ctx.input.topic,
      content: blogContent,
      createdAt: new Date(),
    });
    return { saved: true };
  },
});
```

## Retry Configuration

`AgentStep`, `TeamStep`, `ToolStep`, and `CustomStep` support a `retry` option:

| Field      | Type     | Default | Purpose                                 |
| ---------- | -------- | ------- | --------------------------------------- |
| `attempts` | `number` | `1`     | Total number of attempts (1 = no retry) |
| `delayMs`  | `number` | `0`     | Milliseconds to wait between retries    |

```ts
AgentStep({
  id: "flaky-api-call",
  agent,
  prompt: "Fetch and summarize the latest release notes.",
  retry: { attempts: 3, delayMs: 500 },
});
```

## WorkflowStepResult Fields

Each step result stored in `ctx.steps` and returned in `WorkflowResult.steps`:

| Field        | Type                                                          | Purpose                                      |
| ------------ | ------------------------------------------------------------- | -------------------------------------------- |
| `stepId`     | `string`                                                      | Unique step identifier                       |
| `status`     | `"completed" \| "failed" \| "skipped" \| "awaiting_approval"` | Final step status                            |
| `output`     | `unknown`                                                     | Step return value (available to later steps) |
| `error`      | `string \| undefined`                                         | Error message if status is `"failed"`        |
| `durationMs` | `number`                                                      | Execution time in milliseconds               |
| `cost`       | `number \| undefined`                                         | Estimated cost for agent/team steps          |
| `tokensUsed` | `TokenUsage \| undefined`                                     | Token breakdown for agent/team steps         |

## Step ID Conventions

If you do not provide an `id`, the factory generates one (e.g. `agent-3f2a1b`). Always set `id` explicitly when you need to reference a step's output in a later step:

```ts
// Bad: auto-generated ID not stable
AgentStep({ agent, prompt: "Research the topic." });

// Good: explicit ID for downstream reference
AgentStep({
  id: "research",
  agent,
  prompt: (ctx) => `Research: ${ctx.input.topic}`,
});
// Later: ctx.steps["research"]?.output
```

## Related

- [AgentWorkflow](./agent-workflow.md) — full workflow configuration and resume
- [Agent Team](./agent-team.md) — `AgentTeam` for use in `TeamStep`
- [Agent Workspace](./agent-workspace.md) — workspace wired into `WorkflowContext`
- [Tool Policy](../tools/tool-policy.md) — per-step tool restrictions
