# Testing & Mocking

Write unit and integration tests for agents without making live API calls.

## Overview

`DeterministicFakeProvider` is a scripted provider that returns queued responses without hitting any LLM API. Use it to test agent logic, tool call handling, structured output, and error paths in CI.

```ts
import { Agent } from "@deskcreate/agentcraft";
import { DeterministicFakeProvider } from "@deskcreate/agentcraft/testing";
import { describe, it, expect } from "vitest";

describe("agent", () => {
  it("summarizes content", async () => {
    const provider = new DeterministicFakeProvider([
      { content: "Caching reduces latency and token spend." },
    ]);

    const agent = Agent.create({ provider });

    const response = await agent.run({
      prompt: "Summarize the benefits of caching.",
    });

    expect(response.content).toBe("Caching reduces latency and token spend.");
  });
});
```

## `DeterministicFakeProvider`

Accepts a queue of scripted responses. Responses are dequeued in order on each `run()` call.

```ts
const provider = new DeterministicFakeProvider([
  { content: "First response" },
  { content: "Second response", tokensUsed: { prompt: 100, completion: 50, total: 150 } },
]);
```

Each entry can set:

| Field | Type | Description |
| --- | --- | --- |
| `content` | `string` | The text the provider returns. |
| `tokensUsed` | `TokenUsage` | Simulated token counts. |
| `cost` | `number` | Simulated cost in USD. |
| `toolCalls` | `ToolCall[]` | Tool calls the provider "decides" to make. |
| `structuredResponse` | `unknown` | JSON structured output to return. |
| `error` | `Error` | Error to throw instead of returning a response. |

## Testing Tool Calls

Script which tools the provider "decides" to call:

```ts
const provider = new DeterministicFakeProvider([
  {
    toolCalls: [{ name: "read_file", args: { path: "./config.json" } }],
    content: "The config file was read successfully.",
  },
]);

const agent = Agent.create({ provider })
  .use(FilesystemMCP.connect({ allowedPaths: ["./"] }));

const response = await agent.run({ prompt: "Read my config file." });
expect(response.toolCalls[0].name).toBe("read_file");
```

## Testing Structured Output

Return valid JSON from the fake to test `responseSchema`:

```ts
import { z } from "zod";

const schema = z.object({ summary: z.string(), keywords: z.array(z.string()) });

const provider = new DeterministicFakeProvider([
  { structuredResponse: { summary: "Caching saves money.", keywords: ["cache", "latency"] } },
]);

const agent = Agent.create({ provider });
const response = await agent.run({ prompt: "Analyze this.", responseSchema: schema });

expect(response.structuredResponse?.summary).toBe("Caching saves money.");
```

## Testing Error Paths

Script specific error types to test retry and fallback logic:

```ts
import { RateLimitError, ProviderError } from "@deskcreate/agentcraft";

const provider = new DeterministicFakeProvider([
  { error: new RateLimitError("Rate limited", { retryAfterSeconds: 1 }) },
  { content: "Retry succeeded." },
]);

const agent = Agent.create({
  provider,
  retry: { maxAttempts: 2, backoff: "exponential", initialDelay: 100, maxDelay: 1000 },
});

const response = await agent.run({ prompt: "Hello" });
expect(response.content).toBe("Retry succeeded.");
```

## Integration With Vitest and Jest

No special setup needed — `DeterministicFakeProvider` is synchronous-friendly and works in both test runners.

```ts
// vitest.config.ts
export default {
  test: {
    environment: "node",
  },
};
```

## `INTEGRATION_TESTS` Gate

Separate unit tests (no API keys) from live integration tests:

```ts
const runLive = process.env.INTEGRATION_TESTS === "true";

(runLive ? it : it.skip)("live OpenAI call", async () => {
  const agent = Agent.create({
    model: Provider.openai["gpt-4o-mini"],
    apiKey: process.env.OPENAI_API_KEY!,
  });
  const response = await agent.run({ prompt: "Say hello." });
  expect(response.content).toBeTruthy();
});
```

Run with: `INTEGRATION_TESTS=true npm run test:int:light`

## Related

- [AgentEval](./agent-eval.md) — automated quality assertion suites
- [Error Handling](../core/error-handling.md) — error class reference
- [Testing cookbook](../examples-cookbook/testing.md)
