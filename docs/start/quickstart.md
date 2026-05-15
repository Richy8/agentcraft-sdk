# Quickstart

This page gets you from install to first useful agent, then points to the feature chapters when you want more control.

## What You Build

A basic agent needs three things:

- a model from the provider catalog
- a prompt passed to `agent.run(...)`
- optional capabilities attached with `.use(...)`

## Minimal Agent

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

// Pick a model from the typed Provider catalog.
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY,
});

const response = await agent.run({
  prompt: "Write a concise launch checklist for an AI feature.",
});

console.log(response.content);
```

## Add A Tool

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { FetchAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY,
  // Keep external tool output bounded.
  toolPolicy: { maxResultBytes: 100_000 },
}).use(
  FetchAdapter.connect({
    // Required only when you want domain scoping.
    allowedDomains: ["vitepress.dev"],
  }),
);

const response = await agent.run({
  prompt: "Fetch the VitePress homepage and summarize what the project does.",
});
console.log(response.content);
```

## Add A Skill

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { WritingSkill } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(WritingSkill.create());

const response = await agent.run({
  prompt: "/write Draft a warm product update for existing users.",
});
console.log(response.content);
```

## Add A Creator Pack

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache: AgentCache.file(".agentcraft/cache", { strategy: "auto" }),
  skillActivation: "auto",
  toolSelection: "auto",
}).use(CreatorPacks.blog({ readOnlyByDefault: true }));

const response = await agent.run({
  prompt:
    "Plan and draft a Medium article about tool guardrails for agentic apps.",
  budget: { maxToolCalls: 4 },
});
console.log(response.content);
```

## Required Config

| Feature         | Required                | Default            | More                                                    |
| --------------- | ----------------------- | ------------------ | ------------------------------------------------------- |
| Agent           | `model`                 | None               | [Agents](../core/agents.md)                             |
| Cloud providers | Provider API key        | Usually env-driven | [Models And Providers](../core/models-and-providers.md) |
| Tools           | Adapter-specific config | Adapter-specific   | [Adapters](../adapters/overview.md)                     |
| Skills          | `.create()`             | Skill defaults     | [Skills](../skills/overview.md)                         |

## Next Steps

- Learn the runtime model in [Mental Model](./mental-model.md).
- Choose a goal in [Choose Your Path](../guides/choose-your-path.md).
- Browse runnable variants in [Examples Cookbook](../examples-cookbook/overview.md).
