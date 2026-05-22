# Streaming Examples

Consuming streaming responses in real applications.

## Basic Streaming

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

for await (const chunk of agent.stream({ prompt: "Explain agent caching." })) {
  if (chunk.delta) process.stdout.write(chunk.delta);
  if (chunk.done) {
    console.log(`\nCost: $${chunk.cost?.toFixed(6)}`);
  }
}
```

## Using `onChunk` and `onDone` Callbacks

```ts
const stream = agent.stream({
  prompt: "Write a haiku about TypeScript.",
  onChunk: (chunk) => process.stdout.write(chunk.delta ?? ""),
  onDone: (response) => console.log(`\nDone. Cost: $${response.cost.toFixed(6)}`),
});

await stream.collect(); // consume the stream
```

## Streaming to a Web Response

Stream tokens directly to a browser via the Fetch API:

```ts
// Node.js / Bun server
async function handler(req: Request): Promise<Response> {
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of agent.stream({ prompt: "Tell me a story." })) {
        if (chunk.delta) {
          controller.enqueue(new TextEncoder().encode(chunk.delta));
        }
        if (chunk.done) controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
```

## Streaming With Tool Calls

Tool calls execute synchronously during the stream; tokens before and after tool use still stream:

```ts
import { FetchAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(FetchAdapter.connect({ allowedDomains: ["api.github.com"] }));

for await (const chunk of agent.stream({
  prompt: "Fetch the latest TypeScript release and summarize it.",
})) {
  if (chunk.delta) process.stdout.write(chunk.delta);
}
```

## Streaming With Structured Output Constraints

Structured output and streaming are mutually constrained — the response is buffered until complete before the schema is validated:

```ts
import { z } from "zod";

const schema = z.object({ title: z.string(), bullets: z.array(z.string()) });

// Tokens still stream, but structuredResponse is only available after done=true
for await (const chunk of agent.stream({
  prompt: "Summarize TypeScript 5.4 features.",
  responseSchema: schema,
})) {
  if (chunk.done && chunk.structuredResponse) {
    console.log(chunk.structuredResponse.title);
  }
}
```

## Provider Support

| Provider | Native Streaming |
| --- | --- |
| OpenAI | Yes |
| Anthropic | Yes |
| Google Gemini | Yes |
| AWS Bedrock | Yes |
| Cohere | Yes |
| OpenAI-compatible | Depends on endpoint |

## Related

- [Streaming reference](../core/streaming.md)
- [Structured Output examples](./structured-output.md)
- [Running Agents](../core/running-agents.md)
