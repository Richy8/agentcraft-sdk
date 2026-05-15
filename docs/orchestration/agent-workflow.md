# AgentWorkflow

`AgentWorkflow` is the repeatable process layer for coordinating agents, teams, tools, approvals, conditions, and parallel fan-outs into a single composable run. Each step produces output stored in the context, which later steps can read. Failed runs can resume from the first incomplete step when a `workspace.store` is configured.

## Quick Start

```ts
import {
  Agent,
  AgentStep,
  AgentWorkflow,
  AgentWorkspace,
  CustomStep,
  FileArtifactStore,
  Provider,
} from "@deskcreate/agentcraft";
import { z } from "zod";

// Define the shape of the input this workflow accepts
const InputSchema = z.object({ topic: z.string() });

const writer = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const workflow = AgentWorkflow.create({
  // Validate input at runtime before any step runs
  input: InputSchema,

  // Workspace gives every step access to a shared store
  workspace: AgentWorkspace.create({
    store: FileArtifactStore({ root: ".artifacts" }),
  }),

  steps: [
    // Step 1 — run the writer agent, return the draft text
    AgentStep({
      id: "draft",
      agent: writer,
      // prompt is a function so it can read validated input
      prompt: (ctx) =>
        `Write a short article about ${(ctx.input as z.infer<typeof InputSchema>).topic}.`,
    }),

    // Step 2 — persist the draft to the artifact store
    CustomStep({
      id: "save",
      run: async (ctx) => {
        const draftContent = ctx.steps["draft"]?.output as string;
        // ctx.store is the ArtifactStore from workspace
        const id = await ctx.store?.put("Draft", {
          body: draftContent,
          status: "draft",
        });
        return { artifactId: id };
      },
    }),
  ],
});

const result = await workflow.run({ input: { topic: "agent caching" } });

console.log(result.status); // "completed"
console.log(result.totalCost); // total cost across all steps
console.log(result.durationMs); // total wall-clock time
```

## `AgentWorkflow.create()` Config

| Field            | Required | Default                   | Purpose                                                            |
| ---------------- | -------- | ------------------------- | ------------------------------------------------------------------ |
| `steps`          | Yes      | None                      | Ordered `WorkflowStep[]` executed in sequence.                     |
| `workspace`      | No       | `AgentWorkspace.memory()` | Shared cache, store, policy, and events injected into every step.  |
| `input`          | No       | None                      | Zod schema — validates `workflow.run({ input })` before step 1.    |
| `id`             | No       | Auto-generated            | Stable workflow ID used in persisted run records.                  |
| `onStepComplete` | No       | None                      | `(stepId, output, ctx) => void` — called after each step succeeds. |
| `onStepError`    | No       | None                      | `(stepId, error, ctx) => void` — called after each step fails.     |

## Workflow Instance Methods

| Method                | Returns                   | Purpose                                                            |
| --------------------- | ------------------------- | ------------------------------------------------------------------ |
| `workflow.run(opts)`  | `Promise<WorkflowResult>` | Execute all steps with validated input. Persists run if store set. |
| `workflow.resume(id)` | `Promise<WorkflowResult>` | Re-run from first incomplete step. Requires `workspace.store`.     |
| `workflow.inspect()`  | `WorkflowInspection`      | Return the workflow ID and static step graph (IDs and types).      |

## `WorkflowResult` Fields

```ts
const result = await workflow.run({ input: { topic: "caching" } });

result.runId; // string — unique run ID (also the store artifact ID if persisted)
result.status; // "completed" | "failed" | "partial"
result.input; // the validated input object
result.steps; // WorkflowStepResult[] — one entry per executed step
result.totalCost; // number — sum of cost across all steps
result.durationMs; // number — total wall-clock time in milliseconds
```

### `WorkflowStepResult` Fields

