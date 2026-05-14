# Pricing Model Guide

AgentCraft estimates cost from source-stamped model metadata.

Supported pricing dimensions:

- input and output tokens per million
- per-request fees
- cache read and cache write multipliers
- pricing tiers
- batch, flex, and priority modifiers
- tool and search fees
- Bedrock and Vertex-style region overrides

Use `Agent.estimateCost(model, params)` or `agent.estimateCost(params)` before a run. Run budgets can block calls before execution when estimated tokens or cost exceed limits.

Pricing is time-sensitive. Treat the catalog as estimator-grade metadata unless your application updates it against official provider pricing pages.

## Budget Config

Run budgets are configured with `budget` on `agent.run()` and can also be assigned per role in `AgentTeam` through `roleBudgets`.

| Field             | Required | Purpose                                                                                                                                            |
| ----------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `maxRuns`         | No       | Caps repeated runs in retry, team, and orchestration workflows.                                                                                    |
| `maxTokens`       | No       | Caps aggregate input and output tokens.                                                                                                            |
| `maxInputTokens`  | No       | Caps prompt/input token usage.                                                                                                                     |
| `maxOutputTokens` | No       | Caps completion/output token usage.                                                                                                                |
| `maxToolCalls`    | No       | Caps tool loops and runaway agent behavior.                                                                                                        |
| `maxCost`         | No       | Caps estimated spend using the model catalog and run usage.                                                                                        |
| `costOptions`     | No       | Adds estimator modifiers such as region, batch/flex/priority modes, cache behavior, tool fees, or search fees when catalog metadata supports them. |

## Cost Estimation Guidance

- Use `Agent.estimateCost(model, params)` before constructing a run plan when you already know the model.
- Use `agent.estimateCost(params)` when the agent has already been configured and you want a fast preflight estimate.
- Use budgets even when using local models. Local inference still has latency, compute, memory, and operational cost.
- Treat estimates as operational controls, not invoices. Provider pricing changes, regional pricing, cache behavior, and bundled search/tool fees can move independently from package releases.

For billing-grade accounting, store provider-returned usage, provider invoice metadata, and AgentCraft estimates together. The estimate helps control behavior; the provider bill remains the source of truth.
