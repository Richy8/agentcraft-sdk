# Structured Output Examples

Extracting typed data from agent responses.

## Basic Structured Output

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { z } from "zod";

const SummarySchema = z.object({
  title: z.string(),
  bullets: z.array(z.string()).min(1).max(5),
  sentiment: z.enum(["positive", "neutral", "negative"]),
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Summarize the key benefits of TypeScript's type system.",
  responseSchema: SummarySchema,
});

// response.structuredResponse is typed as z.infer<typeof SummarySchema>
console.log(response.structuredResponse?.title);
console.log(response.structuredResponse?.bullets);
```

## Nested Schema

```ts
const ReportSchema = z.object({
  executive_summary: z.string(),
  sections: z.array(
    z.object({
      heading: z.string(),
      content: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  ),
  recommendations: z.array(z.string()),
  metadata: z.object({
    wordCount: z.number(),
    readingTimeMinutes: z.number(),
  }),
});

const response = await agent.run({
  prompt: "Write a technical report on agent caching strategies.",
  responseSchema: ReportSchema,
});

console.log(response.structuredResponse?.executive_summary);
```

## Accessing the Structured Response

```ts
const response = await agent.run({ prompt: "...", responseSchema: MySchema });

// Structured response (may be null if parsing failed)
const data = response.structuredResponse;

// Raw text response is always available
const rawText = response.content;
```

## Handling Parse Failures

If the model returns invalid JSON or a schema that doesn't match, `structuredResponse` is `null` and `content` contains the raw model output:

```ts
const response = await agent.run({
  prompt: "Extract the data.",
  responseSchema: MySchema,
});

if (!response.structuredResponse) {
  console.warn("Structured output failed — falling back to raw content");
  console.log(response.content);
}
```

## Manual Parsing Utility

```ts
import { parseAndValidateStructuredOutput } from "@deskcreate/agentcraft";

const raw = response.content;
const parsed = parseAndValidateStructuredOutput(raw, MySchema);

if (parsed.success) {
  console.log(parsed.data);
} else {
  console.error(parsed.error);
}
```

## With Anthropic (Native JSON Mode)

Anthropic Claude natively supports JSON output — no prompt coercion needed:

```ts
const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const response = await agent.run({
  prompt: "Extract product details from this text: ...",
  responseSchema: ProductSchema,
});
```

## Combining With Streaming

Structured output is validated only after the full response is received. Tokens still stream to the terminal:

```ts
let fullContent = "";
for await (const chunk of agent.stream({ prompt: "...", responseSchema: schema })) {
  if (chunk.delta) fullContent += chunk.delta;
  if (chunk.done && chunk.structuredResponse) {
    console.log("Structured:", chunk.structuredResponse);
  }
}
```

## Provider Support Matrix

| Provider | Native JSON Mode | Prompt-Based Coercion |
| --- | --- | --- |
| OpenAI | Yes (`response_format: json_object`) | Yes |
| Anthropic | Yes | Yes |
| Gemini | Yes | Yes |
| Bedrock | Depends on model | Yes |
| Cohere | Partial | Yes |

## Related

- [Structured Output reference](../core/structured-output.md)
- [Structured Output Config](../configuration/structured-output-config.md)
- [Streaming examples](./streaming.md)
