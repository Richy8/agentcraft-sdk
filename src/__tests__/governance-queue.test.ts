import { describe, expect, it } from "vitest";
import { ApprovalQueue } from "../agent/governance/index.js";
import { runToolWithPolicy } from "../agent/adapters/tool-policy.js";
import { tool } from "../agent/adapters/index.js";
import { AgentReports } from "../agent/reports/index.js";
import { createAgentEventEmitter } from "../agent/events.js";
import { AgentWorkflow, CustomStep } from "../agent/workflow/index.js";
import { AgentWorkspace } from "../agent/workspace.js";
import { MemoryArtifactStore } from "../artifact-store/index.js";

describe("ApprovalQueue", () => {
  it("queues, approves, and reuses approval for the same tool request", async () => {
    const queue = ApprovalQueue.memory({
      defaultReviewer: "editor@example.com",
      expiresInMs: 60_000,
      requireReason: true,
    });
    const writeTool = tool("write_page", {
      description: "Write a page.",
      sideEffect: "write",
      requiresConfirmation: true,
      params: { title: { type: "string", description: "Title" } },
      run: async ({ title }) => ({ title }),
    });

    await expect(
      runToolWithPolicy(writeTool, { title: "Draft" }, { approvalQueue: queue }),
    ).rejects.toMatchObject({
      context: { approvalStatus: "pending" },
    });

    const [pending] = await queue.list({ status: "pending" });
    expect(pending?.reviewer).toBe("editor@example.com");
    await queue.approve({
      id: pending!.id,
      reviewer: "editor@example.com",
      reason: "Looks safe.",
    });

    await expect(
      runToolWithPolicy(writeTool, { title: "Draft" }, { approvalQueue: queue }),
    ).resolves.toEqual({ title: "Draft" });
  });

  it("preserves inline approval callback behavior without a queue", async () => {
    const writeTool = tool("write_inline", {
      description: "Write inline.",
      sideEffect: "write",
      requiresConfirmation: true,
      params: {},
      run: async () => "ok",
    });

    await expect(
      runToolWithPolicy(writeTool, {}, { onApprovalRequired: async () => true }),
    ).resolves.toBe("ok");
  });

  it("supports artifact-store backed approval queues", async () => {
    const store = MemoryArtifactStore();
    const queue = ApprovalQueue.artifactStore(store);
    const request = await queue.requestApproval({
      tool: {
        name: "external_publish",
        description: "Publish externally.",
        parameters: { type: "object", properties: {}, required: [] },
        security: { sideEffect: "external", requiresConfirmation: true },
        execute: async () => "published",
      },
      args: { channel: "test" },
    });

    expect(request.approved).toBe(false);
    await queue.approve({ id: request.request.id });
    await expect(queue.get(request.request.id)).resolves.toMatchObject({
      status: "approved",
    });
  });

  it("denial prevents execution with an actionable approval status", async () => {
    const queue = ApprovalQueue.memory();
    const writeTool = tool("write_denied", {
      description: "Denied write.",
      sideEffect: "write",
      requiresConfirmation: true,
      params: {},
      run: async () => "should-not-run",
    });

    await expect(
      runToolWithPolicy(writeTool, {}, { approvalQueue: queue }),
    ).rejects.toMatchObject({ context: { approvalStatus: "pending" } });
    const [pending] = await queue.list({ status: "pending" });
    await queue.deny({ id: pending!.id, reason: "Unsafe destination." });

    await expect(
      runToolWithPolicy(writeTool, {}, { approvalQueue: queue }),
    ).rejects.toMatchObject({ context: { approvalStatus: "denied" } });
  });

  it("redacts queued argument previews", async () => {
    const queue = ApprovalQueue.memory();
    const request = await queue.requestApproval({
      tool: {
        name: "store_secret",
        description: "Store a secret.",
        parameters: { type: "object", properties: {}, required: [] },
        security: { sideEffect: "write", requiresConfirmation: true },
        execute: async () => "ok",
      },
      args: { apiKey: "sk-secret-value" },
    });

    expect(JSON.stringify(request.request.argsPreview)).not.toContain(
      "sk-secret-value",
    );
    expect(JSON.stringify(request.request.argsPreview)).toContain("[REDACTED]");
  });

  it("records queued approvals in report events", async () => {
    const events = createAgentEventEmitter();
    const collector = AgentReports.eventCollector(events);

    events.emit("approval.queued", {
      toolName: "write_page",
      requestId: "approval-1",
      reviewer: "editor@example.com",
    });
    events.emit("approval.expired", {
      toolName: "write_page",
      requestId: "approval-1",
    });

    const report = AgentReports.fromResponse(
      {
        content: "blocked",
        tokensUsed: { prompt: 1, completion: 1, total: 2 },
        cost: 0,
        finishReason: "stop",
        model: "mock",
        provider: "mock",
      },
      { events: collector.events() },
    );

    expect(report.approvals).toMatchObject({ expired: 1 });
    expect(report.timeline.some((item) => item.name === "approval.queued")).toBe(true);
  });

  it("can be used inside workflow steps for queued write previews", async () => {
    const queue = ApprovalQueue.memory();
    const writeTool = tool("write_workflow", {
      description: "Workflow write.",
      sideEffect: "write",
      requiresConfirmation: true,
      params: {},
      run: async () => "ok",
    });
    const workflow = AgentWorkflow.create({
      workspace: AgentWorkspace.create({
        toolPolicy: { approvalQueue: queue },
      }),
      steps: [
        CustomStep({
          id: "queued-write",
          run: async (ctx) =>
            runToolWithPolicy(writeTool, {}, ctx.workspace.toolPolicy),
        }),
      ],
    });

    const result = await workflow.run({ input: {} });
    expect(result.status).toBe("failed");
    expect(result.steps[0]?.error).toContain("queued for approval");
    expect(await queue.list({ status: "pending" })).toHaveLength(1);
  });
});
