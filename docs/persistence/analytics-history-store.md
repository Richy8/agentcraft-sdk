# Analytics History Store

`FileSystemAnalyticsHistoryStore` persists performance snapshots and experiment outcomes so future creator workflows can learn from what happened after publishing. It feeds the `AnalyticsAdapter` with structured history that skills like `digital-marketing-performance-brief`, `experiment-readout-writer`, and `weekly-metric-summary` can read and act on.

## How It Works

```txt
Agent run
  → AnalyticsAdapter exposes tools:
      save_performance_report  (write)
      save_experiment_plan     (write)
      save_experiment_result   (write)
      snapshot_analytics       (read)
      summarize_insights       (read)
  → FileSystemAnalyticsHistoryStore persists to disk
  → Future runs read prior history → informed decisions
```

## Quick Start

```ts
import {
  Agent,
  FileSystemAnalyticsHistoryStore,
  Provider,
} from "@deskcreate/agentcraft";
import { AnalyticsAdapter } from "@deskcreate/agentcraft/adapters";

const history = new FileSystemAnalyticsHistoryStore(
  "./.agentcraft/analytics-history",
);

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
}).use(AnalyticsAdapter.connect({ historyStore: history }));

// First run: save performance data
await agent.run({
  prompt: "Save this week's post metrics. Top post: 'TypeScript Agents', 4.2K views, 8.1% CTR.",
});

// Later run: let history inform the next decision
const next = await agent.run({
  prompt: "/write-data-brief Based on the analytics history, what should we publish next week?",
});
console.log(next.content);
```

## Configuration

### `FileSystemAnalyticsHistoryStore(root)`

| Parameter | Type | Default | Purpose |
| --- | --- | --- | --- |
| `root` | `string` | `"content/analytics-history"` | Root directory for analytics data files. Created if missing. |

The store creates three sub-buckets under `root`:

- `performance/` — `PerformanceReport` artifacts (weekly summaries, traffic snapshots)
- `experiments/` — `ExperimentPlan` artifacts (A/B test plans)
- `results/` — `ExperimentResult` records (experiment outcomes and decisions)

### `AnalyticsAdapter.connect(options)`

| Option | Required | Default | Purpose |
| --- | --- | --- | --- |
| `historyStore` | Yes | None | The `FileSystemAnalyticsHistoryStore` instance to read and write |

## API

### Store Methods

| Method | Returns | Purpose |
| --- | --- | --- |
| `savePerformanceReport(report)` | `Promise<CreatorArtifact>` | Persist a weekly or campaign performance report |
| `saveExperimentPlan(plan)` | `Promise<CreatorArtifact>` | Persist an A/B experiment plan |
| `saveExperimentResult(result)` | `Promise<ExperimentResult>` | Save an experiment outcome with a decision |
| `snapshot()` | `Promise<AnalyticsHistorySnapshot>` | Load all stored reports, plans, and results |
| `summarizeInsights()` | `Promise<string[]>` | Extract recommendations and experiment decisions as bullet strings |

### `ExperimentResult` Fields

| Field | Type | Purpose |
| --- | --- | --- |
| `id` | `string` | Unique result identifier |
| `experimentPlanId` | `string` | Links back to the experiment plan |
| `metric` | `string` | The metric measured (e.g. `"CTR"`, `"conversion_rate"`) |
| `baseline` | `number` | Control group value |
| `variant` | `number` | Test group value |
| `source` | `string` | Where the data came from |
| `observedAt` | `string` | ISO timestamp (auto-set on save) |
| `decision` | `"ship" \| "iterate" \| "stop" \| "inconclusive"` | Outcome decision |

## Patterns

### Weekly Publishing Decision Agent

```ts
import {
  Agent,
  FileSystemAnalyticsHistoryStore,
  Provider,
} from "@deskcreate/agentcraft";
import { AnalyticsAdapter } from "@deskcreate/agentcraft/adapters";

const history = new FileSystemAnalyticsHistoryStore("./.agentcraft/analytics-history");

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
})
  .use(AnalyticsAdapter.connect({ historyStore: history }));

// Save this week's metrics
await agent.run({
  prompt: `Save this week's performance report.
  
  Data:
  - Blog: 12,400 sessions, top post "TypeScript generics", 4.2K views
  - LinkedIn: 320 clicks, 3.1% engagement rate  
  - Newsletter: 42% open rate, 11% CTR
  - Experiment: social proof on CTA, +14% conversion vs control`,
});

// Let history drive next week's content plan
const plan = await agent.run({
  prompt: "Review analytics history and recommend content strategy for next week.",
});
console.log(plan.content);
```

### Experiment Tracking Pipeline

```ts
// After running the experiment, save the result
await agent.run({
  prompt: `Save experiment result:
  Plan: "social-proof-cta-test"
  Metric: conversion_rate
  Baseline: 3.2%
  Variant: 3.7%
  Decision: ship (statistically significant at p=0.03)`,
});

// Later: inform a campaign decision with experiment history
const brief = await agent.run({
  prompt: `/write-experiment-readout Write a readout drawing from the experiment history.
  Include shipped tests and their conversion lift.`,
});
```

### Programmatic Store Access

Use the store API directly when you don't need an agent involved:

```ts
import { FileSystemAnalyticsHistoryStore } from "@deskcreate/agentcraft";

const history = new FileSystemAnalyticsHistoryStore("./.agentcraft/analytics-history");

// Save a performance report directly
await history.savePerformanceReport({
  id: "week-2025-20",
  type: "PerformanceReport",
  createdAt: new Date().toISOString(),
  // ... report fields
});

// Pull all insights
const insights = await history.summarizeInsights();
for (const insight of insights) {
  console.log("→", insight);
}

// Full snapshot for custom analysis
const snapshot = await history.snapshot();
console.log(`${snapshot.performanceReports.length} reports, ${snapshot.experimentResults.length} results`);
```

## Capabilities vs. Other Stores

| Store | Backend | History | Best for |
| --- | --- | --- | --- |
| `FileSystemAnalyticsHistoryStore` | JSON files | Per-bucket reads | Creator analytics, experiment tracking |
| `FileArtifactStore` | JSON files | Full revision history | General workflow artifacts |
| `SQLiteArtifactStore` | SQLite | Full revision history | High-volume, queryable artifact state |
| `AgentMemory` (Qdrant/Pinecone) | Vector DB | Semantic similarity search | Cross-run contextual recall |

## Related

- [Creator Analytics](../creator/analytics.md) — analytics-driven creator workflows
- [Semantic Memory](./semantic-memory.md) — cross-run factual memory
- [Creator Memory Store](./creator-memory-store.md) — brand voice and corpus memory
- [Artifact Store](./artifact-store.md) — general-purpose artifact persistence
