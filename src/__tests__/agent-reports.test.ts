import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AgentReports } from "../agent/reports/index.js";
import { createAgentEventEmitter } from "../agent/events.js";
import type { AgentResponse } from "../agent/types.js";
import type { TraceSpan } from "../agent/observability.js";
import type { WorkflowResult } from "../agent/workflow/types.js";

describe("AgentReports", () => {
  it("builds markdown/json/html reports from an agent response", async () => {
    const response = agentResponse();
    const report = AgentReports.fromResponse(response, {
      title: "Unit Run",
      include: { fullOutput: true },
    });

    expect(report.title).toBe("Unit Run");
    expect(report.timeline).toHaveLength(1);

    const root = await mkdtemp(join(tmpdir(), "agentcraft-reports-"));
    try {
      const markdownPath = join(root, "run.md");
      const jsonPath = join(root, "run.json");
      const htmlPath = join(root, "run.html");

      await AgentReports.writeMarkdown(response, markdownPath, { title: "Run MD" });
      await AgentReports.writeJson(response, jsonPath);
      await AgentReports.writeHtml(response, htmlPath);

      expect(await readFile(markdownPath, "utf8")).toContain("Run MD");
      expect(JSON.parse(await readFile(jsonPath, "utf8"))).toMatchObject({
        kind: "agent",
      });
      expect(await readFile(htmlPath, "utf8")).toContain("<!doctype html>");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("redacts secrets and URL credentials", () => {
    const response = agentResponse({
      content:
        "redis://user:pass@cache.example.com:6379/0?token=secret postgres://u:p@db.example.com/app",
    });
    const report = AgentReports.fromResponse(response);
    const serialized = JSON.stringify(report);

    expect(serialized).not.toContain("pass@");
    expect(serialized).not.toContain("token=secret");
    expect(serialized).toContain("cache.example.com");
    expect(serialized).toContain("[REDACTED]");
  });

  it("collects spans through a trace sink", () => {
    const collector = AgentReports.traceCollector();
    const span: TraceSpan = {
      runId: "run_1",
      spanId: "span_1",
      name: "agent.run",
      kind: "agent",
      startedAt: "2026-05-17T00:00:00.000Z",
      status: "ok",
    };

    collector.onSpanStart?.(span);
    collector.onSpanEnd?.({
      ...span,
      endedAt: "2026-05-17T00:00:01.000Z",
    });

    const report = AgentReports.fromTrace(collector.spans());
    expect(report.timeline[0]).toMatchObject({
      name: "agent.run",
      durationMs: 1000,
    });
    expect(collector.replayFixture().runId).toBe("run_1");
  });

  it("builds a workflow report from workflow results", () => {
    const result: WorkflowResult = {
      runId: "workflow_1",
      status: "completed",
      input: { topic: "cache" },
      steps: [
        {
          stepId: "draft",
          status: "completed",
          durationMs: 12,
          output: "done",
        },
      ],
      totalCost: 0.01,
      durationMs: 12,
    };

    const report = AgentReports.fromWorkflow(result);
    expect(report.kind).toBe("workflow");
    expect(report.timeline[0]?.name).toBe("draft");
  });

  it("collects workspace events for approval and artifact report sections", () => {
    const events = createAgentEventEmitter();
    const collector = AgentReports.eventCollector(events);

    events.emit("approval.requested", {
      toolName: "notion_create_page",
      sideEffect: "write",
    });
    events.emit("approval.granted", { toolName: "notion_create_page" });
    events.emit("artifact.write", {
      type: "Draft",
      id: "draft-1",
      operation: "put",
    });

    const report = AgentReports.fromResponse(agentResponse(), {
      events: collector.events(),
    });

    expect(report.approvals).toMatchObject({ requested: 1, granted: 1 });
    expect(report.artifacts).toMatchObject({ writes: 1 });
    expect(report.timeline.some((item) => item.name === "approval.requested")).toBe(true);
  });
});

function agentResponse(overrides: Partial<AgentResponse> = {}): AgentResponse {
  return {
    content: "A concise cache report.",
    tokensUsed: { prompt: 10, completion: 5, total: 15 },
    cost: 0.0001,
    finishReason: "stop",
    model: "mock",
    provider: "mock",
    runId: "run_1",
    trace: [
      {
        runId: "run_1",
        spanId: "span_1",
        name: "agent.run",
        kind: "agent",
        startedAt: "2026-05-17T00:00:00.000Z",
        endedAt: "2026-05-17T00:00:01.000Z",
        status: "ok",
      },
    ],
    selection: {
      traitActivation: "auto",
      toolSelection: "auto",
      activeTraits: ["writing"],
      activationReasons: [],
      exposedTools: ["mock_tool"],
      executedToolCalls: 1,
    },
    cache: {
      hits: 1,
      misses: 1,
      writes: 1,
      bypassed: false,
      skippedUnsafe: 0,
      stale: 0,
      corrupt: 0,
      oversized: 0,
      toolCallsAvoided: 1,
      estimatedSavedTokens: 100,
      summary: {
        lookups: 2,
        hitRate: 0.5,
        missRate: 0.5,
        avoidedCallRate: 0.5,
        estimatedSavedTokens: 100,
        estimatedCostSaved: 0,
      },
    },
    ...overrides,
  };
}
