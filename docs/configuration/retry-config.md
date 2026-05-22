# Retry Config

`RetryConfig` type reference for configuring automatic retries on transient failures.

## `RetryConfig` Fields

| Field | Type | Default | Description |
| --- | --- | --- | --- |
| `maxAttempts` | `number` | `1` (no retry) | Maximum number of attempts including the first try. |
| `backoff` | `'fixed' \| 'exponential' \| 'linear'` | `'exponential'` | Delay strategy between attempts. |
| `initialDelay` | `number` | `500` | Delay in ms before the first retry. |
| `maxDelay` | `number` | `15000` | Maximum delay in ms regardless of backoff. |

## Usage

### Agent-Level Retry

Applies to every run on this agent:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  retry: {
    maxAttempts: 3,
    backoff: "exponential",
    initialDelay: 500,
    maxDelay: 15_000,
  },
});
```

### Run-Level Retry

Override retry config for a specific run:

```ts
const response = await agent.run({
  prompt: "Hello",
  retry: {
    maxAttempts: 5,
    backoff: "linear",
    initialDelay: 1000,
    maxDelay: 10_000,
  },
});
```

### Step-Level Retry (in Workflows)

Per-step retry independent of the agent's retry config:

```ts
import { AgentStep } from "@deskcreate/agentcraft/team";

const step = AgentStep.create({
  id: "research",
  agent: researchAgent,
  prompt: "Research the topic.",
  retry: {
    maxAttempts: 2,
    backoff: "fixed",
    initialDelay: 2000,
    maxDelay: 2000,
  },
});
```

## Backoff Strategies

### Exponential (recommended)

Doubles the delay on each attempt, up to `maxDelay`:

```
Attempt 1: wait initialDelay (500ms)
Attempt 2: wait initialDelay * 2 (1000ms)
Attempt 3: wait initialDelay * 4 (2000ms)
...
```

### Linear

Adds `initialDelay` on each attempt:

```
Attempt 1: wait initialDelay (500ms)
Attempt 2: wait initialDelay * 2 (1000ms)
Attempt 3: wait initialDelay * 3 (1500ms)
...
```

### Fixed

Same delay on every attempt:

```
Attempt 1: wait initialDelay (500ms)
Attempt 2: wait initialDelay (500ms)
...
```

## Which Errors Trigger Retries

Only retryable errors trigger automatic retries:

| Error | Retryable |
| --- | --- |
| `RateLimitError` | Yes |
| `ServiceUnavailableError` | Yes |
| `InternalServerError` | Yes |
| `NetworkError` | Sometimes (connection errors) |
| `AuthenticationError` | No |
| `QuotaExceededError` | No |
| `ContentPolicyError` | No |
| `ContextWindowError` | No |

Use `isRetryableError(err)` to check programmatically:

```ts
import { isRetryableError } from "@deskcreate/agentcraft";

if (isRetryableError(err)) {
  console.log("This error is transient — safe to retry");
}
```

## `RetryExhaustedError`

When all retry attempts fail, `RetryExhaustedError` is thrown wrapping the last underlying error:

```ts
import { RetryExhaustedError } from "@deskcreate/agentcraft";

try {
  await agent.run({ prompt: "Hello" });
} catch (err) {
  if (err instanceof RetryExhaustedError) {
    console.error(`All retries failed. Last error: ${err.cause?.message}`);
  }
}
```

## Related

- [Error Handling](../core/error-handling.md)
- [Agent Config](./agent-config.md)
- [Run Config](./run-config.md)
- [Error Handling examples](../examples-cookbook/error-handling.md)
