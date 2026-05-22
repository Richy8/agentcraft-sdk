# Beginner Examples

These examples build from the smallest working agent to one with tools, skills, and a budget. Copy and run each one — they require only an API key.

## 1. Basic Chat

The minimal shape: model, key, prompt.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const result = await agent.run({
  prompt: "Explain what an AI agent runtime does in three bullets.",
});

console.log(result.content);
```

## 2. System Prompt

Add a system prompt to shape model behavior for every run:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  system: "You are a technical documentation writer. Use precise language, active voice, and short sentences.",
});

const result = await agent.run({
  prompt: "Write a one-paragraph description of semantic caching.",
});

console.log(result.content);
```

## 3. One Skill

Add a skill to inject reusable prompt behavior:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { WritingSkill } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
}).use(WritingSkill.create());

const response = await agent.run({
  prompt: "Rewrite this in a clearer, more direct style: 'The utilization of said tooling enables the facilitation of automated workflows.'",
});

console.log(response.content);
console.log("Active skills:", response.selection?.activeSkills);
// → ["writing"]
```

## 4. Budget Cap

Set a cost or tool-call limit to prevent runaway execution:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Summarize this note in two sentences.",
  budget: {
    maxCost: 0.01,
    maxTokens: 200,
    maxToolCalls: 0,
  },
});

console.log(response.content);
console.log("Cost:", response.costReport?.totalCost.toFixed(6));
```

## 5. Structured Output

Get typed JSON instead of raw text using a Zod schema:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { z } from "zod";

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const SentimentSchema = z.object({
  sentiment: z.enum(["positive", "negative", "neutral"]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

const response = await agent.run({
  prompt: "Classify the sentiment: 'This product completely transformed how our team works.'",
  responseSchema: SentimentSchema,
});

console.log(response.structuredResponse);
// → { sentiment: "positive", confidence: 0.95, reasoning: "..." }
```

## 6. Streaming

Stream tokens as they arrive:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

process.stdout.write("Response: ");
for await (const chunk of agent.stream({ prompt: "Write a haiku about TypeScript." })) {
  if (chunk.type === "content") {
    process.stdout.write(chunk.text);
  }
}
console.log("\nDone.");
```

## 7. Cost and Token Inspection

Check the cost and token breakdown after any run:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({ prompt: "Write a short paragraph about type safety." });

const { inputTokens, outputTokens, total } = response.tokensUsed ?? {};
const cost = response.costReport;

console.log(`Tokens: ${inputTokens} in, ${outputTokens} out, ${total} total`);
console.log(`Cost: $${cost?.totalCost.toFixed(6) ?? "n/a"}`);
```

## Next Steps

- Add web search tools: [Tools and Adapters](./tools-adapters.md)
- Add domain skills: [Skills](./skills.md)
- Try a creator workflow: [Creator](./creator.md)
- Use multiple providers: [Providers](./provider.md)
