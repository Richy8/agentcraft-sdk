# Quickstart

This page gets you from install to a running, useful agent in under five minutes, then shows how each capability layers on top.

## Install

```sh
npm install @deskcreate/agentcraft
```

Node.js 20 or later is required.

## Environment Variables

Set your provider API key before running any agent. The simplest setup uses OpenAI:

```sh
export OPENAI_API_KEY="sk-..."
```

Other providers use their own key names — see [Models & Providers](../core/models-and-providers.md) for the full list.

## Step 1 — Minimal Agent

Every agent needs a model and (for cloud providers) an API key. Everything else has sensible defaults.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Write a concise launch checklist for an AI feature.",
});

console.log(response.content);
// → "1. Define the feature scope..."

// Response always includes usage and cost
console.log(`Tokens: ${response.tokensUsed.total}`);
console.log(`Cost: $${response.cost.toFixed(6)}`);
```

## Step 2 — Add a Tool

Attach an adapter so the agent can call external systems. Tools fire automatically when the model decides they're needed.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { FetchAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  // Bound tool output so the model doesn't overflow context
  toolPolicy: { maxResultBytes: 100_000 },
}).use(
  FetchAdapter.connect({
    // Restrict to specific domains for safety
    allowedDomains: ["api.github.com", "raw.githubusercontent.com"],
  }),
);

const response = await agent.run({
  prompt: "Fetch https://api.github.com/repos/microsoft/TypeScript/releases/latest and summarize the changes.",
});

console.log(response.content);
// → "TypeScript 5.x introduces..."

// Inspect which tools were called
console.log(response.toolCalls?.map((t) => t.name));
// → ["fetch"]
```

## Step 3 — Cache Tool Results

Enable caching to avoid paying for the same tool call twice. The cache is transparent — the agent doesn't change.

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";
import { FetchAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  // File-backed cache survives process restarts
  cache: AgentCache.file(".agentcraft/cache", { strategy: "auto" }),
}).use(FetchAdapter.connect({ allowedDomains: ["api.github.com"] }));

// First run — cache miss, tool executes
const first = await agent.run({
  prompt: "Fetch https://api.github.com/repos/microsoft/TypeScript and tell me the star count.",
});
console.log(`Cache hits: ${first.cache?.hits}`);    // → 0
console.log(`Writes: ${first.cache?.writes}`);      // → 1

// Second run — cache hit, tool skipped entirely
const second = await agent.run({
  prompt: "Fetch https://api.github.com/repos/microsoft/TypeScript and tell me the star count.",
});
console.log(`Cache hits: ${second.cache?.hits}`);   // → 1
console.log(`Calls avoided: ${second.cache?.toolCallsAvoided}`); // → 1
```

## Step 4 — Enforce a Budget

Prevent runaway costs by setting token or dollar limits. Hard mode throws `QuotaExceededError`; soft mode warns.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { QuotaExceededError } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

try {
  const response = await agent.run({
    prompt: "Write a full novel chapter.",
    // Hard cap: throw if cost would exceed $0.01
    budget: {
      maxCostUsd: 0.01,
      mode: "hard",
    },
  });
  console.log(response.content);
} catch (err) {
  if (err instanceof QuotaExceededError) {
    console.log("Run cancelled — budget exceeded.");
  }
}
```

## Step 5 — Stream the Response

Use `agent.stream()` when you want to display tokens as they arrive rather than waiting for the full response.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const stream = agent.stream({
  prompt: "Explain agent caching in three paragraphs.",
});

// Process each chunk as it arrives
for await (const chunk of stream) {
  if (chunk.delta) {
    process.stdout.write(chunk.delta);
  }
}
// → "Agent caching works by storing..." (streams token by token)
```

## Step 6 — Return Structured Data

Use a Zod schema to force the model to return validated, typed JSON.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { z } from "zod";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const FeatureSchema = z.object({
  name: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  estimatedDays: z.number(),
  risks: z.array(z.string()),
});

const response = await agent.run({
  prompt: "Estimate the effort to add Redis caching to an existing TypeScript API.",
  responseSchema: FeatureSchema,
});

// structuredResponse is fully typed as the Zod inferred type
const feature = response.structuredResponse as z.infer<typeof FeatureSchema>;
console.log(feature.name);           // → "Redis Caching"
console.log(feature.priority);       // → "high"
console.log(feature.estimatedDays);  // → 5
console.log(feature.risks);          // → ["Cache invalidation complexity", ...]
```

## Required Config

| Scenario | Required | More |
| --- | --- | --- |
| Any agent | `model` | [Agent Config](../configuration/agent-config.md) |
| Cloud providers | `apiKey` (or env var) | [Provider Config](../configuration/provider-config.md) |
| Adapters | Adapter-specific config | [Adapters](../adapters/overview.md) |
| MCP servers | Auth token per server | [MCP](../mcp/overview.md) |
| Budget enforcement | `budget.maxCostUsd` or `budget.maxTotalTokens` | [Budget Config](../configuration/budget-config.md) |
| Caching | `AgentCache.memory()` / `.file()` / `.sqlite()` | [Cache Config](../configuration/cache-config.md) |

## Next Steps

| Want to... | Go to |
| --- | --- |
| Learn all providers and model options | [Models & Providers](../core/models-and-providers.md) |
| Understand every run parameter | [Running Agents](../core/running-agents.md) |
| Build tools and adapters | [Tools](../tools/tools.md) · [Adapters](../adapters/overview.md) |
| Use MCP servers | [MCP](../mcp/overview.md) |
| Orchestrate multiple agents | [Agent Workflow](../orchestration/agent-workflow.md) |
| Persist outputs | [Artifact Store](../persistence/artifact-store.md) |
| Go to production | [Security Model](../production/security-model.md) · [AgentEval](../production/agent-eval.md) |
| See all runnable examples | [Examples & Cookbook](../examples-cookbook/overview.md) |
