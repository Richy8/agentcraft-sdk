# Budgets And Routing Config

Budgets bound spend and token usage. Routing lets applications pick different agents or models based on cost, speed, quality, or fallback needs.

## Run Budget

| Field             | Purpose                | What changes when you set it                                                           | Use case                                                       |
| ----------------- | ---------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `maxRuns`         | Caps repeated calls    | Prevents long loops in teams/retries.                                                  | [Agent team](../../examples.md#agent-team)                     |
| `maxTokens`       | Caps total tokens      | Blocks overly large prompts or outputs.                                                | [Cost budgeting](../../examples.md#cost-budgeting)             |
| `maxInputTokens`  | Caps prompt tokens     | Protects against large retrieval/browser/database payloads.                            | [Cost budgeting](../../examples.md#cost-budgeting)             |
| `maxOutputTokens` | Caps completion tokens | Controls answer length and spend.                                                      | [Cost budgeting](../../examples.md#cost-budgeting)             |
| `maxToolCalls`    | Caps tool loops        | Prevents runaway tool recursion.                                                       | [Streaming with tools](../../examples.md#streaming-with-tools) |
| `maxCost`         | Caps estimated spend   | Blocks calls before execution when estimates exceed budget.                            | [Cost budgeting](../../examples.md#cost-budgeting)             |
| `costOptions`     | Pricing modifiers      | Applies region, batch, flex, priority, search, or tool-call fees when metadata exists. | [Cost budgeting](../../examples.md#cost-budgeting)             |

## AgentPool Routing

See [agent-pool-routing.ts](../../examples.md#agent-pool-routing) for the explicit `AgentPool.create()` flow, and [provider-routing.ts](../../examples.md#provider-routing) for the shorter routing overview.

| Strategy      | What it optimizes         | Tradeoff                                      |
| ------------- | ------------------------- | --------------------------------------------- |
| `cost`        | Lowest estimated spend    | May choose lower quality/slower models.       |
| `speed`       | Lower latency             | May cost more or reduce quality.              |
| `quality`     | Stronger model output     | Usually higher cost.                          |
| `round-robin` | Distribution              | Not capability-aware.                         |
| `random`      | Simple spread             | Not deterministic.                            |
| `best-fit`    | Capabilities and criteria | Best for product routing with model metadata. |

Use routing when one model cannot satisfy every cost/latency/quality case. Use budgets when every model must stay within business limits.
