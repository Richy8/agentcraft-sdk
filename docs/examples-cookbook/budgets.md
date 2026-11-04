# Budgets & Cost Examples

Controlling and reporting on spend.

## Basic Cost Budget

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Write a comprehensive guide on TypeScript generics.",
  budget: { maxCost: 0.02 }, // fail-closed limit: $0.02
});

console.log(`Cost: $${response.cost.toFixed(6)}`);
console.log(`Tokens: ${response.tokensUsed.total}`);
```

## Catching `QuotaExceededError`

```ts
import { QuotaExceededError } from "@deskcreate/agentcraft";

try {
  const response = await agent.run({
    prompt: "Write a 10,000 word essay on distributed systems.",
    budget: { maxCost: 0.001 }, // very tight budget
  });
} catch (err) {
  if (err instanceof QuotaExceededError) {
    console.error(`Budget exceeded: ${err.message}`);
    console.error(`Limit: $${err.context?.limitUsd}`);
  }
}
```

## Budget Modes

```ts
// Prefer-cache mode: require specific tools to hit cache instead of executing live.
const response = await agent.run({
  prompt: "Generate content.",
  budget: {
    maxCost: 0.01,
    mode: "prefer-cache",
    cachePolicy: { requireCachedFor: ["fetch"] },
  },
});

// Fail-closed mode (default): throws QuotaExceededError if budget is exceeded.
const response2 = await agent.run({
  prompt: "Generate content.",
  budget: {
    maxCost: 0.01,
    mode: "fail-closed",
  },
});
```

## Token Budget

```ts
const response = await agent.run({
  prompt: "Summarize this document...",
  budget: {
    maxTokens: 2000,
    maxInputTokens: 1000,
    maxOutputTokens: 1000,
  },
});
```

## `CostReport` After a Run

```ts
const response = await agent.run({ prompt: "..." });

console.log(`Total cost: $${response.cost.toFixed(6)}`);
console.log(`Prompt tokens: ${response.tokensUsed.prompt}`);
console.log(`Completion tokens: ${response.tokensUsed.completion}`);
console.log(`Total tokens: ${response.tokensUsed.total}`);
```

## Workspace-Level Budget Shared Across a Team

```ts
import { AgentWorkflow, AgentWorkspace } from "@deskcreate/agentcraft";
import { AgentTeam } from "@deskcreate/agentcraft/team";

const workspace = AgentWorkspace.create({
  budget: { maxCost: 0.1 }, // shared $0.10 budget across all agents
});

const team = AgentTeam.create({
  orchestrator: orchestratorAgent,
  members: [
    { role: "researcher", agent: researchAgent },
    { role: "writer", agent: writerAgent },
  ],
  workspace,
});

// Budget is consumed by all three agents combined
const response = await team.run({
  prompt: "Research and write an article on AI agents.",
});
```

## Cost Tracking With `cost.updated` Event

```ts
import { AgentWorkspace } from "@deskcreate/agentcraft";

const workspace = AgentWorkspace.memory();

workspace.events.on("cost.updated", (event) => {
  console.log(`${event.provider}/${event.model}: +$${event.cost.toFixed(6)}`);
});

// All agent runs through this workspace emit cost.updated
const workflow = AgentWorkflow.create({ workspace, steps: [...] });
await workflow.run({ input: "..." });
```

## Pre-Run Cost Estimation

The runtime estimates cost before a run and checks against the budget. The estimate uses `MODEL_CATALOG` pricing metadata:

```ts
// If estimated cost exceeds budget, throws before any API call
try {
  const response = await agent.run({
    prompt: "A very long prompt that will exceed the budget...",
    budget: { maxCost: 0.0001 }, // extremely tight
  });
} catch (err) {
  if (err instanceof QuotaExceededError) {
    // Threw before the API call was made
    console.log("Pre-flight budget check failed");
  }
}
```

## Related

- [Budgets & Cost reference](../core/budgets-cost.md)
- [Budget Config](../configuration/budget-config.md)
- [Error Handling examples](./error-handling.md)
