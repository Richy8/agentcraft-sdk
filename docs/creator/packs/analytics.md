# Analytics Workflows

Analytics is now split between marketing performance planning and data analytics. Use the pack that matches the decision you need to make.

## Coverage

| Need                          | Pack                                      | Representative Skills                                                                                                            |
| ----------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Digital marketing performance | `MarketingPacks.digitalMarketing()`       | `digital-funnel-audit`, `digital-attribution-review`, `digital-growth-experiment-planner`, `digital-marketing-performance-brief` |
| Campaign performance          | `MarketingPacks.campaign()`               | `campaign-performance-review`, `campaign-calendar`, `campaign-asset-planner`                                                     |
| Experiment readouts           | `DataAnalyticsPacks.experimentAnalysis()` | `experiment-design-review`, `ab-test-analysis`, `causality-risk-review`, `experiment-readout-writer`                             |
| Metric reporting              | `DataAnalyticsPacks.reporting()`          | `weekly-metric-summary`, `executive-data-brief`, `anomaly-investigation`, `cohort-analysis-brief`                                |

## Usage

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { AnalyticsAdapter } from "@deskcreate/agentcraft/adapters";
import {
  DataAnalyticsPacks,
  MarketingPacks,
} from "@deskcreate/agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
})
  .use(AnalyticsAdapter.connect())
  .use(MarketingPacks.digitalMarketing({ readOnlyByDefault: true }))
  .use(DataAnalyticsPacks.experimentAnalysis({ readOnlyByDefault: true }));

const response = await agent.run({
  prompt:
    "Review last month funnel performance, identify the riskiest attribution assumption, and propose one experiment with a decision rule.",
});
console.log(response.content);
```

See [Creator Analytics](../analytics.md) for persistence patterns.
