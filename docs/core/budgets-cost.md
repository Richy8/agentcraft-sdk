# Budgets and Cost

Budgets stop runaway work before it becomes expensive. Set limits on token usage, cost, and tool calls — AgentCraft enforces them at pre-flight (estimated) and post-run (actual).

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
    maxToolCalls: 5, // at most 5 tool calls
    maxTokens: 3_000, // at most 3000 total tokens (prompt + completion)
    maxCost: 0.05, // abort if estimated cost exceeds $0.05
  },
});

console.log(`Cost: $${response.cost.toFixed(4)}`);
console.log(`Tokens: ${response.tokensUsed.total}`);
```

## Budget Fields

All budget fields are passed inside `budget` in `agent.run()`. All are optional.

| Field                          | Default | When enforced         | Purpose                                                             |
| ------------------------------ | ------- | --------------------- | ------------------------------------------------------------------- |
| `maxToolCalls`                 | No cap  | During run            | Throws after this many tool calls are executed.                     |
| `maxTokens`                    | No cap  | Pre-flight + post-run | Total token budget (prompt + completion).                           |
| `maxInputTokens`               | No cap  | Pre-flight            | Cap on estimated prompt tokens.                                     |
| `maxOutputTokens`              | No cap  | Pre-flight            | Cap on estimated completion tokens.                                 |
| `maxCost`                      | No cap  | Pre-flight + post-run | Abort if estimated or actual cost exceeds this value.               |
| `costOptions`                  | None    | Pre-flight            | Modifiers: `region`, `batch`, `priority`, `flex`, tool/search fees. |
| `cachePolicy.requireCachedFor` | None    | During run            | Tool names that must have a cached result — throws if not.          |

## Cost Estimation

Use `Agent.estimateCost()` to preview cost before running. This is useful for user-facing cost previews or budget enforcement checks.

```ts
import { Agent, Provider } from "agentcraft";

// Static method — estimate without creating an agent
const estimate = Agent.estimateCost(Provider.openai["gpt-4o-mini"], {
  prompt: "Write a 500-word blog post about TypeScript generics.",
  maxTokens: 1_000,
});

console.log(`Estimated cost: $${estimate.estimatedCost.toFixed(4)}`);
console.log(`Input tokens: ~${estimate.tokens.prompt}`);
console.log(`Output tokens: ~${estimate.tokens.completion}`);
console.log(`Pricing stale: ${estimate.stalePricing}`); // true if pricing data is >90 days old
```

```ts
import { Agent, Provider } from "agentcraft";

