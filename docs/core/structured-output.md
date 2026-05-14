# Structured Output

Structured output turns model text into validated data your app can trust enough to route, store, or render.

## Quick Start

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Return a launch risk assessment.",
  responseSchema: {
    type: "object",
    properties: {
      risk: { type: "string", enum: ["low", "medium", "high"] },
      reasons: { type: "array", items: { type: "string" } },
    },
    required: ["risk", "reasons"],
  },
});

console.log(response.structuredResponse);
// { risk: "medium", reasons: ["..."] }
```

## Configuration

| Field                           | Required                  | Default                  | Purpose                                               |
| ------------------------------- | ------------------------- | ------------------------ | ----------------------------------------------------- |
| `responseSchema`                | Yes for structured output | None                     | JSON schema or Zod-like schema.                       |
| `responseFormat`                | No                        | Provider/runtime default | Provider-native JSON request where supported.         |
| `structuredOutput.retries`      | No                        | Runtime default          | Repair attempts when validation fails.                |
| `structuredOutput.toolFallback` | No                        | `auto`                   | Uses tool fallback where provider support needs help. |

## Patterns

### Strict Classifier

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Classify this support ticket: 'App crashes on startup after update'",
  responseSchema: {
    type: "object",
    properties: { priority: { type: "string", enum: ["p0", "p1", "p2"] } },
    required: ["priority"],
  },
  structuredOutput: { retries: 2 },
});

console.log(response.structuredResponse?.priority); // "p0"
```

### Zod Schema

```ts
import { Agent, Provider } from "agentcraft";
import { z } from "zod";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const BriefSchema = z.object({
  audience: z.string(),
  intent: z.string(),
  outline: z.array(z.string()),
});

const response = await agent.run({
  prompt: "Create a content brief for a developer newsletter.",
  responseSchema: BriefSchema,
});

const brief = response.structuredResponse;
console.log(brief?.audience);
```

### Registry Schema

```ts
import { Agent, ArtifactRegistry, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Write a draft article about AI agents.",
  responseSchema: ArtifactRegistry.lookup("Draft"),
});

console.log(response.structuredResponse);
```

## More Examples

- [Structured output example](../examples.md#structured-output)
- [Structured Output Config](../configuration/structured-output-config.md)
