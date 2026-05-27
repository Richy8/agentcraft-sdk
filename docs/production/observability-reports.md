# Observability Reports

`AgentReports` turns runs, teams, workflows, and trace spans into markdown, JSON, or static HTML artifacts. Use reports for CI artifacts, production debugging, support tickets, reviewer handoff, cost analysis, cache inspection, and tool-safety review.

Reports are built on the existing tracing and response metadata. They do not require a new telemetry stack.

## Quick Start

```ts
import { Agent, AgentReports, Provider } from "@deskcreate/agentcraft";

const traceCollector = AgentReports.traceCollector();

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Audit this release note for unsupported claims.",
  trace: traceCollector,
});

await AgentReports.writeMarkdown(response, "reports/runs/release-note.md");
await AgentReports.writeJson(response, "reports/runs/release-note.json");
await AgentReports.writeHtml(response, "reports/runs/release-note.html");
```

## What Reports Include

Reports can include:

- run identity, provider, model, status, and timestamps.
- token usage, cost, budget mode, and stale-pricing warnings.
- exposed tools and executed tool calls.
- cache hits, misses, writes, hit rate, avoided calls, and estimated saved tokens.
- workflow steps, team rounds, team traces, and trace timeline.
- errors, retry spans, and guardrail/tool failures when traces capture them.

Secrets and URL credentials are redacted by default.

## Trace Collector

Use `traceCollector()` when you want both live span capture and a report-friendly span array.

```ts
import { Agent, AgentReports, Provider } from "@deskcreate/agentcraft";

const collector = AgentReports.traceCollector();

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Run the production check.",
  trace: collector,
});

const spans = collector.spans();
const fixture = collector.replayFixture();

await AgentReports.writeJson(spans, "reports/traces/latest.json");
console.log(fixture.runId);
console.log(response.runId);
```

## Workspace Event Collector

Use `eventCollector()` when you also want cache, artifact, approval, tool, and workflow events in the same report.

```ts
import {
  Agent,
  AgentReports,
  AgentWorkspace,
  Provider,
} from "@deskcreate/agentcraft";

const workspace = AgentWorkspace.create();
const events = AgentReports.eventCollector(workspace.events);

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  workspace,
});

const response = await agent.run({
  prompt: "Create a draft package.",
  trace: true,
});

await AgentReports.writeMarkdown(response, "reports/runs/draft-package.md", {
  events: events.events(),
  include: {
    approvals: true,
    artifacts: true,
    cache: true,
  },
});
```

## Cache, Memory, Artifact, and Approval Report

Use one workspace event collector when a living system needs one report covering the full operational footprint.

```ts
import {
  Agent,
  AgentCache,
  AgentMemory,
  AgentReports,
  AgentWorkspace,
  ApprovalQueue,
  FileArtifactStore,
  Provider,
} from "@deskcreate/agentcraft";

const workspace = AgentWorkspace.create({
  cache: AgentCache.redis({
    url: process.env.REDIS_URL!,
    namespace: "content-system",
    locking: { enabled: true },
  }),
  memory: AgentMemory.local({
    root: ".agentcraft/memory",
    namespace: "content-system",
    writes: { requireApproval: false },
  }),
  store: FileArtifactStore({ root: ".agentcraft/artifacts" }),
  toolPolicy: {
    approvalQueue: ApprovalQueue.memory({
      defaultReviewer: "editor@example.com",
    }),
  },
});

const events = AgentReports.eventCollector(workspace.events);

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  workspace,
});

const response = await agent.run({
  prompt: "Prepare a publish-ready LinkedIn post package.",
  trace: true,
});

await AgentReports.writeMarkdown(response, "reports/runs/linkedin-package.md", {
  events: events.events(),
  include: {
    approvals: true,
    artifacts: true,
    cache: true,
    memory: true,
    toolCalls: true,
  },
});
```

## Dashboard-Friendly JSON

Use JSON output when another service will ingest run health, cost, trace, and policy signals.

```ts
const report = AgentReports.fromResponse(response, {
  events: events.events(),
  include: {
    fullOutput: false,
    outputPreview: true,
    traces: true,
    costs: true,
    cache: true,
    approvals: true,
  },
});

await AgentReports.writeJson(report, "reports/dashboard/latest-run.json");
```

## Workflow Report

```ts
import { AgentReports, AgentWorkflow } from "@deskcreate/agentcraft";

const workflow = AgentWorkflow.create({
  steps: [
    // Add AgentStep, ToolStep, ApprovalStep, or custom steps here.
  ],
});

const result = await workflow.run({ input: { topic: "cache warming" } });

await AgentReports.writeMarkdown(result, "reports/workflows/cache-warming.md", {
  title: "Cache Warming Workflow",
});
```

## Team Report

```ts
import { Agent, AgentReports, Provider } from "@deskcreate/agentcraft";
import { AgentTeam } from "@deskcreate/agentcraft/team";

const orchestrator = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const reviewer = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  system: "Review for unsupported claims and unclear reasoning.",
});

const team = AgentTeam.create({
  orchestrator,
  members: [{ role: "reviewer", agent: reviewer }],
});

const response = await team.run({
  prompt: "Research, draft, and review a product update.",
  trace: true,
});

await AgentReports.writeMarkdown(response, "reports/teams/product-update.md", {
  title: "Product Update Team Run",
});
```

## Redacted Support Report

Use a redacted markdown report when sharing run details with a teammate or support channel.

```ts
await AgentReports.writeMarkdown(response, "reports/support/redacted-run.md", {
  title: "Support Debug Report",
  redact: true,
  maxOutputChars: 1_500,
  include: {
    fullOutput: false,
    outputPreview: true,
    traces: true,
    cache: true,
    costs: true,
  },
});
```

URLs like `redis://user:password@host` and query secrets like `?token=...` are sanitized before report output.

## Related Pages

- [Observability and Replay](../core/observability-replay.md)
- [AgentEval](./agent-eval.md)
- [Tool Policy](../tools/tool-policy.md)
- [Approvals](../tools/approvals.md)
- [AgentCache](../persistence/agent-cache.md)
- [Artifact Store](../persistence/artifact-store.md)
- [Semantic Memory](../persistence/semantic-memory.md)
- [Production examples](../examples-cookbook/production.md)