```ts
// Available on result.steps[n] or ctx.steps["stepId"]
step.stepId; // string — the step's id
step.status; // "completed" | "failed" | "skipped" | "pending" | ...
step.output; // unknown — whatever the step returned
step.error; // string | undefined — error message if status is "failed"
step.durationMs; // number — how long the step took
step.cost; // number | undefined — LLM cost if the step ran an agent
step.tokensUsed; // TokenUsage | undefined
```

## Step Types

All step factories are imported from `"agentcraft"`. Every step has an optional `id` — when omitted, one is auto-generated. IDs must be unique within a workflow.

---

### `AgentStep` — Run an Agent

Runs one agent with a prompt. The step's output is `response.structuredResponse` when `responseSchema` is set, otherwise `response.content`.

```ts
import {
  Agent,
  AgentStep,
  AgentWorkflow,
  Provider,
} from "@deskcreate/agentcraft";
import { z } from "zod";

const analyst = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  system: "You are a product analyst. Be concise.",
});

const workflow = AgentWorkflow.create({
  input: z.object({ productName: z.string() }),
  steps: [
    AgentStep({
      id: "analyze",
      agent: analyst,
      // Dynamic prompt built from the validated workflow input
      prompt: (ctx) => {
        const { productName } = ctx.input as { productName: string };
        return `List three key strengths of ${productName} in one sentence each.`;
      },
    }),
  ],
});

const result = await workflow.run({ input: { productName: "AgentCraft" } });
console.log(result.steps[0]?.output); // the agent's text response
```

**With structured output** — the step output becomes the validated typed value:

```ts
import {
  Agent,
  AgentStep,
  AgentWorkflow,
  Provider,
} from "@deskcreate/agentcraft";
import { z } from "zod";

const ReviewSchema = z.object({
  score: z.number().min(1).max(10),
  summary: z.string(),
  approved: z.boolean(),
});

const reviewer = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const workflow = AgentWorkflow.create({
  input: z.object({ draft: z.string() }),
  steps: [
    AgentStep({
      id: "review",
      agent: reviewer,
      prompt: (ctx) =>
        `Review this draft and return a JSON assessment:\n\n${(ctx.input as { draft: string }).draft}`,
      // Structured output — step.output will be { score, summary, approved }
      responseSchema: ReviewSchema,
    }),
  ],
});

const result = await workflow.run({
  input: { draft: "TypeScript is great because..." },
});
const review = result.steps[0]?.output as z.infer<typeof ReviewSchema>;
console.log(review.score, review.approved);
```

**With retry** — retry the agent call up to N times on failure:

```ts
AgentStep({
  id: "draft",
  agent: writer,
  prompt: "Write a product announcement.",
  retry: { attempts: 3, delayMs: 1000 }, // 3 attempts, 1 second between each
}),
```

**`AgentStep` config fields:**

| Field            | Required | Default | Purpose                                                         |
| ---------------- | -------- | ------- | --------------------------------------------------------------- |
| `id`             | No       | Auto    | Step identifier — used as key in `ctx.steps`.                   |
| `agent`          | Yes      | None    | The `Agent` instance to run.                                    |
| `prompt`         | Yes      | None    | Static string or `(ctx) => string` function.                    |
| `responseSchema` | No       | None    | Zod or JSON schema — output becomes `structuredResponse` value. |
| `toolPolicy`     | No       | None    | Per-step `ToolPolicy` merged with workspace policy.             |
| `retry`          | No       | None    | `{ attempts, delayMs? }` — retry on failure.                    |

---

### `TeamStep` — Run an AgentTeam

Runs an `AgentTeam` and returns the team's final content string.

