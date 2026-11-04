# Testing & Mocking Examples

Writing tests for agents without live API calls.

## Setup: `DeterministicFakeProvider`

```ts
import { Agent } from "@deskcreate/agentcraft";
import { DeterministicFakeProvider } from "@deskcreate/agentcraft/testing";
import { describe, it, expect } from "vitest";

describe("agent", () => {
  it("returns scripted response", async () => {
    const provider = new DeterministicFakeProvider([
      { content: "Hello from the fake provider!" },
    ]);

    const agent = Agent.create({ provider });
    const response = await agent.run({ prompt: "Say hello." });

    expect(response.content).toBe("Hello from the fake provider!");
  });
});
```

## Scripting Response Queues

Responses are dequeued in order — one per `run()` call:

```ts
const provider = new DeterministicFakeProvider([
  { content: "First response" },
  { content: "Second response", tokensUsed: { prompt: 200, completion: 100, total: 300 } },
  { content: "Third response", cost: 0.000045 },
]);

const agent = Agent.create({ provider });

const r1 = await agent.run({ prompt: "Call 1" });
expect(r1.content).toBe("First response");

const r2 = await agent.run({ prompt: "Call 2" });
expect(r2.content).toBe("Second response");
expect(r2.tokensUsed.total).toBe(300);
```

## Asserting Tool Calls

Script tool calls and assert they appear in the response:

```ts
import { FilesystemMCP } from "@deskcreate/agentcraft/mcp";

const provider = new DeterministicFakeProvider([
  {
    toolCalls: [{ name: "read_file", args: { path: "./config.json" } }],
    content: "I read the config file.",
  },
]);

const agent = Agent.create({ provider })
  .use(FilesystemMCP.connect({ allowedPaths: ["./"] }));

const response = await agent.run({ prompt: "Read my config." });

expect(response.toolCalls).toHaveLength(1);
expect(response.toolCalls[0].name).toBe("read_file");
```

## Testing Structured Output

```ts
import { z } from "zod";

const schema = z.object({ name: z.string(), age: z.number() });

const provider = new DeterministicFakeProvider([
  { structuredResponse: { name: "Alice", age: 30 } },
]);

const agent = Agent.create({ provider });
const response = await agent.run({ prompt: "Extract person.", responseSchema: schema });

expect(response.structuredResponse?.name).toBe("Alice");
expect(response.structuredResponse?.age).toBe(30);
```

## Testing Error Paths

```ts
import { RateLimitError, ProviderError } from "@deskcreate/agentcraft";

it("retries on rate limit", async () => {
  const provider = new DeterministicFakeProvider([
    { error: new RateLimitError("Rate limited", { retryAfterSeconds: 0 }) },
    { content: "Succeeded after retry." },
  ]);

  const agent = Agent.create({
    provider,
    retry: { maxAttempts: 2, backoff: "fixed", initialDelay: 0, maxDelay: 0 },
  });

  const response = await agent.run({ prompt: "Hello" });
  expect(response.content).toBe("Succeeded after retry.");
});

it("throws QuotaExceededError on budget breach", async () => {
  const agent = Agent.create({
    provider: new DeterministicFakeProvider([
      { content: "...", tokensUsed: { prompt: 10000, completion: 5000, total: 15000 } },
    ]),
  });

  await expect(
    agent.run({ prompt: "...", budget: { maxTokens: 100 } }),
  ).rejects.toThrow();
});
```

## Integration With Vitest

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
});
```

Run unit tests (no API keys): `npm test`

Run live integration tests: `INTEGRATION_TESTS=true npm run test:int:light`

## Gate Live Tests With an Env Var

```ts
const RUN_LIVE = process.env.INTEGRATION_TESTS === "true";

(RUN_LIVE ? it : it.skip)("live call to OpenAI", async () => {
  const agent = Agent.create({
    model: Provider.openai["gpt-4o-mini"],
    apiKey: process.env.OPENAI_API_KEY!,
  });
  const r = await agent.run({ prompt: "Say hello." });
  expect(r.content).toBeTruthy();
});
```

## Related

- [Testing & Mocking reference](../production/testing.md)
- [Error Handling examples](./error-handling.md)
- [AgentEval](../production/agent-eval.md)
