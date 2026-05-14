# Routing And Budgets

Use this path when your product needs cost control, fallback, model routing, or quality/speed tradeoffs.

## Start With

- Example: [AgentPool Routing](../../examples.md#agent-pool-routing)
- Cost example: [Cost Budgeting](../../examples.md#cost-budgeting)
- Config: [Budgets And Routing](../config/budgets-and-routing.md)
- Guide: [Pricing Model](../pricing-model.md)
- API: [AgentPool](/api/classes/index.AgentPool.html), [estimateRunCost](/api/functions/index.estimateRunCost.html)

## Required Choices

| Config                      | Required      | Purpose                                                                  |
| --------------------------- | ------------- | ------------------------------------------------------------------------ |
| `AgentPool.strategy`        | Yes for pools | Values: `cost`, `speed`, `quality`, `round-robin`, `random`, `best-fit`. |
| `fallback`                  | Optional      | Agent used when the selected agent cannot complete the run.              |
| `fallbackMode`              | Optional      | Controls which error types trigger fallback.                             |
| `budget.maxCost`            | Optional      | Blocks runs whose estimate exceeds the allowed cost.                     |
| `budget.maxTokens`          | Optional      | Caps total token usage.                                                  |
| `downgradeOnBudgetPressure` | Optional      | Allows cheaper candidates when the preferred one is too expensive.       |

## Tradeoffs

Routing makes cost and reliability better, but it can create output variance across providers. Use structured output, deterministic tests, and replay fixtures for flows that require stable shape.

## Next Steps

Keep model pricing metadata fresh before using estimates for billing-grade workflows.