```ts
import {
  Agent,
  AgentWorkflow,
  Provider,
  TeamStep,
} from "@deskcreate/agentcraft";
import { AgentTeam } from "@deskcreate/agentcraft/team";
import { z } from "zod";

const orchestrator = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const writer = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  system: "Write clearly and concisely.",
});

const reviewer = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  system: "Review for accuracy and flag any issues.",
});

const team = AgentTeam.create({
  orchestrator,
  members: [
    { role: "writer", agent: writer, description: "Draft the content." },
    { role: "reviewer", agent: reviewer, description: "Review and approve." },
  ],
  maxRounds: 3,
});

const workflow = AgentWorkflow.create({
  input: z.object({ topic: z.string() }),
  steps: [
    TeamStep({
      id: "write-and-review",
      team,
      // Prompt can be static or dynamic from ctx
      prompt: (ctx) =>
        `Write and review an article about ${(ctx.input as { topic: string }).topic}.`,
    }),
  ],
});

const result = await workflow.run({ input: { topic: "streaming APIs" } });
console.log(result.steps[0]?.output); // final team content
```

**`TeamStep` config fields:**

| Field    | Required | Default | Purpose                                                 |
| -------- | -------- | ------- | ------------------------------------------------------- |
| `id`     | No       | Auto    | Step identifier.                                        |
| `team`   | Yes      | None    | The `AgentTeam` instance to run.                        |
| `prompt` | Yes      | None    | Static string or `(ctx) => string` function.            |
| `retry`  | No       | None    | `{ attempts, delayMs? }` — retry the team run on error. |

---

### `ToolStep` — Call a Tool Directly

Calls a named tool from an adapter without going through an agent. The `toolName` must match a name returned by `adapter.getTools()`. If the name is wrong, the error message lists all available tool names.

```ts
import {
  AgentStep,
  AgentWorkflow,
  Agent,
  Provider,
  ToolStep,
} from "@deskcreate/agentcraft";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";
import { z } from "zod";

// Create the adapter (its tools will be called directly)
const searchAdapter = TavilySearchAdapter.connect({
  apiKey: process.env.TAVILY_API_KEY!,
});

const writer = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const workflow = AgentWorkflow.create({
  input: z.object({ query: z.string() }),
  steps: [
    // Step 1 — call the search tool directly, no agent involved
    ToolStep({
      id: "search",
      adapter: searchAdapter,
      toolName: "web_search", // must match a tool name in the adapter
      // args can be static or a function returning args from ctx
      args: (ctx) => ({
        query: (ctx.input as { query: string }).query,
        max_results: 5,
      }),
    }),

    // Step 2 — agent reads the search results from ctx.steps["search"]
    AgentStep({
      id: "summarize",
      agent: writer,
      prompt: (ctx) => {
        const searchResults = ctx.steps["search"]?.output;
        return `Based on these search results, write a summary:\n\n${JSON.stringify(searchResults)}`;
      },
    }),
  ],
});

const result = await workflow.run({
  input: { query: "TypeScript 5.5 features" },
});
console.log(result.steps[1]?.output); // summary from agent
```

**With a dynamic adapter** (resolved from context):

```ts
ToolStep({
  id: "fetch",
  // adapter can be a function that returns one based on context
  adapter: (ctx) => {
    const env = (ctx.input as { env: string }).env;
    return env === "prod" ? prodAdapter : stagingAdapter;
  },
  toolName: "get_records",
  args: { limit: 100 },
}),
```

**`ToolStep` config fields:**

| Field      | Required | Default | Purpose                                                                       |
| ---------- | -------- | ------- | ----------------------------------------------------------------------------- |
| `id`       | No       | Auto    | Step identifier.                                                              |
| `adapter`  | Yes      | None    | `AgentAdapter` instance or `(ctx) => AgentAdapter` function.                  |
| `toolName` | Yes      | None    | Name of the tool to call. Must match `adapter.getTools()`.                    |
| `args`     | Yes      | None    | Static `Record<string, unknown>` or `async (ctx) => Record<string, unknown>`. |
| `retry`    | No       | None    | `{ attempts, delayMs? }` — retry tool call on failure.                        |

---

### `ApprovalStep` — Human or Programmatic Gate

Gates workflow execution. If `approve` returns `false` (or times out), the step throws and the run status becomes `"failed"`. The `onApproved` callback runs inside the gate — use it to write artifacts or trigger side effects only when approved.

