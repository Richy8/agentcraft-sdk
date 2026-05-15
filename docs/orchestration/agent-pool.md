# Agent Pool

`AgentPool` routes a request across multiple agents using a selection strategy. Use it for provider fallback, cost optimization, or quality-aware routing.

## Quick Start

```ts
import { Agent, AgentPool, Provider } from "agentcraft";

const fast = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const smart = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const pool = AgentPool.create([fast, smart], {
  strategy: "quality", // always pick the highest-quality agent
});

const result = await pool.run({
  prompt: "Compare these two release strategies and recommend one.",
});
console.log(result.content);
```

## Configuration

`AgentPool.create(agents, options)` takes an array of agents and an `AgentPoolOptions` object.

| Option                      | Required | Default        | Purpose                                                              |
| --------------------------- | -------- | -------------- | -------------------------------------------------------------------- |
| `strategy`                  | Yes      | None           | How to pick the primary agent (see Strategies below).               |
| `fallback`                  | No       | None           | Fallback agent tried last if all primary agents fail.               |
| `fallbackMode`              | No       | `"first-error"`| When to attempt fallback after a failure (see Fallback Modes).      |
| `downgradeOnBudgetPressure` | No       | `false`        | Sort candidates by cost (cheapest first) when `budget.maxCost` is set.|
| `upgradeOnQualityFailure`   | No       | `false`        | Sort candidates by quality (highest first) when retrying after failure.|

### Strategies

| Strategy      | Behavior                                                            |
| ------------- | ------------------------------------------------------------------- |
| `"cost"`      | Pick the cheapest agent by estimated cost per token.               |
| `"speed"`     | Pick the fastest agent by speed score.                             |
| `"quality"`   | Pick the highest-quality agent by quality score.                   |
| `"round-robin"` | Rotate through agents in order, one per call.                    |
| `"random"`    | Pick a random agent on each call.                                  |
| `"best-fit"`  | Alias for `"quality"` — picks the highest-quality agent.          |

### Fallback Modes

`fallbackMode` controls when the pool tries the next candidate after a failure.

| Mode              | When it falls back                                    |
| ----------------- | ----------------------------------------------------- |
| `"first-error"`   | On any error from the primary agent (default).        |
| `"retryable"`     | Only on retryable `AgentCraftError`s.                 |
| `"non-retryable"` | Only on non-retryable `AgentCraftError`s.             |
| `"all"`           | Always try all candidates, regardless of error type. |
| `"none"`          | Never fall back — throw immediately on any error.    |

## Pool Methods

| Method              | Returns              | Purpose                                            |
| ------------------- | -------------------- | -------------------------------------------------- |
| `pool.run(params)`  | `Promise<AgentResponse>` | Run the pool with the selected strategy.       |
| `pool.stream(params)` | `AsyncGenerator<StreamChunk>` | Stream from the selected agent.         |
| `pool.get(name)`    | `Agent \| undefined` | Look up a pool agent by its `name` field.          |
| `pool.agents`       | `readonly Agent[]`   | The full list of primary agents in the pool.       |

## Patterns

### Cost-Optimized Pool

Pick the cheapest agent for every request.

```ts
import { Agent, AgentPool, Provider } from "agentcraft";

const cheapest = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const mid = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const pool = AgentPool.create([cheapest, mid], {
  strategy: "cost",
});

const result = await pool.run({ prompt: "Summarize this text in one sentence." });
console.log(result.content);
```

### Provider Fallback

Try OpenAI first; fall back to Anthropic if it fails.

```ts
import { Agent, AgentPool, Provider } from "agentcraft";

const primary = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const fallbackAgent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const pool = AgentPool.create([primary], {
  strategy: "quality",
  fallback: fallbackAgent,           // tried if primary fails
  fallbackMode: "first-error",       // fall back on any error
});

const result = await pool.run({ prompt: "Write a product description." });
console.log(result.content);
```

### Round-Robin Load Balancing

Distribute requests evenly across multiple agents of the same model.

