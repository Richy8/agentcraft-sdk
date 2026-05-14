import { mkdir, writeFile } from "node:fs/promises";
import { afterAll, describe, expect, it } from "vitest";
import { Agent } from "../../agent/agent.js";
import { tool, createAdapter } from "../../agent/adapters/types.js";
import { AgentCache } from "../../agent/cache.js";
import { Provider } from "../../agent/provider-catalog.js";
import { AgentWorkspace } from "../../agent/workspace.js";
import {
  AgentWorkflow,
  AgentStep,
  CustomStep,
} from "../../agent/workflow/index.js";
import { MemoryArtifactStore } from "../../artifact-store/memory.js";
import type { ArtifactStore } from "../../artifact-store/types.js";

const integrationEnabled = process.env.INTEGRATION_TESTS === "true";
const livingPrimitivesEnabled =
  process.env.AGENTCRAFT_LIVE_LIVING_PRIMITIVES === "true";
const openAiEnabled = parseProviderSelection(
  process.env.AGENTCRAFT_LIVE_PROVIDERS,
).has("openai");
const openAiKey = process.env.OPENAI_API_KEY;
const liveIt =
  integrationEnabled && livingPrimitivesEnabled && openAiEnabled && openAiKey
    ? it
    : it.skip;
const liveModel = process.env.AGENTCRAFT_LIVE_OPENAI_MODEL ?? "gpt-4o-mini";
const maxTokens = Number.parseInt(
  process.env.AGENTCRAFT_LIVE_LIVING_MAX_TOKENS ?? "96",
  10,
);
const reportEntries: string[] = [];

describe("live living-systems primitives smoke tests", () => {
  afterAll(async () => {
    if (reportEntries.length === 0) return;
    await mkdir("reports", { recursive: true });
    await writeFile(
      "reports/agentcraft-live-living-primitives-test-report.md",
      [
        "# AgentCraft Live Living Primitives Test Report",
        "",
        `Generated: ${new Date().toISOString()}`,
        "",
        `Model: openai:${liveModel}`,
        "",
        ...reportEntries,
      ].join("\n"),
      "utf8",
    );
  });

  liveIt(
    "runs a live workflow with workspace cache, adapters, events, and artifact writes",
    async () => {
      let toolExecutions = 0;
      const events = {
        cacheHits: 0,
        cacheMisses: 0,
        stepStarted: 0,
        stepCompleted: 0,
        artifactWrites: 0,
      };
      const store = MemoryArtifactStore();
      const probeTool = tool({
        name: "get_living_primitives_probe",
        description: "Return the exact living-primitives smoke-test payload.",
        security: { sideEffect: "read" },
        params: {},
        run: async () => {
          toolExecutions += 1;
          return {
            value: "living-primitives-ok",
            workspace: "cache+events+store",
            workflow: "agent-step+custom-step",
          };
        },
      });
      const probeAdapter = createAdapter({
        name: "living-primitives-live-probe",
        tools: [probeTool],
      });
      const workspace = AgentWorkspace.create({
        cache: AgentCache.memory({ defaultTtlMs: 60_000 }),
        store,
        adapters: [probeAdapter],
        toolPolicy: {
          readOnly: true,
          maxResultBytes: 25_000,
          redactSecrets: true,
        },
        budget: { maxToolCalls: 4, maxTokens: 1_200 },
      });
      workspace.events.on("cache.hit", () => {
        events.cacheHits += 1;
      });
      workspace.events.on("cache.miss", () => {
        events.cacheMisses += 1;
      });
      workspace.events.on("workflow.step.started", () => {
        events.stepStarted += 1;
      });
      workspace.events.on("workflow.step.completed", () => {
        events.stepCompleted += 1;
      });
      workspace.events.on("artifact.write", () => {
        events.artifactWrites += 1;
      });

      const agent = Agent.create({
        model:
          Provider.openai[liveModel as keyof typeof Provider.openai] ??
          `openai:${liveModel}`,
        apiKey: openAiKey!,
        temperature: 0,
        maxTokens,
        retry: {
          maxAttempts: 1,
          backoff: "fixed",
          initialDelay: 100,
          maxDelay: 100,
        },
      });
      const workflow = AgentWorkflow.create({
        workspace,
        steps: [
          AgentStep({
            id: "live-agent",
            agent,
            prompt:
              "Call get_living_primitives_probe exactly once. Reply with only the probe value and the words workspace, workflow, cache.",
          }),
          CustomStep({
            id: "persist-summary",
            run: async (ctx) => {
              const id = await ctx.store!.put("Draft", {
                type: "Draft",
                body: String(ctx.steps["live-agent"]?.output ?? ""),
                status: "draft",
              });
              return { id };
            },
          }),
        ],
      });

      const first = await workflow.run({ input: {} });
      const second = await workflow.run({ input: {} });
      const requiredCacheResponse = await agent.run({
        prompt:
          "Call get_living_primitives_probe exactly once. Reply with only the probe value.",
        temperature: 0,
        maxTokens,
        budget: {
          cachePolicy: {
            requireCachedFor: ["get_living_primitives_probe"],
          },
        },
      });
      const drafts = await store.query("Draft", { status: "draft" });
      const workflowRuns = await store.query("WorkflowRun", {
        status: "completed",
      });

      if (first.status !== "completed" || second.status !== "completed") {
        throw new Error(
          `Expected both workflow runs to complete. First: ${JSON.stringify(first.steps)} Second: ${JSON.stringify(second.steps)}`,
        );
      }

      expect(first.status).toBe("completed");
      expect(second.status).toBe("completed");
      expect(String(first.steps[0]?.output).toLowerCase()).toContain(
        "living-primitives-ok",
      );
      expect(String(second.steps[0]?.output).toLowerCase()).toContain(
        "living-primitives-ok",
      );
      expect(requiredCacheResponse.content.toLowerCase()).toContain(
        "living-primitives-ok",
      );
      expect(toolExecutions).toBe(1);
      expect(events.cacheMisses).toBeGreaterThanOrEqual(1);
      expect(events.cacheHits).toBeGreaterThanOrEqual(1);
      expect(events.stepStarted).toBeGreaterThanOrEqual(4);
      expect(events.stepCompleted).toBeGreaterThanOrEqual(4);
      expect(events.artifactWrites).toBeGreaterThanOrEqual(6);
      expect(drafts).toHaveLength(2);
      expect(workflowRuns.length).toBeGreaterThanOrEqual(2);

      reportEntries.push(
        renderReportSection({
          firstStatus: first.status,
          secondStatus: second.status,
          toolExecutions,
          events,
          drafts: drafts.length,
          workflowRuns: workflowRuns.length,
          firstOutput: String(first.steps[0]?.output ?? ""),
          secondOutput: String(second.steps[0]?.output ?? ""),
          requiredCacheOutput: requiredCacheResponse.content,
        }),
      );
    },
    90_000,
  );
});

