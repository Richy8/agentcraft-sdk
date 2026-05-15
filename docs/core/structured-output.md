# Structured Output

Structured output asks the model to return JSON that matches a schema, validates the response, and surfaces it in `response.structuredResponse`. You can provide a plain JSON schema or a Zod schema.

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

// structuredResponse is the parsed and validated JSON
console.log(response.structuredResponse);
// → { risk: "medium", reasons: ["Tight timeline", "Missing QA sign-off"] }
```

## Configuration

These fields are passed to `agent.run()`:

| Field                           | Required                  | Default | Purpose                                                                    |
| ------------------------------- | ------------------------- | ------- | -------------------------------------------------------------------------- |
| `responseSchema`                | Yes for structured output | None    | JSON schema object or Zod schema. Defines and validates the expected shape. |
| `structuredOutput.retries`      | No                        | `0`     | Number of additional parse attempts when validation fails.                 |
| `structuredOutput.toolFallback` | No                        | `"auto"` | `"auto"` — use tool extraction when JSON mode is unavailable. `true` — always use tool. `false` — never use tool. |

## Schema Types

### Plain JSON Schema

```ts
// Use when you want a lightweight schema with no extra dependencies
const response = await agent.run({
  prompt: "Extract the action items from this meeting transcript.",
  responseSchema: {
    type: "object",
    properties: {
      actions: {
        type: "array",
        items: { type: "string" },
      },
      owner: { type: "string" },
      deadline: { type: "string" },
    },
    required: ["actions"],
  },
});

const data = response.structuredResponse as { actions: string[]; owner?: string };
console.log(data.actions);
// → ["Follow up with design", "Update the roadmap"]
```

### Zod Schema

```ts
import { Agent, Provider } from "agentcraft";
import { z } from "zod";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// Define schema with Zod — you get full TypeScript inference
const SentimentSchema = z.object({
  sentiment: z.enum(["positive", "neutral", "negative"]),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
});

const response = await agent.run({
  prompt: "Analyze the sentiment: 'AgentCraft makes AI agents delightful to build.'",
  responseSchema: SentimentSchema,
});

// Zod schema gives you a typed structuredResponse
const result = response.structuredResponse as z.infer<typeof SentimentSchema>;
console.log(result.sentiment);   // → "positive"
console.log(result.confidence);  // → 0.96
```

## Patterns

### Strict Classifier With Enum

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// Enum fields force the model to pick from a fixed set of values
const response = await agent.run({
  prompt: "Classify this support ticket: 'App crashes on startup after update'",
  responseSchema: {
    type: "object",
    properties: {
      priority: { type: "string", enum: ["p0", "p1", "p2", "p3"] },
      category: { type: "string", enum: ["bug", "feature", "question", "billing"] },
    },
    required: ["priority", "category"],
  },
  structuredOutput: {
    retries: 2, // retry validation up to 2 more times if it fails
  },
});

const ticket = response.structuredResponse as { priority: string; category: string };
console.log(ticket.priority);  // → "p0"
console.log(ticket.category);  // → "bug"
```

### Nested Object Schema

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Create a content brief for a developer newsletter about TypeScript.",
  responseSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      audience: { type: "string" },
      outline: { type: "array", items: { type: "string" } },
      tone: { type: "string", enum: ["professional", "casual", "technical"] },
    },
    required: ["title", "audience", "outline", "tone"],
  },
});

const brief = response.structuredResponse as {
  title: string;
  audience: string;
  outline: string[];
  tone: string;
};
console.log(brief.title);    // → "TypeScript 5.5: What's new for devs"
console.log(brief.outline);  // → ["Intro", "New inferred type predicates", "Migration tips"]
```

### Array Response

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// When the top-level schema is an array, wrap it in an object
const response = await agent.run({
  prompt: "List 5 best practices for writing TypeScript interfaces.",
  responseSchema: {
    type: "object",
    properties: {
      practices: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
          },
          required: ["title", "description"],
        },
      },
    },
    required: ["practices"],
  },
});

const { practices } = response.structuredResponse as {
  practices: Array<{ title: string; description: string }>;
};

for (const practice of practices) {
  console.log(`- ${practice.title}: ${practice.description}`);
}
```

### Complex Zod Schema

```ts
import { Agent, Provider } from "agentcraft";
import { z } from "zod";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// Zod gives you richer validation: min/max, regex, transforms, etc.
const ContentBriefSchema = z.object({
  title: z.string().min(10),
  audience: z.string(),
  keyPoints: z.array(z.string()).min(3).max(7),
  tone: z.enum(["professional", "casual", "technical"]),
  estimatedWordCount: z.number().int().positive(),
});

const response = await agent.run({
  prompt: "Create a content brief for an article about AgentCraft for senior engineers.",
  responseSchema: ContentBriefSchema,
  structuredOutput: {
    retries: 2, // retry up to 2 times if Zod validation fails
  },
});

const brief = response.structuredResponse as z.infer<typeof ContentBriefSchema>;
console.log(brief.title);
console.log(`${brief.keyPoints.length} key points`);
console.log(`~${brief.estimatedWordCount} words`);
```

### With ArtifactRegistry (Creator Pack Schemas)

`ArtifactRegistry` provides pre-built schemas for creator workflows (drafts, briefs, SEO plans, etc.).

```ts
import { Agent, ArtifactRegistry, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// Look up a built-in creator schema — returns a Zod schema
const DraftSchema = ArtifactRegistry.lookup("Draft");
if (!DraftSchema) throw new Error("Draft schema not found");

const response = await agent.run({
  prompt: "Write a draft article about AI agents and their use in software development.",
  responseSchema: DraftSchema,
});

console.log(response.structuredResponse);
// → { title: "...", body: "...", ... }

// See all available built-in schemas
console.log(ArtifactRegistry.list());
// → ["AudienceProfile", "ContentBrief", "Draft", "SeoPlan", ...]
```

### Tool Fallback Mode

When a model doesn't natively support JSON output mode, AgentCraft can use an internal tool (`submit_structured_response`) to extract structured output instead.

```ts
import { Agent, Provider } from "agentcraft";
import { z } from "zod";

const agent = Agent.create({
  model: Provider.ollama["llama3.2"], // local model without native JSON mode
  baseUrl: "http://localhost:11434/v1",
});

const ResponseSchema = z.object({
  answer: z.string(),
  confidence: z.enum(["high", "medium", "low"]),
});

const response = await agent.run({
  prompt: "What is the capital of France?",
  responseSchema: ResponseSchema,
  structuredOutput: {
    toolFallback: true, // force tool-based extraction — good for models without JSON mode
  },
});

const result = response.structuredResponse as z.infer<typeof ResponseSchema>;
console.log(result.answer);      // → "Paris"
console.log(result.confidence);  // → "high"
```

### Register a Custom Schema

```ts
import { Agent, ArtifactRegistry, Provider } from "agentcraft";
import { z } from "zod";

// Register a custom artifact type once at startup
ArtifactRegistry.register("TechSpec", z.object({
  title: z.string(),
  scope: z.string(),
  requirements: z.array(z.string()),
  openQuestions: z.array(z.string()),
}));

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const TechSpecSchema = ArtifactRegistry.lookup("TechSpec")!;

const response = await agent.run({
  prompt: "Draft a tech spec for a real-time notification system.",
  responseSchema: TechSpecSchema,
});

console.log(response.structuredResponse);
```

## Related

- [Structured Output Config](../configuration/structured-output-config.md)
- [Running Agents](./running-agents.md)
