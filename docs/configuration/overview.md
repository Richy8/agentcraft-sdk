# Configuration Overview

AgentCraft configuration is layered. Create-time config defines the agent, run-time config shapes one request, and attached capabilities bring their own adapter, MCP, skill, pack, and cache options.

## Choose The Right Config

| Config area       | Use it for                            | Required?   | Deep dive                                     |
| ----------------- | ------------------------------------- | ----------- | --------------------------------------------- |
| Agent config      | Provider, model, defaults, cache      | Yes         | [Agent Config](./agent-config.md)             |
| Run config        | Prompt, inputs, budgets, output shape | Yes per run | [Run Config](./run-config.md)                 |
| Tool policy       | Approvals, max calls, guardrails      | No          | [Tool Policy Config](./tool-policy-config.md) |
| Capability config | Adapters, MCP, skills, packs          | No          | [Adapter Config](./adapter-config.md)         |

## Minimal Setup

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({ prompt: "Summarize this release note." });
console.log(response.content);
```

## Production Setup

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache: AgentCache.file("./.agentcraft/cache", { strategy: "auto" }),
  toolPolicy: { readOnly: true, maxResultBytes: 20_000 },
});

const response = await agent.run({
  prompt: "Research and draft a release summary.",
  budget: { maxToolCalls: 8 },
});
console.log(response.content);
```

More variants: [configuration reference](../guides/config-reference.md) and [production cookbook](../examples-cookbook/production.md).
