# Agent Pool

`AgentPool` routes a request across multiple agents or providers. Use it when you want fallback, cheaper default routing, or a specialist model for harder prompts.

## Purpose

| Need              | AgentPool fit                          | Related page                                     | Example                                                   |
| ----------------- | -------------------------------------- | ------------------------------------------------ | --------------------------------------------------------- |
| Provider fallback | Try another provider when one fails    | [Models](../core/models-and-providers.md)        | [Provider cookbook](../examples-cookbook/provider.md)     |
| Cost control      | Prefer cheaper agents for simple work  | [Budgets](../core/budgets-cost.md)               | [Production cookbook](../examples-cookbook/production.md) |
| Specialization    | Route tasks to named agents            | [Agent Team](./agent-team.md)                    | [Examples](../examples.md)                                |
| Replay            | Test route decisions deterministically | [Observability](../core/observability-replay.md) | [Replay example](../examples.md)                          |

## Usage

```ts
import { Agent, AgentPool, Provider } from "agentcraft";

const fast = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});
const deep = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const pool = AgentPool.create([fast, deep], {
  strategy: "best-fit",
});

const result = await pool.run({
  prompt: "Compare these two release strategies and recommend one.",
});
```

## Configuration

| Option      | Required | Default         | Purpose                                      |
| ----------- | -------- | --------------- | -------------------------------------------- |
| `strategy`  | No       | Runtime default | Selects routing behavior.                    |
| `budget`    | No       | Agent default   | Caps route spend.                            |
| `criteria`  | No       | Undefined       | Adds model, capability, or cost preferences. |
| `traceSink` | No       | Undefined       | Records route decisions for review.          |

## Local Examples

Use pool routing with creator packs when research should be cheap but final writing should be stronger:

```ts
const researchAgent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(CreatorPacks.seo());
const writingAgent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
}).use(CreatorPacks.blog());

const pool = AgentPool.create([researchAgent, writingAgent], {
  strategy: "best-fit",
});
```

More variants: [orchestration cookbook](../examples-cookbook/orchestration.md).