// Instance method — uses the agent's already-configured model
const agent = Agent.create({
  model: Provider.anthropic["claude-3-5-haiku-20241022"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const estimate = agent.estimateCost({
  prompt: "Classify this support ticket.",
  maxTokens: 200,
});

console.log(`Estimated cost: $${estimate.estimatedCost.toFixed(4)}`);
```

## CostEstimate Fields

| Field               | Type      | Purpose                                                  |
| ------------------- | --------- | -------------------------------------------------------- |
| `estimatedCost`     | `number`  | Estimated run cost in USD.                               |
| `tokens.prompt`     | `number`  | Estimated prompt (input) tokens.                         |
| `tokens.completion` | `number`  | Estimated completion (output) tokens.                    |
| `tokens.total`      | `number`  | Total estimated tokens.                                  |
| `stalePricing`      | `boolean` | `true` if pricing data is older than 90 days or unknown. |

## Patterns

### Token Cap Only

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// Prevent the run from consuming more than 2000 total tokens
// Pre-flight throws if the estimate already exceeds the limit
const response = await agent.run({
  prompt: "Summarize this document.",
  budget: {
    maxTokens: 2_000,
  },
});

console.log(response.tokensUsed.total); // always ≤ 2000
```

### Separate Input and Output Caps

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// Cap input and output separately — useful for long-context models
const response = await agent.run({
  prompt: "Analyze this log file.",
  budget: {
    maxInputTokens: 10_000, // reject if the prompt is too long
    maxOutputTokens: 500, // keep responses concise
  },
});

console.log(response.content);
```

### Cost Cap With Estimation First

```ts
import { Agent, Provider } from "agentcraft";

const model = Provider.openai["gpt-4o"];
const agent = Agent.create({
  model,
  apiKey: process.env.OPENAI_API_KEY!,
});

const prompt =
  "Write a detailed technical spec for a real-time notification system.";

// Estimate first — surface cost to the user before running
const estimate = Agent.estimateCost(model, { prompt, maxTokens: 2_000 });
console.log(`Estimated cost: $${estimate.estimatedCost.toFixed(4)}`);

if (estimate.estimatedCost > 0.1) {
  console.warn("Cost estimate exceeds $0.10 — choosing a smaller model.");
} else {
  const response = await agent.run({
    prompt,
    budget: { maxCost: 0.1 }, // also enforce at runtime
  });
  console.log(response.content);
}
```

### Tool Call Cap

```ts
import { Agent, Provider } from "agentcraft";
import { TavilySearchAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

// Let the model search, but limit it to 3 tool calls total
const response = await agent.run({
  prompt: "Find the top 3 TypeScript frameworks and summarize each.",
  budget: {
    maxToolCalls: 3, // throws QuotaExceededError after the 3rd call
  },
});

console.log(response.content);
console.log(`Tool calls made: ${response.selection?.executedToolCalls}`);
```

### Combined Budget

```ts
import { Agent, Provider } from "agentcraft";
import { TavilySearchAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

// Enforce all limits at once — the most restrictive check wins
const response = await agent.run({
  prompt: "Research and write a report on AgentCraft use cases.",
  budget: {
    maxToolCalls: 5,
    maxTokens: 4_000,
    maxCost: 0.08,
  },
});

console.log(response.content);
console.log(`Final cost: $${response.cost.toFixed(4)}`);
console.log(`Tokens used: ${response.tokensUsed.total}`);
```

### Cache Policy — Require Cached Results

`cachePolicy.requireCachedFor` ensures the run only proceeds if the named tools have cached results. It fails closed rather than executing an expensive live call.

```ts
import { Agent, AgentCache, Provider } from "agentcraft";
import { TavilySearchAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache: AgentCache.file(".agentcraft/cache", { strategy: "auto" }),
}).use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

// This run will only succeed if "tavily_search" has a cached result
// If not cached, it throws QuotaExceededError before executing the tool
const response = await agent.run({
  prompt: "Summarize the latest AgentCraft release.",
  budget: {
    cachePolicy: {
      requireCachedFor: ["tavily_search"],
    },
  },
});

console.log(response.content);
console.log(`Cache hits: ${response.cache?.hits}`);
```

### Cost Options (Region, Batch, Priority)

`costOptions` applies modifiers to the cost calculation — useful for batch jobs, priority queues, or region-specific pricing.

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Analyze this dataset.",
  budget: {
    maxCost: 0.05,
    costOptions: {
      batch: true, // apply batch pricing discount if available
      region: "us-east-1", // region-specific pricing
    },
  },
});

console.log(response.cost);
```

## Enforcement Timing

Budget checks run twice — before and after the LLM call.

| Check      | When          | Throws if...                                              |
| ---------- | ------------- | --------------------------------------------------------- |
| Pre-flight | Before call   | Estimated tokens or cost already exceeds the limit.       |
| During run | Per tool call | `maxToolCalls` is reached.                                |
| Post-run   | After call    | Actual cost or token count exceeds `maxCost`/`maxTokens`. |

Pre-flight throws `ContextWindowError` if the estimated token count exceeds the model's context window, and `QuotaExceededError` for all other budget violations.

## Reading Cost From the Response

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({ prompt: "Hello." });

// Actual cost in USD (calculated from token usage + model pricing)
console.log(`Cost: $${response.cost.toFixed(6)}`);

// Token breakdown
console.log(`Prompt tokens: ${response.tokensUsed.prompt}`);
console.log(`Completion tokens: ${response.tokensUsed.completion}`);
console.log(`Total tokens: ${response.tokensUsed.total}`);
```

## Related

- [Running Agents](./running-agents.md)
- [AgentCache](../persistence/agent-cache.md)
- [Tool Caching](../tools/tool-caching.md)
- [AgentPool](../orchestration/agent-pool.md)
