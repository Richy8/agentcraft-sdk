# Data & Analytics Domain Skills

The data-analytics domain provides 12 skills for experiment analysis, metric review, anomaly investigation, and dashboard insight writing. Use them to build data analyst agents, experiment readout generators, and metric health monitors.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "auto",
}).use(createSkillPackByName("data-analytics"));

const response = await agent.run({
  prompt: "/analyze-ab-test Analyze this A/B test result. Control: 3.2% conversion, 12,000 users. Variant: 3.7% conversion, 11,800 users. 14 days runtime.",
});
console.log(response.content);
```

## Skills

### Experiments

| Skill | Directive | Purpose |
| --- | --- | --- |
| `ab-test-analysis` | `/analyze-ab-test` | Statistically correct A/B test analysis with significance, power, and effect size |
| `experiment-design-review` | `/review-experiment-design` | Review an experiment design for statistical validity before launch |
| `experiment-readout-writer` | `/write-experiment-readout` | Write a complete, IC-ready experiment readout document |
| `cohort-analysis-brief` | `/brief-cohort-analysis` | Produce a cohort analysis brief with retention and behavioral patterns |

### Metrics

| Skill | Directive | Purpose |
| --- | --- | --- |
| `metric-definition-review` | `/review-metric-definitions` | Audit metric definitions for precision, measurability, and gaming risk |
| `weekly-metric-summary` | `/summarize-weekly-metrics` | Write a prioritized weekly metric summary with leading/lagging context |
| `executive-data-brief` | `/write-data-brief` | Produce a concise executive data brief surfacing what matters |
| `anomaly-investigation` | `/investigate-anomaly` | Structured metric anomaly investigation with hypotheses and evidence |

### Data Quality & Review

| Skill | Directive | Purpose |
| --- | --- | --- |
| `data-quality-review` | `/review-data-quality` | Structured assessment identifying data quality issues and impact |
| `causality-risk-review` | `/review-causality` | Audit analytics reports for causality vs. correlation errors |

### Dashboards

| Skill | Directive | Purpose |
| --- | --- | --- |
| `dashboard-requirements-writer` | `/write-dashboard-requirements` | Write structured dashboard requirements with metrics, slices, and owners |
| `dashboard-insight-writer` | `/write-insights` | Write narrative insight commentary for dashboard sections |

## Patterns

### Experiment Lifecycle Agent

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";

const analyticsAgent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "directive-only",
}).use(createSkillPackByName("data-analytics"));

// Pre-launch: review experiment design
const designReview = await analyticsAgent.run({
  prompt: `/review-experiment-design Review this experiment design:
  Hypothesis: Adding social proof to checkout increases conversion.
  Primary metric: Checkout conversion rate
  Secondary: AOV, time-to-purchase
  Sample size: 5,000 per variant
  Runtime: 14 days
  Traffic split: 50/50`,
});

// Post-launch: write readout
const readout = await analyticsAgent.run({
  prompt: `/write-experiment-readout Write the experiment readout.
  
  Results: Control 3.2% (n=5,100), Variant 3.8% (n=5,050), p=0.03, 14 days.
  Design review: ${designReview.content.slice(0, 400)}`,
});
```

### Metric Health Review

```ts
const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
}).use(createSkillPackByName("data-analytics"));

// Review metric definitions first
const metricReview = await agent.run({
  prompt: `/review-metric-definitions Review these metrics:
  - "Active user" = any login in 30 days
  - "Engaged user" = 3+ actions in a session
  - "Revenue" = invoiced amount (not collected)`,
});

// Then write weekly summary
const summary = await agent.run({
  prompt: `/summarize-weekly-metrics Write the weekly metric summary.
  
  WoW: DAU +4%, Revenue -2%, Churn 0.8% (prev 0.6%)
  Metric context: ${metricReview.content.slice(0, 300)}`,
});
```

### Anomaly Investigation

```ts
const investigation = await agent.run({
  prompt: `/investigate-anomaly Investigate this metric anomaly:
  
  Metric: Daily signups
  Expected: ~450/day
  Observed: 180/day (Tuesday)
  Context: No planned changes. Marketing spend flat. Conversion rate dropped 40%.`,
});

// If anomaly is from data quality issue, investigate further
const qualityCheck = await agent.run({
  prompt: `/review-data-quality Review our signup tracking pipeline for data quality issues.
  
  Anomaly finding: ${investigation.content.slice(0, 400)}`,
});
```

## Optional Adapters

| Adapter | Benefit |
| --- | --- |
| `FileSystemAdapter` | Load CSV exports, experiment configs, and metric definitions |
| `DatabaseAdapter` | Query metrics tables and experiment result stores directly |
| `FetchAdapter` | Fetch from analytics APIs (Amplitude, Mixpanel, Looker) |

## Related

- [Industry Domain Skills Overview](./overview.md)
- [Business Domain](./business.md)
- [Product Domain](./product.md)
