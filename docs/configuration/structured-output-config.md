# Structured Output Config

Structured output forces the model to return JSON matching a schema, validates it, and surfaces the result in `response.structuredResponse`. Two fields in `agent.run()` control this: `responseSchema` and `structuredOutput`.

## Options

| Option                          | Required                  | Default   | Purpose                                                                    |
| ------------------------------- | ------------------------- | --------- | -------------------------------------------------------------------------- |
| `responseSchema`                | Yes for structured output | None      | JSON schema object or Zod schema (anything with a `.safeParse()` method).  |
| `structuredOutput.retries`      | No                        | `0`       | Number of additional attempts when JSON parsing or schema validation fails. |
| `structuredOutput.toolFallback` | No                        | `"auto"`  | When to use tool-based extraction. `"auto"` falls back automatically when JSON mode is unavailable. `true` always uses it. `false` disables it. |

## Schema Types

`responseSchema` accepts either a **plain JSON schema** or a **Zod schema** (any object with a `.safeParse()` method).

### JSON Schema

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Extract action items from these meeting notes.",
  responseSchema: {
    type: "object",
    properties: {
      actions: {
        type: "array",
        items: { type: "string" },
      },
      owner: { type: "string" },
    },
    required: ["actions"],
  },
});

console.log(response.structuredResponse);
// → { actions: ["Follow up with design", "Update roadmap"], owner: "Alice" }
```

### Zod Schema

```ts
import { Agent, Provider } from "agentcraft";
import { z } from "zod";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const TicketSchema = z.object({
  priority: z.enum(["p0", "p1", "p2", "p3"]),
  category: z.enum(["bug", "feature", "question"]),
  summary: z.string().max(200),
});

const response = await agent.run({
  prompt: "Classify: 'App crashes on startup after today's update'",
  responseSchema: TicketSchema,
});

// TypeScript infers the type when you cast
const ticket = response.structuredResponse as z.infer<typeof TicketSchema>;
console.log(ticket.priority);  // → "p0"
console.log(ticket.category);  // → "bug"
```

## `structuredOutput` Options

### retries

When the model returns malformed JSON or data that fails schema validation, AgentCraft can retry the call with a correction prompt. Each retry tells the model what went wrong.

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Return a risk assessment as JSON.",
  responseSchema: {
    type: "object",
    properties: {
      risk: { type: "string", enum: ["low", "medium", "high"] },
      score: { type: "number" },
    },
    required: ["risk", "score"],
  },
  structuredOutput: {
    retries: 3, // try up to 3 additional times if validation fails
  },
});

console.log(response.structuredResponse);
```

### toolFallback

By default (`"auto"`), AgentCraft uses an internal tool to extract structured output when the model doesn't support JSON mode. You can force or disable this behavior.

```ts
import { Agent, Provider } from "agentcraft";
import { z } from "zod";

// Force tool-based extraction — good for local models without JSON mode
const localAgent = Agent.create({
  model: Provider.ollama["llama3.2"],
  baseUrl: "http://localhost:11434/v1",
});

const ResponseSchema = z.object({
  answer: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
});

const response = await localAgent.run({
  prompt: "What is the capital of France?",
  responseSchema: ResponseSchema,
  structuredOutput: {
    toolFallback: true,  // always use tool extraction regardless of JSON mode support
  },
});

console.log(response.structuredResponse);
// → { answer: "Paris", confidence: "high" }
```

```ts
import { Agent, Provider } from "agentcraft";
import { z } from "zod";

// Disable tool fallback — model must support JSON mode natively
const strictAgent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await strictAgent.run({
  prompt: "Classify this text.",
  responseSchema: z.object({ label: z.string() }),
  structuredOutput: {
    toolFallback: false, // never use tool fallback — fail if JSON mode is unavailable
  },
});

console.log(response.structuredResponse);
```

## How Validation Works

Processing order:

1. Model returns a text response (JSON string).
2. AgentCraft calls `JSON.parse()` on the content.
3. If `responseSchema` is Zod-like: calls `schema.safeParse(parsed)` — throws on failure.
4. If `responseSchema` is a plain JSON schema: validates type, required fields, enum values, and nested properties recursively.
5. On failure with `retries > 0`: re-runs the prompt with a correction message appended.
6. On success: `response.structuredResponse` contains the validated value.

## Related

- [Structured Output](../core/structured-output.md)
- [Running Agents](../core/running-agents.md)
- [ArtifactRegistry](../core/artifact-registry.md)
