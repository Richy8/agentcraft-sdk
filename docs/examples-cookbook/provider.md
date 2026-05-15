# Provider Examples

Provider examples show how to keep the same agent shape while changing model strategy.

## Single Provider

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const response = await agent.run({
  prompt: "Summarize the key differences between REST and GraphQL.",
});
console.log(response.content);
```

## Local-Compatible Provider

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.ollama["llama3.2"],
  baseUrl: "http://localhost:11434/v1",
});

const response = await agent.run({
  prompt: "Explain what an agent runtime is in one paragraph.",
});
console.log(response.content);
```

## Pool Routing

```ts
import { Agent, AgentPool, Provider } from "agentcraft";

const pool = AgentPool.create(
  [
    Agent.create({
      model: Provider.openai["gpt-4o-mini"],
      apiKey: process.env.OPENAI_API_KEY!,
    }),
    Agent.create({
      model: Provider.anthropic["claude-sonnet-4-6"],
      apiKey: process.env.ANTHROPIC_API_KEY!,
    }),
  ],
  { strategy: "best-fit" },
);

const response = await pool.run({
  prompt: "Choose a launch strategy and explain the tradeoffs.",
});
console.log(response.content);
```

More detail: [Models and Providers](../core/models-and-providers.md), [Agent Pool](../orchestration/agent-pool.md).
