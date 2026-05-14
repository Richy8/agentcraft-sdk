# Analytics Pack

The analytics pack closes the loop after publishing. It helps interpret performance, propose experiments, and update future planning inputs.

## Coverage

| Stage           | Included skills        | Tools to attach                           | Purpose                                            |
| --------------- | ---------------------- | ----------------------------------------- | -------------------------------------------------- |
| Analysis        | `performance-analysis` | `AnalyticsAdapter`, `GoogleSheetsAdapter` | Read traffic, engagement, and conversion patterns. |
| Experimentation | `experiment-planner`   | `analytics`, `content-calendar`           | Plan tests with success metrics.                   |
| Strategy        | `seo-strategy`         | `seo`, `tavily`                           | Feed learnings back into topic choices.            |
| Calendar        | `content-calendar`     | `notion`, `google-sheets`                 | Turn decisions into an execution schedule.         |

## Usage

```ts
import { Agent, Provider } from "agentcraft";
import { AnalyticsAdapter } from "agentcraft/adapters";
import { CreatorPacks } from "agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(AnalyticsAdapter.connect())
  .use(CreatorPacks.analytics({ memory: true }));

const response = await agent.run({
  prompt:
    "Review last month performance and suggest three experiments for next month.",
});
console.log(response.content);
```

## Configuration

| Option          | Required | Default       | Purpose                                                       |
| --------------- | -------- | ------------- | ------------------------------------------------------------- |
| `memory`        | No       | `false`       | Stores learnings for future briefs.                           |
| `cache`         | No       | `false`       | Reuses slow analytics snapshots.                              |
| `budget`        | No       | Agent default | Bounds analysis scope.                                        |
| `toolSelection` | No       | `auto`        | Avoids unnecessary reads when data is included in the prompt. |

## Examples

Run analytics after publish QA:

```ts
agent
  .use(CreatorPacks.publishing())
  .use(CreatorPacks.analytics({ memory: true }));
```

See [Creator Analytics](../analytics.md) and the [production cookbook](../../examples-cookbook/production.md).
