# Budget Config

`RunBudget` and `BudgetMode` type reference.

## `RunBudget` Fields

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `maxCostUsd` | `number` | Unlimited | Maximum cost in USD for this run. |
| `maxTotalTokens` | `number` | Unlimited | Maximum total tokens (prompt + completion). |
| `maxPromptTokens` | `number` | Unlimited | Maximum prompt tokens. |
| `maxCompletionTokens` | `number` | Unlimited | Maximum completion tokens. |
| `mode` | `BudgetMode` | `'hard'` | Whether to warn (`'soft'`) or throw (`'hard'`) on breach. |
| `maxToolCalls` | `number` | Unlimited | Maximum number of tool calls in this run. |

## `BudgetMode`

| Mode | Behavior |
| --- | --- |
| `'hard'` | Throws `QuotaExceededError` when the budget is exceeded. Default. |
| `'soft'` | Logs a warning but continues the run. |

## Usage

### Cost Budget

```ts
const response = await agent.run({
  prompt: "Write a comprehensive guide.",
  budget: { maxCostUsd: 0.05 },
});
```

### Token Budget

```ts
const response = await agent.run({
  prompt: "Summarize this document.",
  budget: {
    maxTotalTokens: 4000,
    maxPromptTokens: 2000,
    maxCompletionTokens: 2000,
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

### Soft Mode

```ts
const response = await agent.run({
  prompt: "...",
  budget: {
    maxCostUsd: 0.01,
    mode: "soft", // logs warning instead of throwing
  },
});
```

## Pre-Flight Estimation

The runtime estimates cost before making the LLM call and checks against `maxCostUsd`. Estimation uses `MODEL_CATALOG` pricing metadata. If the estimated cost exceeds the budget, `QuotaExceededError` is thrown before the API call is made.

```ts
try {
  const response = await agent.run({
    prompt: "A very long prompt...",
    budget: { maxCostUsd: 0.0001 },
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
import { AgentWorkspace } from "@deskcreate/agentcraft/team";

const workspace = AgentWorkspace.memory({
  budget: {
    maxCostUsd: 0.50,  // shared across all agents in the workspace
    mode: "hard",
  },
});
```

## Related

- [Budgets & Cost reference](../core/budgets-cost.md)
- [Budgets & Cost examples](../examples-cookbook/budgets.md)
- [Run Config](./run-config.md)
- [Error Handling](../core/error-handling.md)