```ts
import {
  AgentStep,
  AgentWorkflow,
  Agent,
  ApprovalStep,
  Provider,
} from "@deskcreate/agentcraft";

const writer = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const workflow = AgentWorkflow.create({
  steps: [
    AgentStep({
      id: "draft",
      agent: writer,
      prompt: "Write a customer-facing product announcement.",
    }),

    ApprovalStep({
      id: "review-gate",
      description: "Approve before sending to customers",

      // Programmatic check — could call an external approval system
      approve: async (ctx) => {
        const draft = ctx.steps["draft"]?.output as string;
        // Approve only if the draft is under 500 words
        return draft.split(" ").length < 500;
      },

      // Only runs if approved — persist or send here
      onApproved: async (ctx) => {
        const draft = ctx.steps["draft"]?.output as string;
        await ctx.store?.put("Draft", { body: draft, status: "approved" });
        console.log("Draft approved and saved.");
      },

      // Runs if rejected — log or notify
      onRejected: async (_ctx, reason) => {
        console.warn(`Draft rejected: ${reason}`);
      },

      // Optional: abort if approval takes too long
      timeoutMs: 30_000,
    }),
  ],
});

const result = await workflow.run({ input: {} });
console.log(result.status); // "completed" if approved, "failed" if rejected
```

**Human-in-the-loop approval** — pause and wait for a real person:

```ts
ApprovalStep({
  id: "human-gate",
  description: "Editorial director must approve before publishing",

  approve: async (ctx) => {
    // Submit to your approval queue
    const requestId = await approvalQueue.submit({
      content: ctx.steps["draft"]?.output,
      requestedAt: new Date().toISOString(),
    });

    // Block until a human approves or denies (with timeout)
    return await approvalQueue.waitForDecision(requestId, {
      timeoutMs: 24 * 60 * 60 * 1000, // 24 hours
    });
  },
}),
```

**`ApprovalStep` config fields:**

| Field         | Required | Default      | Purpose                                                                         |
| ------------- | -------- | ------------ | ------------------------------------------------------------------------------- |
| `id`          | No       | Auto         | Step identifier.                                                                |
| `description` | Yes      | None         | Human-readable description of what is being approved.                           |
| `approve`     | No       | `() => true` | `(ctx) => boolean` — return `false` to reject. Defaults to auto-approve.        |
| `onApproved`  | No       | None         | `(ctx) => void` — runs when approved. Use for side effects (write, send, etc.). |
| `onRejected`  | No       | None         | `(ctx, reason?) => void` — runs when rejected. Use for logging or alerting.     |
| `timeoutMs`   | No       | None         | Abort if `approve` hasn't resolved within this many milliseconds.               |

---

### `ConditionStep` — Branch Based on Context

Executes `ifTrue` or `ifFalse` steps based on a predicate evaluated at runtime. The chosen branch steps run inline and their outputs are recorded in `ctx.steps`. If the branch is `undefined`, it's silently skipped.

```ts
import {
  AgentStep,
  AgentWorkflow,
  Agent,
  ConditionStep,
  CustomStep,
  Provider,
} from "@deskcreate/agentcraft";
import { z } from "zod";

const InputSchema = z.object({ lang: z.string(), text: z.string() });

const translator = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  system: "You are a professional translator.",
});

const workflow = AgentWorkflow.create({
  input: InputSchema,
  steps: [
    ConditionStep({
      id: "needs-translation",
      // Condition reads workflow input to decide which branch to take
      condition: (ctx) => {
        const { lang } = ctx.input as z.infer<typeof InputSchema>;
        return lang !== "en"; // only translate if not English
      },

      // ifTrue — runs when condition returns true
      ifTrue: AgentStep({
        id: "translate",
        agent: translator,
        prompt: (ctx) => {
          const { lang, text } = ctx.input as z.infer<typeof InputSchema>;
          return `Translate this text to English from ${lang}:\n\n${text}`;
        },
      }),

      // ifFalse — runs when condition returns false
      ifFalse: CustomStep({
        id: "pass-through",
        run: (ctx) => (ctx.input as z.infer<typeof InputSchema>).text,
      }),
    }),
  ],
});

// Will run the translate branch
const r1 = await workflow.run({
  input: { lang: "fr", text: "Bonjour le monde" },
});

// Will run the pass-through branch
const r2 = await workflow.run({ input: { lang: "en", text: "Hello world" } });
```

