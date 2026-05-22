# AgentReports

Generate structured markdown and JSON reports from agent runs.

## Overview

`AgentReports` provides a trace collector that captures all spans during a run and can produce markdown reports, JSON artifacts, and deterministic replay snapshots.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { AgentReports } from "@deskcreate/agentcraft";

const collector = AgentReports.traceCollector();

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Summarize the benefits of agent caching.",
  trace: collector,
});

console.log(collector.spans()); // all captured spans
```

## `AgentReports.traceCollector()`

Creates a `TraceCollector` instance. Pass it to `agent.run({ trace: collector })` to start capturing.

```ts
const collector = AgentReports.traceCollector();
```

## Accessing Spans

```ts
const spans = collector.spans();

for (const span of spans) {
  console.log(`${span.kind} — ${span.name} — ${span.durationMs}ms`);
}
```

Each span has:

| Field | Type | Description |
| --- | --- | --- |
| `spanId` | `string` | Unique identifier for this span. |
| `name` | `string` | Human-readable span name. |
| `kind` | `string` | Span kind: `llm`, `tool`, `cache`, `skill`, `run`, etc. |
| `startedAt` | `number` | Unix ms timestamp. |
| `status` | `'ok' \| 'error'` | Whether this span completed successfully. |
| `durationMs` | `number` | How long the span took. |

## Replay Fixture

Produce a deterministic replay snapshot from a live run:

```ts
const fixture = collector.replayFixture();

// Save for later replay in tests or debugging
await fs.writeFile("fixtures/run-snapshot.json", JSON.stringify(fixture, null, 2));
```

The fixture captures all LLM responses and tool results, enabling exact replay without API calls.

## Markdown Report

Format run results as a readable report artifact:

```ts
import { AgentReports } from "@deskcreate/agentcraft";

const report = AgentReports.markdown({
  response,
  spans: collector.spans(),
  title: "Agent Run Report",
});

console.log(report);
```

## `WorkflowRunArtifact`

The shape of a persisted workflow run report:

```ts
interface WorkflowRunArtifact {
  runId: string;
  status: "completed" | "partial" | "failed";
  steps: Array<{
    id: string;
    status: string;
    durationMs: number;
    cost: number;
  }>;
  totalCost: number;
  durationMs: number;
  spans: Span[];
  generatedAt: string;
}
```

## Saving to ArtifactStore

Persist reports for audit trails and stakeholder review:

```ts
import { FileArtifactStore } from "@deskcreate/agentcraft";

const store = new FileArtifactStore({ root: ".agentcraft/reports" });

await store.put({
  type: "run-report",
  data: {
    runId: response.runId,
    content: response.content,
    cost: response.cost,
    spans: collector.spans(),
  },
});
```

## Use Cases

- **Run auditing** — persist full trace for compliance and review
- **Stakeholder reporting** — generate markdown summaries of agent activity
- **Debugging** — inspect span timings to identify slow tool calls
- **Regression baselines** — save replay fixtures for CI comparison

## Related

- [Observability & Tracing](../core/observability-replay.md)
- [Production Observability](./observability-reports.md)
- [Artifact Store](../persistence/artifact-store.md)
- [AgentEval](./agent-eval.md)
