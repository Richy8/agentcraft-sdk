# Budget Config

`RunBudget` and `BudgetMode` type reference for `agent.run({ budget })`.

## `RunBudget` Fields

| Field                          | Type          | Default         | Description                                                                                      |
| ------------------------------ | ------------- | --------------- | ------------------------------------------------------------------------------------------------ |
| `maxCost`                      | `number`      | Unlimited       | Maximum estimated or actual model cost in USD for this run.                                      |
| `maxTokens`                    | `number`      | Unlimited       | Maximum total tokens (prompt + completion).                                                      |
| `maxInputTokens`               | `number`      | Unlimited       | Maximum estimated prompt/input tokens.                                                           |
| `maxOutputTokens`              | `number`      | Unlimited       | Maximum estimated completion/output tokens.                                                      |
| `maxToolCalls`                 | `number`      | Unlimited       | Maximum number of tool calls in this run.                                                        |
| `costOptions`                  | `CostOptions` | None            | Cost-estimation modifiers such as region, batch, priority, flex, tool calls, and searches.       |
| `cachePolicy.requireCachedFor` | `string[]`    | None            | Tool names that must resolve from cache instead of executing live.                               |
| `mode`                         | `BudgetMode`  | `'fail-closed'` | Budget posture: `'fail-closed'`, `'prefer-cache'`, `'downgrade-model'`, or `'request-approval'`. |

## `BudgetMode`

| Mode                 | Behavior                                                                                                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `'fail-closed'`      | Throws `QuotaExceededError` when the budget is exceeded. Default.                                                      |
| `'prefer-cache'`     | Signals that cached results should be preferred; pair with `cachePolicy.requireCachedFor` for strict cache-only tools. |
| `'downgrade-model'`  | Signals routing layers such as `AgentPool` to prefer cheaper models under pressure.                                    |
| `'request-approval'` | Signals that expensive work should go through an application approval path.                                            |

## Usage

### Cost Budget

```ts
const response = await agent.run({
  prompt: "Write a comprehensive guide.",
  budget: { maxCost: 0.05 },
});
```

### Token Budget

```ts
const response = await agent.run({
  prompt: "Summarize this document.",
  budget: {
    maxTokens: 4000,
    maxInputTokens: 2000,
    maxOutputTokens: 2000,
  },
});
```

### Tool Call Limit

```ts
const response = await agent.run({
  prompt: "Research this topic using the web.",
  budget: { maxToolCalls: 5 },
});
```

### Budget Mode

```ts
const response = await agent.run({
  prompt: "...",
  budget: {
    maxCost: 0.01,
    mode: "prefer-cache",
    cachePolicy: { requireCachedFor: ["fetch"] },
  },
});
```

## Pre-Flight Estimation

The runtime estimates cost before making the LLM call and checks against `maxCost`. Estimation uses `MODEL_CATALOG` pricing metadata. If the estimated cost exceeds the budget in `fail-closed` mode, `QuotaExceededError` is thrown before the API call is made.

```ts
try {
  const response = await agent.run({
    prompt: "A very long prompt...",
    budget: { maxCost: 0.0001 },
  });
} catch (err) {
  if (err instanceof QuotaExceededError) {
    // May have thrown at pre-flight, before any API call
  }
}
```

## `CostReport` Shape

The response includes cost and token data after every run:

```ts
const response = await agent.run({ prompt: "Hello" });

// Cost in USD
console.log(response.cost);

// Token breakdown
console.log(response.tokensUsed.prompt);
console.log(response.tokensUsed.completion);
console.log(response.tokensUsed.total);

// Per-provider model used
console.log(response.model);
```

## Workspace-Level Budget

A single budget can be shared across all agents in a team or workflow:

```ts
import { AgentWorkspace } from "@deskcreate/agentcraft";

const workspace = AgentWorkspace.create({
  budget: {
    maxCost: 0.5, // shared across all agents in the workspace
    mode: "fail-closed",
  },
});
```

## Related

- [Budgets & Cost reference](../core/budgets-cost.md)
- [Budgets & Cost examples](../examples-cookbook/budgets.md)
- [Run Config](./run-config.md)
- [Error Handling](../core/error-handling.md)