**Chaining conditions** — use the output of a previous step to branch:

```ts
ConditionStep({
  id: "quality-gate",
  condition: (ctx) => {
    // Read the output of a prior AgentStep with responseSchema
    const review = ctx.steps["review"]?.output as { approved: boolean };
    return review?.approved === true;
  },
  ifTrue: CustomStep({
    id: "publish",
    run: async (ctx) => {
      await ctx.store?.put("Draft", { status: "published" });
      return "published";
    },
  }),
  ifFalse: CustomStep({
    id: "revise",
    run: async (ctx) => {
      await ctx.store?.put("Draft", { status: "needs-revision" });
      return "needs-revision";
    },
  }),
}),
```

**`ConditionStep` config fields:**

| Field       | Required | Default | Purpose                                                                  |
| ----------- | -------- | ------- | ------------------------------------------------------------------------ |
| `id`        | No       | Auto    | Step identifier.                                                         |
| `condition` | Yes      | None    | `(ctx) => boolean` — evaluated at runtime.                               |
| `ifTrue`    | No       | None    | `WorkflowStep` or `WorkflowStep[]` — executed when condition is `true`.  |
| `ifFalse`   | No       | None    | `WorkflowStep` or `WorkflowStep[]` — executed when condition is `false`. |

---

### `ParallelStep` — Fan-Out Concurrent Steps

Runs multiple child steps concurrently using `Promise.allSettled`. Each child's output is keyed by its `stepId` in `ctx.steps`. When `failFast` is `true` (the default), the parallel step throws if any child fails.

```ts
import {
  AgentStep,
  AgentWorkflow,
  Agent,
  CustomStep,
  ParallelStep,
  Provider,
} from "@deskcreate/agentcraft";
import { z } from "zod";

const researcher = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  system: "Research and summarize accurately.",
});

const workflow = AgentWorkflow.create({
  input: z.object({ product: z.string() }),
  steps: [
    // Fan out three research tasks — all run at the same time
    ParallelStep({
      id: "research",
      steps: [
        AgentStep({
          id: "competitors",
          agent: researcher,
          prompt: (ctx) =>
            `List the top 3 competitors of ${(ctx.input as { product: string }).product}.`,
        }),
        AgentStep({
          id: "pricing",
          agent: researcher,
          prompt: (ctx) =>
            `What is the typical pricing model for ${(ctx.input as { product: string }).product}?`,
        }),
        AgentStep({
          id: "trends",
          agent: researcher,
          prompt: (ctx) =>
            `What are the current market trends relevant to ${(ctx.input as { product: string }).product}?`,
        }),
      ],
      failFast: true, // default — throw if any child step fails
    }),

    // After all three complete, synthesize the results
    AgentStep({
      id: "synthesize",
      agent: researcher,
      prompt: (ctx) => {
        // Read each parallel step's output by its id
        const competitors = ctx.steps["competitors"]?.output;
        const pricing = ctx.steps["pricing"]?.output;
        const trends = ctx.steps["trends"]?.output;
        return `Based on this research, write a competitive brief:\n\nCompetitors: ${competitors}\n\nPricing: ${pricing}\n\nTrends: ${trends}`;
      },
    }),
  ],
});

const result = await workflow.run({ input: { product: "AgentCraft" } });
console.log(result.steps.find((s) => s.stepId === "synthesize")?.output);
```

**Tolerating partial failures** — set `failFast: false` to continue even if some children fail:

