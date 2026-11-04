# Governance Queue

`ApprovalQueue` turns write-capable tool approval into a durable workflow primitive. It keeps the existing `ToolPolicy` callback flow intact, but adds queue records, reviewer assignment, expiry, decision history, and reportable approval events.

Use it when a tool should prepare a write, publish, send, schedule, update, or external action, then wait for a reviewer before execution.

## Quick Start

```ts
import {
  Agent,
  AgentWorkspace,
  ApprovalQueue,
  Provider,
} from "@deskcreate/agentcraft";
import { tool } from "@deskcreate/agentcraft/adapters";

const approvals = ApprovalQueue.memory({
  defaultReviewer: "editor@example.com",
  expiresInMs: 30 * 60 * 1000,
  requireReason: true,
});

const createDraft = tool("create_draft", {
  description: "Create a draft in the CMS.",
  sideEffect: "write",
  requiresConfirmation: true,
  params: {
    title: { type: "string", description: "Draft title." },
  },
  run: async ({ title }) => ({ created: true, title }),
});

const workspace = AgentWorkspace.create({
  toolPolicy: {
    approvalQueue: approvals,
    allowSideEffects: false,
  },
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  workspace,
});

await agent.run({
  prompt: "Create a CMS draft for next week's LinkedIn post.",
  tools: [createDraft],
});
```

If the model calls `create_draft`, the request is queued and the tool does not execute yet.

## Approve and Retry

```ts
const [pending] = await approvals.list({ status: "pending" });

await approvals.approve({
  id: pending!.id,
  reviewer: "editor@example.com",
  reason: "Destination and fields are correct.",
});

// Re-run the same prompt/tool args; the matching approved request is reused.
await agent.run({
  prompt: "Create a CMS draft for next week's LinkedIn post.",
  tools: [createDraft],
});
```

## Artifact-Store Queue

Use an artifact store when approval records should survive process restarts.

```ts
import {
  ApprovalQueue,
  FileArtifactStore,
  AgentWorkspace,
} from "@deskcreate/agentcraft";

const store = FileArtifactStore({ root: ".agentcraft/approvals" });

const approvals = ApprovalQueue.artifactStore(store, {
  defaultReviewer: "ops@example.com",
  expiresInMs: 60 * 60 * 1000,
});

const workspace = AgentWorkspace.create({
  store,
  toolPolicy: { approvalQueue: approvals },
});
```

## Reviewer Assignment

```ts
const approvals = ApprovalQueue.memory({
  defaultReviewer: "ops@example.com",
  reviewerByTool: {
    publish_post: "editor@example.com",
    send_invoice: "finance@example.com",
  },
  reviewerByRisk: {
    destructive: "admin@example.com",
    external: "ops@example.com",
  },
});
```

## Risk Policy

```ts
const approvals = ApprovalQueue.memory({
  riskPolicy: {
    write: "queue",
    external: "queue",
    destructive: "block",
  },
});
```

## Deny a Risky Write

Use denial when the tool preview is not acceptable. The matching tool call remains blocked.

```ts
const [pending] = await approvals.list({ status: "pending" });

await approvals.deny({
  id: pending!.id,
  reviewer: "editor@example.com",
  reason: "The target channel is wrong.",
});

const denied = await approvals.get(pending!.id);
console.log(denied?.status); // "denied"
```

## Custom Queue Backed By Your App

Use `ApprovalQueue.custom()` when approvals live in Airtable, Notion, a SQL table, or your own reviewer UI.

```ts
import {
  ApprovalQueue,
  type ApprovalQueueController,
} from "@deskcreate/agentcraft";

const myApprovalService: ApprovalQueueController = ApprovalQueue.memory({
  defaultReviewer: "reviewer@example.com",
});

const approvals = ApprovalQueue.custom({
  async requestApproval(input) {
    return myApprovalService.requestApproval(input);
  },
  async approve(decision) {
    return myApprovalService.approve(decision);
  },
  async deny(decision) {
    return myApprovalService.deny(decision);
  },
  async get(id) {
    return myApprovalService.get(id);
  },
  async list(filter) {
    return myApprovalService.list(filter);
  },
  async expire(now) {
    return myApprovalService.expire?.(now) ?? 0;
  },
});
```

## Workflow Write Gate

Use this shape when a workflow prepares a write-capable step but a reviewer decides when it can execute.

```ts
import {
  AgentWorkflow,
  ApprovalQueue,
  CustomStep,
  AgentWorkspace,
} from "@deskcreate/agentcraft";

const approvals = ApprovalQueue.memory({
  defaultReviewer: "ops@example.com",
});

const workspace = AgentWorkspace.create({
  toolPolicy: { approvalQueue: approvals },
});

const workflow = AgentWorkflow.create({
  workspace,
  steps: [
    CustomStep({
      id: "prepare-publish",
      run: async (ctx) => {
        const pending = await approvals.list({ status: "pending" });
        return { approvalCount: pending.length, input: ctx.input };
      },
    }),
  ],
});

await workflow.run({ input: { title: "Launch post" } });
```

## Reports

Approval queue events are visible in [Observability Reports](./observability-reports.md) when you attach the workspace event collector.

```ts
import {
  Agent,
  AgentReports,
  AgentWorkspace,
  Provider,
} from "@deskcreate/agentcraft";
import { tool } from "@deskcreate/agentcraft/adapters";

const workspace = AgentWorkspace.create();
const createDraft = tool("create_draft", {
  description: "Prepare a draft for reviewer approval.",
  sideEffect: "write",
  requiresConfirmation: true,
  params: {
    title: { type: "string", description: "Draft title." },
  },
  run: async ({ title }) => ({ draftId: "draft_123", title }),
});

const events = AgentReports.eventCollector(workspace.events);

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  workspace,
});

const response = await agent.run({
  prompt: "Prepare a publish action.",
  tools: [createDraft],
});

await AgentReports.writeMarkdown(response, "reports/governance/publish.md", {
  events: events.events(),
  include: {
    approvals: true,
  },
});
```

## Related Pages

- [Approvals](../tools/approvals.md)
- [Tool Policy Config](../configuration/tool-policy-config.md)
- [Agent Workflow](../orchestration/agent-workflow.md)
- [Observability Reports](./observability-reports.md)
