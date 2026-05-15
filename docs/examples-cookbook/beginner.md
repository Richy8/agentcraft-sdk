# Beginner Examples

Use these examples when you want the smallest working shape before adding tools or orchestration.

## Basic Chat

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const result = await agent.run({
  prompt: "Explain AgentCraft in five bullets.",
});

console.log(result.content);
```

## Add One Skill

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { WritingSkill } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(WritingSkill.create());

const response = await agent.run({
  prompt: "Rewrite this paragraph with clearer structure.",
});
console.log(response.content);
```

## Add A Budget

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Summarize this note.",
  budget: { maxCost: 0.05, maxToolCalls: 0 },
});
console.log(response.content);
```

Next: [Tools and adapters](./tools-adapters.md), [skills](./skills.md), or [creator](./creator.md).
