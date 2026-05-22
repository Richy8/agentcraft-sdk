# Creator Analytics

Creator analytics stores performance reports, experiment plans, and experiment outcomes so future planning can use observed results.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { AnalyticsAdapter } from "@deskcreate/agentcraft/adapters";
import { MarketingPacks } from "@deskcreate/agentcraft/packs";
import { FileSystemAnalyticsHistoryStore } from "@deskcreate/agentcraft";

const analytics = new FileSystemAnalyticsHistoryStore(".agentcraft/analytics");

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(MarketingPacks.digitalMarketing())
  .use(AnalyticsAdapter.connect({ historyStore: analytics }));

const response = await agent.run({
  prompt: "Analyze content performance for the last 30 days.",
});
console.log(response.content);
```

## Config

| Field               | Default                     | Purpose                                      |
| ------------------- | --------------------------- | -------------------------------------------- |
| `root`              | `content/analytics-history` | Filesystem history root.                     |
| `PerformanceReport` | Schema-validated            | Stores observed metrics and recommendations. |
| `ExperimentPlan`    | Schema-validated            | Stores hypothesis and decision rule.         |
| `ExperimentResult`  | Adds `observedAt`           | Stores outcome and decision.                 |

## More

- [Analytics History Store](../persistence/analytics-history-store.md)
- [Analytics Workflows](./packs/analytics.md)
