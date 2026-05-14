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
} from "agentcraft";
import { TavilySearchAdapter } from "agentcraft/adapters";
import { z } from "zod";

type ContentInput = {
  topic: string;
  audience: "developers" | "executives" | "general";
  targetLength: number;
};

const tavilyAdapter = TavilySearchAdapter.connect({
  apiKey: process.env.TAVILY_API_KEY!,
});

const workspace = AgentWorkspace.create({
  store: FileArtifactStore({ root: ".artifacts" }),
  adapters: [tavilyAdapter],
});

workspace.events.on("workflow.step.started", ({ stepId }) => {
  console.log(`Step starting: ${stepId}`);
});
workspace.events.on("workflow.step.completed", ({ stepId, status }) => {
  console.log(`Step done: ${stepId} [${status}]`);
});

const researcher = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});
const writer = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const contentWorkflow = AgentWorkflow.create({
  id: "content-pipeline",
  workspace,
  input: z.object({
    topic: z.string(),
    audience: z.enum(["developers", "executives", "general"]),
    targetLength: z.number().int().min(500).default(1200),
  }),
  steps: [
    ParallelStep({
      id: "research",
      steps: [
        AgentStep({
          id: "serp",
          agent: researcher,
          prompt: (ctx) => {
            const input = ctx.input as ContentInput;
            return `SERP analysis for "${input.topic}" targeting ${input.audience}.`;
          },
        }),
        AgentStep({
          id: "competitor",
          agent: researcher,
          prompt: (ctx) => {
            const input = ctx.input as ContentInput;
            return `Competitor content gaps for "${input.topic}".`;
          },
        }),
      ],
    }),
    ConditionStep({
      id: "format-branch",
      condition: (ctx) => (ctx.input as ContentInput).audience === "executives",
      ifTrue: AgentStep({
        id: "exec-brief",
        agent: writer,
        prompt: (ctx) => {
          const input = ctx.input as ContentInput;
          return `Write a 300-word executive brief on "${input.topic}". Research: ${JSON.stringify(ctx.steps.research?.output)}`;
        },
      }),
      ifFalse: AgentStep({
        id: "full-draft",
        agent: writer,
        prompt: (ctx) => {
          const input = ctx.input as ContentInput;
          return (
            `Write a ${input.targetLength}-word article for ${input.audience} on "${input.topic}". ` +
            `SERP: ${JSON.stringify(ctx.steps.serp?.output)}. ` +
            `Competitor gaps: ${JSON.stringify(ctx.steps.competitor?.output)}`
          );
        },
        retry: { attempts: 2, delayMs: 1000 },
      }),
    }),
    ApprovalStep({
      id: "editorial-gate",
      description: "Editorial review before persisting the draft",
      approve: async (ctx) => {
        const output = ctx.steps["exec-brief"] ?? ctx.steps["full-draft"];
        return typeof output?.output === "string" && output.output.length > 100;
      },
      onApproved: async (ctx) => {
        if (!ctx.store) throw new Error("Artifact store is required");
        const input = ctx.input as ContentInput;
        const body =
          ctx.steps["exec-brief"]?.output ?? ctx.steps["full-draft"]?.output;
        const draftId = await ctx.store.put("Draft", {
          body,
          topic: input.topic,
          status: "approved",
        });
        await ctx.store.put("PublishingStatus", {
          artifactRef: draftId,
          channel: "blog",
          stage: "approved",
        });
      },
    }),
    CustomStep({
      id: "metrics",
      run: async (ctx) => {
        const drafts = await ctx.store?.query("Draft", { status: "approved" });
        return { approvedCount: drafts?.length ?? 0, runId: ctx.runId };
      },
    }),
  ],
});

const result = await contentWorkflow.run({
  input: {
    topic: "AI agents in production",
    audience: "developers",
    targetLength: 1200,
  },
});

console.log("Workflow status:", result.status);
console.log(
  "Steps completed:",
  result.steps.filter((step) => step.status === "completed").length,
);
console.log("Total duration:", result.durationMs, "ms");

if (result.status === "failed" && workspace.store) {
  const failedRuns = await workspace.store.query("WorkflowRun", {
    status: "failed",
  });
  if (failedRuns.length > 0) {
    const runArtifact = failedRuns[0] as { id: string };
    const resumed = await contentWorkflow.resume(runArtifact.id);
    console.log("Resumed workflow status:", resumed.status);
  }
}
