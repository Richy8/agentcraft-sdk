# Budgets And Cost

Budgets stop runaway work. Cost estimates help you choose models before a call.

## Quick Start

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Research and summarize three options.",
  budget: {
    maxToolCalls: 3,
    maxTokens: 2_000,
    maxCost: 0.05,
  },
});

console.log(response.cost, response.tokensUsed);
```

## Configuration

| Field                                 | Required | Default     | Purpose                                                 |
| ------------------------------------- | -------- | ----------- | ------------------------------------------------------- |
| `budget.maxToolCalls`                 | No       | No cap      | Limits exposed/called tools.                            |
| `budget.maxTokens`                    | No       | No run cap  | Caps token usage.                                       |
| `budget.maxCost`                      | No       | No cost cap | Blocks over-budget runs.                                |
| `budget.cachePolicy.requireCachedFor` | No       | None        | Tool names that must have a cache hit before execution. |
| `costOptions`                         | No       | None        | Region, cache, batch/flex, tool/search fee modifiers.   |

## Estimate Before Running

```ts
import { estimateRunCost, Provider } from "agentcraft";

const estimate = estimateRunCost({
  model: Provider.openai["gpt-4o-mini"],
  prompt: "Draft a short article.",
});

console.log(estimate.estimatedInputCost, estimate.estimatedOutputCost);
```

## More Examples

- [Cost budgeting](../examples.md#cost-budgeting)
- [AgentPool routing](../orchestration/agent-pool.md)