```ts
ParallelStep({
  id: "optional-enrichments",
  failFast: false, // continue even if some children fail
  steps: [
    AgentStep({ id: "seo", agent, prompt: "Run an SEO audit." }),
    AgentStep({ id: "readability", agent, prompt: "Score the readability." }),
    AgentStep({ id: "tone", agent, prompt: "Assess the tone." }),
  ],
}),
```

**`ParallelStep` config fields:**

| Field      | Required | Default | Purpose                                                                 |
| ---------- | -------- | ------- | ----------------------------------------------------------------------- |
| `id`       | No       | Auto    | Step identifier.                                                        |
| `steps`    | Yes      | None    | `WorkflowStep[]` — all run concurrently.                                |
| `failFast` | No       | `true`  | Throw if any child fails. Set `false` to continue with partial results. |

---

### `CustomStep` — Arbitrary Application Logic

Runs any async function. Use it for direct database calls, sending notifications, transforming data, or any logic that doesn't need an agent.

```ts
import {
  AgentStep,
  AgentWorkflow,
  Agent,
  CustomStep,
  FileArtifactStore,
  AgentWorkspace,
  Provider,
} from "@deskcreate/agentcraft";

const writer = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const workflow = AgentWorkflow.create({
  workspace: AgentWorkspace.create({
    store: FileArtifactStore({ root: ".artifacts" }),
  }),
  steps: [
    AgentStep({
      id: "draft",
      agent: writer,
      prompt: "Write a 200-word product update for users.",
    }),

    // Transform the draft — no agent needed
    CustomStep({
      id: "format",
      run: (ctx) => {
        const raw = ctx.steps["draft"]?.output as string;
        // Add metadata envelope around the draft
        return {
          body: raw,
          wordCount: raw.split(" ").length,
          createdAt: new Date().toISOString(),
        };
      },
    }),

    // Persist to artifact store — also no agent needed
    CustomStep({
      id: "persist",
      run: async (ctx) => {
        const formatted = ctx.steps["format"]?.output as { body: string };
        const id = await ctx.store?.put("Draft", {
          ...formatted,
          status: "draft",
        });
        return { id };
      },
    }),

    // Notify — arbitrary async logic
    CustomStep({
      id: "notify",
      run: async (ctx) => {
        const { id } = ctx.steps["persist"]?.output as { id: string };
        // await slackClient.post(`#content-team`, `New draft saved: ${id}`);
        console.log(`Draft ${id} is ready for review.`);
        return { notified: true };
      },
    }),
  ],
});

const result = await workflow.run({ input: {} });
console.log(result.status);
```

**With retry** — retry the logic up to N times with an optional delay:

```ts
CustomStep({
  id: "send-webhook",
  retry: { attempts: 3, delayMs: 2000 }, // 3 attempts, 2s between each
  run: async (ctx) => {
    const draft = ctx.steps["draft"]?.output as string;
    await fetch("https://hooks.example.com/content", {
      method: "POST",
      body: JSON.stringify({ content: draft }),
    });
    return { sent: true };
  },
}),
```

**`CustomStep` config fields:**

| Field   | Required | Default | Purpose                                                        |
| ------- | -------- | ------- | -------------------------------------------------------------- |
| `id`    | No       | Auto    | Step identifier.                                               |
| `run`   | Yes      | None    | `async (ctx) => unknown` — return value becomes `step.output`. |
| `retry` | No       | None    | `{ attempts, delayMs? }` — retry on throw.                     |

---

## Workflow Context

Every step receives `ctx` — the shared state object for the run.

| Field           | Type                                   | Purpose                                                              |
| --------------- | -------------------------------------- | -------------------------------------------------------------------- |
| `ctx.input`     | Validated input (from your Zod schema) | The typed workflow input passed to `workflow.run()`.                 |
| `ctx.steps`     | `Record<string, WorkflowStepResult>`   | All previously completed step results, keyed by `stepId`.            |
| `ctx.workspace` | `AgentWorkspaceInstance`               | Shared cache, policy, adapters, and events.                          |
| `ctx.store`     | `ArtifactStore \| undefined`           | Shorthand for `ctx.workspace.store`. `undefined` if not wired.       |
| `ctx.runId`     | `string`                               | This run's unique ID (also the persisted `WorkflowRun` artifact ID). |

Reading a previous step's output:

```ts
// Access output of step with id "draft"
const draft = ctx.steps["draft"]?.output as string;

