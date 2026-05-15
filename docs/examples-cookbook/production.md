# Production Examples

Production examples combine safety, cache, budgets, observability, and deterministic tests.

## Safe Tool Defaults

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    readOnly: true,
    maxResultBytes: 20_000,
  },
});

const response = await agent.run({
  prompt: "Run a read-only production check.",
  budget: { maxToolCalls: 6 },
});
console.log(response.content);
```

## Cache With Short TTL

```ts
import { AgentCache } from "@deskcreate/agentcraft";

const cache = AgentCache.file("./.agentcraft/cache", {
  strategy: "conservative",
  defaultTtlMs: 15 * 60 * 1000,
});
```

## Live Test Gates

```bash
INTEGRATION_TESTS=true AGENTCRAFT_LIVE_PROVIDERS=openai npm run test:int:light
```

## Replay Test

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "This prompt is satisfied from replay during the test.",
  replay: {
    content: "ok",
    cost: 0,
    tokensUsed: { prompt: 1, completion: 1, total: 2 },
    finishReason: "stop",
    model: "replay-model",
    provider: "replay",
  },
});
console.log(response.content);
```

More detail: [Security Model](../production/security-model.md), [Live Testing](../examples-cookbook/production.md), [Integration Testing](../examples-cookbook/production.md).