```ts
import { Agent, AgentPool, Provider } from "agentcraft";

// Three identical agents — useful for rate-limit spreading
const agents = Array.from({ length: 3 }, () =>
  Agent.create({
    model: Provider.openai["gpt-4o-mini"],
    apiKey: process.env.OPENAI_API_KEY!,
  }),
);

const pool = AgentPool.create(agents, {
  strategy: "round-robin",
});

// Each call rotates to the next agent
const [r1, r2, r3] = await Promise.all([
  pool.run({ prompt: "Summarize article 1." }),
  pool.run({ prompt: "Summarize article 2." }),
  pool.run({ prompt: "Summarize article 3." }),
]);
```

### Budget-Aware Downgrade

When `budget.maxCost` is set and `downgradeOnBudgetPressure` is `true`, the pool prefers cheaper agents first.

```ts
import { Agent, AgentPool, Provider } from "agentcraft";

const cheap = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  name: "cheap",
});

const expensive = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  name: "expensive",
});

const pool = AgentPool.create([cheap, expensive], {
  strategy: "quality",
  downgradeOnBudgetPressure: true, // re-sorts by cost when budget is set
});

// The pool sorts agents by cost (cheapest first) when budget.maxCost is provided
const result = await pool.run({
  prompt: "Generate a quick summary.",
  budget: { maxCost: 0.001 }, // tight budget — triggers cost-first ordering
});
console.log(result.content);
```

### Quality Upgrade on Failure

When `upgradeOnQualityFailure` is `true`, the pool re-sorts candidates by quality score before each retry, so the best agent is tried next.

```ts
import { Agent, AgentPool, Provider } from "agentcraft";

const fast = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const smart = Agent.create({
  model: Provider.anthropic["claude-opus-4-7"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const pool = AgentPool.create([fast, smart], {
  strategy: "cost",                 // prefer cheaper by default
  upgradeOnQualityFailure: true,    // on failure, try the higher-quality agent
  fallbackMode: "retryable",        // only upgrade on retryable errors
});

const result = await pool.run({ prompt: "Analyze this complex legal document." });
console.log(result.content);
```

### Streaming from a Pool

`pool.stream()` streams from the selected agent. If the stream fails before any chunks are yielded and a `fallback` is configured, the pool falls back to the fallback agent's stream.

```ts
import { Agent, AgentPool, Provider } from "agentcraft";

const primary = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const fallbackAgent = Agent.create({
  model: Provider.anthropic["claude-haiku-4-5"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const pool = AgentPool.create([primary], {
  strategy: "quality",
  fallback: fallbackAgent,
});

for await (const chunk of pool.stream({ prompt: "Tell me about streaming." })) {
  process.stdout.write(chunk.delta ?? "");
}
```

### Named Agent Lookup

Use `pool.get(name)` to retrieve a specific agent from the pool by name.

```ts
import { Agent, AgentPool, Provider } from "agentcraft";

const researcher = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  name: "researcher",
});

const writer = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  name: "writer",
});

const pool = AgentPool.create([researcher, writer], {
  strategy: "best-fit",
});

// Run the pool normally
const result = await pool.run({ prompt: "Research and write about TypeScript." });

// Or target a specific agent by name
const writerAgent = pool.get("writer");
if (writerAgent) {
  const specific = await writerAgent.run({ prompt: "Write the conclusion." });
  console.log(specific.content);
}
```

### Retryable-Only Fallback

Only fall back when the error is marked retryable (e.g. rate limits, timeouts) — not on auth or content-policy errors.

```ts
import { Agent, AgentPool, Provider } from "agentcraft";

const primary = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const backup = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const pool = AgentPool.create([primary], {
  strategy: "quality",
  fallback: backup,
  fallbackMode: "retryable", // only falls back on retryable errors like rate limits
});

const result = await pool.run({ prompt: "Generate a sales email." });
console.log(result.content);
```

## Related

- [Agent Team](./agent-team.md)
- [Agent Workspace](./agent-workspace.md)
- [Dynamic Team Spawning](./dynamic-team-spawning.md)
- [Budgets & Cost](../core/budgets-cost.md)
- [Agents](../core/agents.md)
