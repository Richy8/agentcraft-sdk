# Error Handling & Retries Examples

Handling every class of error the SDK can throw.

## Catching Specific Errors

```ts
import {
  Agent,
  Provider,
  ProviderError,
  RateLimitError,
  AuthenticationError,
  QuotaExceededError,
  RetryExhaustedError,
  ServiceUnavailableError,
} from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

try {
  const response = await agent.run({ prompt: "Hello" });
} catch (err) {
  if (err instanceof AuthenticationError) {
    console.error("Invalid API key — check OPENAI_API_KEY");
  } else if (err instanceof RateLimitError) {
    console.error(`Rate limited. Retry after ${err.retryAfterSeconds}s`);
  } else if (err instanceof QuotaExceededError) {
    console.error("Budget or quota exceeded");
  } else if (err instanceof ServiceUnavailableError) {
    console.error("Provider temporarily unavailable");
  } else if (err instanceof RetryExhaustedError) {
    console.error(`All retries failed: ${err.cause?.message}`);
  } else if (err instanceof ProviderError) {
    console.error(`Provider error: ${err.message}`);
  }
}
```

## `RetryConfig` With Exponential Backoff

```ts
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  retry: {
    maxAttempts: 4,
    backoff: "exponential",
    initialDelay: 500,  // ms
    maxDelay: 15_000,   // ms
  },
});

// Automatically retries on RateLimitError, ServiceUnavailableError, InternalServerError
const response = await agent.run({ prompt: "Hello" });
```

## `isRetryableError()` in a Custom Retry Loop

```ts
import { isRetryableError } from "@deskcreate/agentcraft";

async function runWithRetry(prompt: string, maxAttempts = 3) {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await agent.run({ prompt });
    } catch (err) {
      if (err instanceof Error && isRetryableError(err) && attempt < maxAttempts) {
        const delay = Math.min(500 * 2 ** attempt, 15_000);
        console.log(`Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        lastError = err;
      } else {
        throw err;
      }
    }
  }

  throw lastError;
}
```

## `QuotaExceededError` for Budget Exhaustion

```ts
import { QuotaExceededError } from "@deskcreate/agentcraft";

try {
  await agent.run({
    prompt: "Write a book.",
    budget: { maxCostUsd: 0.001 },
  });
} catch (err) {
  if (err instanceof QuotaExceededError) {
    console.log("Budget exhausted");
    console.log(`Limit: ${err.context?.limitUsd}`);
    console.log(`Used: ${err.context?.usedUsd}`);
  }
}
```

## Fallback Provider Pattern on `ServiceUnavailableError`

```ts
import { ServiceUnavailableError } from "@deskcreate/agentcraft";

const primaryAgent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const fallbackAgent = Agent.create({
  model: Provider.anthropic["claude-haiku-4-5-20251001"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

async function runWithFallback(prompt: string) {
  try {
    return await primaryAgent.run({ prompt });
  } catch (err) {
    if (err instanceof ServiceUnavailableError) {
      console.warn("Primary provider unavailable, falling back...");
      return await fallbackAgent.run({ prompt });
    }
    throw err;
  }
}
```

## Tool Execution Errors

```ts
import { ToolExecutionError } from "@deskcreate/agentcraft";

try {
  await agent.run({ prompt: "Read ./secret.txt" });
} catch (err) {
  if (err instanceof ToolExecutionError) {
    console.error(`Tool "${err.toolName}" failed: ${err.message}`);
  }
}
```

## Error Hierarchy Quick Reference

| Error | Retryable | When |
| --- | --- | --- |
| `ProviderError` | Sometimes | Unexpected provider failure |
| `RateLimitError` | Yes | Rate limited — check `retryAfterSeconds` |
| `AuthenticationError` | No | Invalid API key |
| `ServiceUnavailableError` | Yes | Provider 5xx or network down |
| `QuotaExceededError` | No | Budget or account quota exhausted |
| `RetryExhaustedError` | No | All retry attempts failed |
| `ToolExecutionError` | Depends | Tool `execute()` threw |
| `ContentPolicyError` | No | Provider rejected prompt |
| `ContextWindowError` | No | Prompt exceeds model context |

## Related

- [Error Handling reference](../core/error-handling.md)
- [Retry Config](../configuration/retry-config.md)
- [Budgets & Cost examples](./budgets.md)