// Always guard — the step might not have run yet or might have failed
if (draft) {
  // use it
}
```

## Step Callbacks and Observability

Use `onStepComplete` and `onStepError` for cross-cutting concerns like logging, metrics, or alerting without modifying individual steps.

```ts
import {
  AgentStep,
  AgentWorkflow,
  Agent,
  Provider,
} from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const workflow = AgentWorkflow.create({
  steps: [
    AgentStep({ id: "step-a", agent, prompt: "Task A." }),
    AgentStep({ id: "step-b", agent, prompt: "Task B." }),
  ],

  // Called after every successful step
  onStepComplete: (stepId, output, ctx) => {
    console.log(`[✓] ${stepId} completed (runId: ${ctx.runId})`);
    console.log(`    output: ${JSON.stringify(output).slice(0, 80)}`);
  },

  // Called after any step that throws
  onStepError: (stepId, error, ctx) => {
    console.error(`[✗] ${stepId} failed: ${error.message}`);
    // Could send to error tracking: Sentry.captureException(error)
  },
});

const result = await workflow.run({ input: {} });
```

## Resumability

When `workspace.store` is configured, `workflow.run()` writes a `WorkflowRun` artifact after each step. If the run fails, `workflow.resume(runArtifactId)` skips all already-completed steps and continues from the first incomplete one.

```ts
import {
  AgentStep,
  AgentWorkflow,
  Agent,
  AgentWorkspace,
  CustomStep,
  Provider,
  SQLiteArtifactStore,
} from "@deskcreate/agentcraft";

const writer = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// SQLite store keeps run history between process restarts
const workspace = AgentWorkspace.create({
  store: SQLiteArtifactStore({ dbPath: ".agentcraft/runs.db" }),
});

const workflow = AgentWorkflow.create({
  id: "publish-pipeline",
  workspace,
  steps: [
    AgentStep({
      id: "draft",
      agent: writer,
      prompt: "Write a product update.",
    }),
    AgentStep({
      id: "review",
      agent: writer,
      prompt: (ctx) => `Review this draft:\n\n${ctx.steps["draft"]?.output}`,
    }),
    CustomStep({
      id: "publish",
      run: async (ctx) => {
        // Simulate a step that might fail (e.g. external API)
        await publishToApi(ctx.steps["review"]?.output as string);
        return { published: true };
      },
    }),
  ],
});

// First attempt
let result = await workflow.run({ input: {} });

if (result.status === "failed") {
  // Find the failed run from the store
  const failedRuns = await workspace.store!.query("WorkflowRun", {
    status: "failed",
  });

  if (failedRuns.length > 0) {
    const failedRun = failedRuns[0] as { id: string };
    console.log(`Resuming from run ${failedRun.id}...`);

    // Resume — skips "draft" and "review" if they completed, retries "publish"
    result = await workflow.resume(failedRun.id);
    console.log(`Resume result: ${result.status}`);
  }
}
```

## Workflow Inspection

`workflow.inspect()` returns the static graph — useful for debugging or rendering a step diagram.

```ts
const plan = workflow.inspect();
console.log(`Workflow: ${plan.workflowId}`);
for (const step of plan.steps) {
  console.log(`  [${step.type}] ${step.stepId}`);
}
// Output:
// Workflow: publish-pipeline
//   [agent] draft
//   [agent] review
//   [custom] publish
```

## Full Pipeline Example

A complete research-to-publish pipeline combining all step types.

```ts
import {
  Agent,
  AgentStep,
  AgentWorkflow,
  AgentWorkspace,
  ApprovalStep,
  ConditionStep,
  CustomStep,
  FileArtifactStore,
  ParallelStep,
  Provider,
  ToolStep,
} from "@deskcreate/agentcraft";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";
import { z } from "zod";

