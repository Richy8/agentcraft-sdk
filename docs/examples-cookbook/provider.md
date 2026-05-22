# Provider Examples

Provider examples show how to keep the same agent shape while switching models, using multiple providers, or handling fallback.

## Single Provider

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const response = await agent.run({
  prompt: "Summarize the key differences between REST and GraphQL.",
});
console.log(response.content);
```

## All Supported Providers

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

// OpenAI
Agent.create({ model: Provider.openai["gpt-4o"], apiKey: process.env.OPENAI_API_KEY! });
Agent.create({ model: Provider.openai["gpt-4o-mini"], apiKey: process.env.OPENAI_API_KEY! });

// Anthropic
Agent.create({ model: Provider.anthropic["claude-sonnet-4-6"], apiKey: process.env.ANTHROPIC_API_KEY! });
Agent.create({ model: Provider.anthropic["claude-opus-4-7"], apiKey: process.env.ANTHROPIC_API_KEY! });
Agent.create({ model: Provider.anthropic["claude-haiku-4-5-20251001"], apiKey: process.env.ANTHROPIC_API_KEY! });

// Google Gemini
Agent.create({ model: Provider.google["gemini-2.0-flash"], apiKey: process.env.GOOGLE_API_KEY! });

// Groq (fast inference)
Agent.create({ model: Provider.groq["llama-3.3-70b-versatile"], apiKey: process.env.GROQ_API_KEY! });

// Local with Ollama
Agent.create({ model: Provider.ollama["llama3.2"], baseUrl: "http://localhost:11434/v1" });

// OpenAI-compatible endpoint (Together AI, Anyscale, etc.)
Agent.create({
  model: "meta-llama/Llama-3-70b-chat-hf",
  baseUrl: "https://api.together.xyz/v1",
  apiKey: process.env.TOGETHER_API_KEY!,
});
```

## Agent Pool — Cost Routing

Pick the cheapest provider for each request:

```ts
import { Agent, AgentPool, Provider } from "@deskcreate/agentcraft";

const pool = AgentPool.create(
  [
    Agent.create({ model: Provider.openai["gpt-4o-mini"], apiKey: process.env.OPENAI_API_KEY! }),
    Agent.create({ model: Provider.groq["llama-3.3-70b-versatile"], apiKey: process.env.GROQ_API_KEY! }),
    Agent.create({ model: Provider.anthropic["claude-haiku-4-5-20251001"], apiKey: process.env.ANTHROPIC_API_KEY! }),
  ],
  { strategy: "cost" },
);

const response = await pool.run({
  prompt: "Summarize this changelog in three bullets.",
});
console.log(response.content);
```

## Agent Pool — Quality Routing With Fallback

Use the highest-quality agent but fall back on error:

```ts
import { Agent, AgentPool, Provider } from "@deskcreate/agentcraft";

const pool = AgentPool.create(
  [
    Agent.create({ model: Provider.anthropic["claude-opus-4-7"], apiKey: process.env.ANTHROPIC_API_KEY! }),
    Agent.create({ model: Provider.openai["gpt-4o"], apiKey: process.env.OPENAI_API_KEY! }),
  ],
  {
    strategy: "quality",
    fallback: Agent.create({
      model: Provider.openai["gpt-4o-mini"],
      apiKey: process.env.OPENAI_API_KEY!,
    }),
    fallbackMode: "first-error",
  },
);

const response = await pool.run({
  prompt: "Analyze this proposal and recommend a decision with rationale.",
});
console.log(response.content);
```

## Agent Pool — Round Robin

Distribute load across providers evenly:

```ts
import { Agent, AgentPool, Provider } from "@deskcreate/agentcraft";

const pool = AgentPool.create(
  [
    Agent.create({ model: Provider.openai["gpt-4o-mini"], apiKey: process.env.OPENAI_API_KEY! }),
    Agent.create({ model: Provider.anthropic["claude-sonnet-4-6"], apiKey: process.env.ANTHROPIC_API_KEY! }),
    Agent.create({ model: Provider.groq["llama-3.3-70b-versatile"], apiKey: process.env.GROQ_API_KEY! }),
  ],
  { strategy: "round-robin" },
);

// Each call rotates to the next agent
for (let i = 0; i < 6; i++) {
  const response = await pool.run({ prompt: `Process item ${i + 1}.` });
  console.log(response.content);
}
```

## Budget-Aware Provider Downgrade

Automatically downgrade to a cheaper model under budget pressure:

```ts
import { Agent, AgentPool, Provider } from "@deskcreate/agentcraft";

const pool = AgentPool.create(
  [
    Agent.create({ model: Provider.openai["gpt-4o"], apiKey: process.env.OPENAI_API_KEY! }),
    Agent.create({ model: Provider.openai["gpt-4o-mini"], apiKey: process.env.OPENAI_API_KEY! }),
  ],
  {
    strategy: "quality",
    downgradeOnBudgetPressure: true, // switches to cheaper model as budget fills up
  },
);

const response = await pool.run({
  prompt: "Summarize the quarterly report.",
  budget: { maxCost: 0.05 },
});
console.log(response.content);
```

More detail: [Models and Providers](../core/models-and-providers.md), [Agent Pool](../orchestration/agent-pool.md).