function parseProviderSelection(value: string | undefined): Set<string> {
  if (!value || value.trim() === "") return new Set(["openai"]);
  const selected = value
    .split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean);
  return selected.includes("all") ? new Set(["openai"]) : new Set(selected);
}

function renderReportSection(input: {
  firstStatus: string;
  secondStatus: string;
  toolExecutions: number;
  events: {
    cacheHits: number;
    cacheMisses: number;
    stepStarted: number;
    stepCompleted: number;
    artifactWrites: number;
  };
  drafts: number;
  workflowRuns: number;
  firstOutput: string;
  secondOutput: string;
  requiredCacheOutput: string;
}): string {
  return [
    "## Workspace + Workflow + Cache + Artifact Store",
    "",
    "| Signal | Result |",
    "| --- | ---: |",
    `| First workflow status | ${input.firstStatus} |`,
    `| Second workflow status | ${input.secondStatus} |`,
    `| Real safe-tool executions | ${input.toolExecutions} |`,
    `| Cache misses | ${input.events.cacheMisses} |`,
    `| Cache hits | ${input.events.cacheHits} |`,
    `| Workflow step started events | ${input.events.stepStarted} |`,
    `| Workflow step completed events | ${input.events.stepCompleted} |`,
    `| Artifact write events | ${input.events.artifactWrites} |`,
    `| Draft artifacts stored | ${input.drafts} |`,
    `| Completed WorkflowRun artifacts | ${input.workflowRuns} |`,
    `| Required-cache live output contained probe value | ${
      input.requiredCacheOutput.toLowerCase().includes("living-primitives-ok")
        ? "yes"
        : "no"
    } |`,
    "",
    "First live output:",
    "",
    fenced(input.firstOutput),
    "",
    "Second live output:",
    "",
    fenced(input.secondOutput),
    "",
    "Required-cache live output:",
    "",
    fenced(input.requiredCacheOutput),
    "",
    "Result: the first live workflow executed the workspace adapter tool and wrote artifacts. The second live workflow used the cached tool result, emitted cache-hit telemetry, and persisted an independent workflow run. The final live run required a cached result for the probe tool and completed without another real tool execution.",
    "",
  ].join("\n");
}

function fenced(content: string): string {
  return ["```text", content.trim(), "```"].join("\n");
}