const InputSchema = z.object({
  topic: z.string(),
  publish: z.boolean().default(false),
});

const searchAdapter = TavilySearchAdapter.connect({
  apiKey: process.env.TAVILY_API_KEY!,
});
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const workflow = AgentWorkflow.create({
  id: "research-publish",
  input: InputSchema,
  workspace: AgentWorkspace.create({
    store: FileArtifactStore({ root: ".artifacts" }),
  }),

  onStepComplete: (stepId) => console.log(`✓ ${stepId}`),
  onStepError: (stepId, err) => console.error(`✗ ${stepId}: ${err.message}`),

  steps: [
    // 1. Direct tool call — no agent overhead for a simple search
    ToolStep({
      id: "search",
      adapter: searchAdapter,
      toolName: "web_search",
      args: (ctx) => ({
        query: (ctx.input as z.infer<typeof InputSchema>).topic,
        max_results: 5,
      }),
    }),

    // 2. Fan-out two analysis tasks in parallel
    ParallelStep({
      id: "analysis",
      steps: [
        AgentStep({
          id: "summary",
          agent,
          prompt: (ctx) =>
            `Summarize these search results:\n\n${JSON.stringify(ctx.steps["search"]?.output)}`,
        }),
        AgentStep({
          id: "key-points",
          agent,
          prompt: (ctx) =>
            `Extract 5 key takeaways from:\n\n${JSON.stringify(ctx.steps["search"]?.output)}`,
        }),
      ],
    }),

    // 3. Synthesize the parallel outputs into a draft
    AgentStep({
      id: "draft",
      agent,
      prompt: (ctx) =>
        [
          "Write a 400-word article using the following research:",
          `Summary: ${ctx.steps["summary"]?.output}`,
          `Key points: ${ctx.steps["key-points"]?.output}`,
        ].join("\n\n"),
      retry: { attempts: 2 },
    }),

    // 4. Only run the approval + publish steps if publish flag is true
    ConditionStep({
      id: "should-publish",
      condition: (ctx) => (ctx.input as z.infer<typeof InputSchema>).publish,

      ifTrue: ApprovalStep({
        id: "editorial-gate",
        description: "Editorial director approval before publishing",
        approve: async (ctx) => {
          const draft = ctx.steps["draft"]?.output as string;
          // Auto-approve drafts under 500 words; block longer ones
          return draft.split(" ").length <= 500;
        },
        onApproved: async (ctx) => {
          await ctx.store?.put("Draft", {
            body: ctx.steps["draft"]?.output,
            status: "published",
          });
        },
        onRejected: async (_ctx, reason) => {
          console.warn(`Not published: ${reason}`);
        },
      }),

      // If publish is false, just save as a draft
      ifFalse: CustomStep({
        id: "save-draft",
        run: async (ctx) => {
          const id = await ctx.store?.put("Draft", {
            body: ctx.steps["draft"]?.output,
            status: "draft",
          });
          return { saved: true, id };
        },
      }),
    }),
  ],
});

// Run with publish enabled
const result = await workflow.run({
  input: { topic: "AI agent caching", publish: true },
});
console.log(`Status: ${result.status}`);
console.log(`Total cost: $${result.totalCost.toFixed(4)}`);
console.log(`Duration: ${result.durationMs}ms`);
```

## Related

- [Agent Team](./agent-team.md)
- [Agent Workspace](./agent-workspace.md)
- [Agent Pool](./agent-pool.md)
- [ArtifactStore](../persistence/artifact-store.md)
- [Approvals](../tools/approvals.md)
- [Workflow Config](../configuration/workflow-config.md)
