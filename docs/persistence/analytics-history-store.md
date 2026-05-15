# Analytics History Store

Analytics history stores performance snapshots and experiment outcomes so future creator workflows can learn from what happened after publishing.

## Purpose

| Data              | Used by                | Tool                                   | Related page                                    |
| ----------------- | ---------------------- | -------------------------------------- | ----------------------------------------------- |
| Traffic snapshots | `performance-analysis` | `AnalyticsAdapter`                     | [Analytics Pack](../creator/packs/analytics.md) |
| Experiment result | `experiment-planner`   | `FileSystemAnalyticsHistoryStore`      | [Creator Analytics](../creator/analytics.md)    |
| Content calendar  | `content-calendar`     | `GoogleSheetsAdapter`, `NotionAdapter` | [Adapters](../adapters/built-in.md)             |
| Decision notes    | Future briefs          | `CreatorMemoryStore`                   | [Memory Store](./creator-memory-store.md)       |

## Usage

```ts
import { Agent, FileSystemAnalyticsHistoryStore, Provider } from "agentcraft";
import { AnalyticsAdapter } from "agentcraft/adapters";
import { CreatorPacks } from "agentcraft/packs";

// Constructor takes a root directory path (created if missing)
const history = new FileSystemAnalyticsHistoryStore("./.agentcraft/analytics-history");

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(AnalyticsAdapter.connect({ historyStore: history }))
  .use(CreatorPacks.analytics({ memory: true }));

const response = await agent.run({
  prompt: "Review these post metrics and decide what we should publish next.",
});
console.log(response.content);
```

## Configuration

| Option          | Required       | Default       | Purpose                             |
| --------------- | -------------- | ------------- | ----------------------------------- |
| `filePath`      | For file store | None          | Durable analytics file.             |
| `cache`         | No             | `false`       | Reuses expensive snapshots.         |
| `budget`        | No             | Agent default | Bounds report generation.           |
| `toolSelection` | No             | `auto`        | Avoids unnecessary analytics reads. |

## Local Examples

Ask for decisions, not just metrics:

```ts
await agent.run({
  prompt: "Review these post metrics and decide what we should publish next.",
});
```

More variants: [production cookbook](../examples-cookbook/production.md).
