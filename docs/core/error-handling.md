# Error Handling

AgentCraft uses a typed error hierarchy rooted at `AgentCraftError`. Every error class carries a stable `code` string, a `retryable` boolean, and a `context` object with structured metadata. Use `instanceof` checks to handle specific failure modes and `err.retryable` to decide whether automatic retry makes sense.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  AgentCraftError,
  RateLimitError,
  QuotaExceededError,
  RetryExhaustedError,
  AuthenticationError,
} from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  // Retry transient errors automatically before surfacing them
  retry: {
    maxAttempts: 3,
    backoff: "exponential",
    initialDelay: 500,
    maxDelay: 15_000,
  },
});

try {
  const response = await agent.run({ prompt: "Summarize agentcraft." });
  console.log(response.content);
} catch (err) {
  if (err instanceof RateLimitError) {
    // Retryable — agent already exhausted retries, wait before trying again
    console.log(`Rate limited. Retry after ${err.retryAfterSeconds}s`);
  } else if (err instanceof QuotaExceededError) {
    // Non-retryable — account quota exhausted
    console.error("Account quota exhausted:", err.message);
  } else if (err instanceof RetryExhaustedError) {
    // All retry attempts failed — the last error is attached
    console.error(
      `Failed after ${err.context.attempts} attempts:`,
      err.cause.message,
    );
  } else if (err instanceof AgentCraftError) {
    // Any other typed error — use code and context for structured logging
    console.error(`[${err.code}] ${err.message}`, err.context);
  } else {
    throw err; // Re-throw unexpected errors
  }
}
```

## Error Hierarchy

All errors extend `AgentCraftError`, which itself extends `Error`. This means every AgentCraft error has `message`, `name`, `stack`, plus:

| Property    | Type                      | Description                                             |
| ----------- | ------------------------- | ------------------------------------------------------- |
| `code`      | `string`                  | Stable error code for logging and programmatic handling |
| `retryable` | `boolean`                 | Whether the operation is safe to retry                  |
| `context`   | `Record<string, unknown>` | Structured metadata (provider, model, etc.)             |

## Error Classes

### Provider and Network Errors

| Class                     | Code                    | Retryable | When thrown                                       |
| ------------------------- | ----------------------- | --------- | ------------------------------------------------- |
| `ProviderError`           | `PROVIDER_ERROR`        | No        | General provider-side failure                     |
| `AuthenticationError`     | `AUTHENTICATION_ERROR`  | No        | Invalid or missing API key                        |
| `RateLimitError`          | `RATE_LIMIT_EXCEEDED`   | Yes       | 429 from provider                                 |
| `ServiceUnavailableError` | `SERVICE_UNAVAILABLE`   | Yes       | Provider temporarily down (503)                   |
| `InternalServerError`     | `INTERNAL_SERVER_ERROR` | Yes       | Provider 5xx response                             |
| `NetworkError`            | `NETWORK_ERROR`         | Varies    | Connection failure, DNS, timeout at network layer |
| `TimeoutError`            | `TIMEOUT`               | Yes       | Per-request timeout exceeded                      |
| `RetryExhaustedError`     | `RETRY_EXHAUSTED`       | No        | All configured retry attempts failed              |

### Model and Request Errors

| Class                       | Code                       | Retryable | When thrown                                |
| --------------------------- | -------------------------- | --------- | ------------------------------------------ |
| `ModelNotFoundError`        | `MODEL_NOT_FOUND`          | No        | Model ID not recognized by provider        |
| `ContextWindowError`        | `CONTEXT_WINDOW_EXCEEDED`  | No        | Prompt exceeds model's token limit         |
| `ContentPolicyError`        | `CONTENT_POLICY_VIOLATION` | No        | Provider rejected content                  |
| `UnsupportedInputError`     | `UNSUPPORTED_INPUT`        | No        | Vision/audio input on non-multimodal model |
| `UnsupportedOperationError` | `UNSUPPORTED_OPERATION`    | No        | Feature not available on this provider     |
| `InvalidRequestError`       | `INVALID_REQUEST`          | No        | Malformed request parameters               |
| `QuotaExceededError`        | `QUOTA_EXCEEDED`           | No        | Account-level quota exhausted              |

### Configuration and Setup Errors

| Class                      | Code                          | Retryable | When thrown                                |
| -------------------------- | ----------------------------- | --------- | ------------------------------------------ |
| `ConfigurationError`       | `CONFIGURATION_ERROR`         | No        | Invalid agent or run configuration         |
| `AdapterRequirementError`  | `ADAPTER_REQUIREMENT_NOT_MET` | No        | Adapter dependency not satisfied           |
| `AdapterToolConflictError` | `ADAPTER_TOOL_CONFLICT`       | No        | Two adapters expose conflicting tool names |

### Tool and Assembly Errors

| Class                 | Code                    | Retryable | When thrown                                 |
| --------------------- | ----------------------- | --------- | ------------------------------------------- |
| `ToolExecutionError`  | `TOOL_EXECUTION_FAILED` | No        | Tool `execute()` threw or returned an error |
| `PromptAssemblyError` | `PROMPT_ASSEMBLY_ERROR` | No        | Unresolved placeholder or bad include path  |

## Handling Specific Errors

### Rate Limit — Back Off and Retry

`RateLimitError` includes `retryAfterSeconds` parsed from the provider's `Retry-After` header:

```ts
import { Agent, Provider, RateLimitError } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  // Built-in retry handles most transient rate limits automatically
  retry: {
    maxAttempts: 5,
    backoff: "exponential",
    initialDelay: 1000,
    maxDelay: 60_000,
  },
});

try {
  const response = await agent.run({ prompt: "..." });
} catch (err) {
  if (err instanceof RateLimitError) {
    // Only reached if all retry attempts were themselves rate-limited
    const waitMs = err.retryAfterSeconds * 1000;
    console.log(
      `Still rate limited after retries. Waiting ${err.retryAfterSeconds}s.`,
    );
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    // Re-run after waiting
  }
}
```

### Authentication — Detect Bad Keys Early

```ts
import { AuthenticationError } from "@deskcreate/agentcraft";

try {
  const response = await agent.run({ prompt: "Hello" });
} catch (err) {
  if (err instanceof AuthenticationError) {
    // err.context.provider tells you which provider rejected the key
    console.error(`Bad API key for provider: ${err.context.provider}`);
    process.exit(1);
  }
}
```

### Context Window — Handle Oversized Prompts

```ts
import { ContextWindowError } from "@deskcreate/agentcraft";

async function runWithFallback(prompt: string) {
  try {
    return await agent.run({ prompt, model: Provider.openai["gpt-4o"] });
  } catch (err) {
    if (err instanceof ContextWindowError) {
      // Fall back to a model with a larger context window
      const longContextAgent = Agent.create({
        model: Provider.openai["gpt-4o"],
        apiKey: process.env.OPENAI_API_KEY!,
        maxTokens: 4096,
      });
      return longContextAgent.run({ prompt: prompt.slice(0, 50_000) }); // truncate if needed
    }
    throw err;
  }
}
```

### Retry Exhausted — Access the Root Cause

When all retry attempts fail, `RetryExhaustedError` wraps the last underlying error:

```ts
import { RetryExhaustedError } from "@deskcreate/agentcraft";

try {
  const response = await agent.run({ prompt: "..." });
} catch (err) {
  if (err instanceof RetryExhaustedError) {
    console.error(`Failed after ${err.context.attempts} attempts`);
    console.error(`Last error: ${err.cause.message}`);
    // err.cause is the actual underlying AgentCraftError from the last attempt
  }
}
```

### Tool Execution — Distinguish Tool vs. Model Errors

```ts
import { ToolExecutionError, ProviderError } from "@deskcreate/agentcraft";

try {
  const response = await agent.run({
    prompt: "Fetch the GitHub API status page.",
  });
} catch (err) {
  if (err instanceof ToolExecutionError) {
    // A tool failed — not an LLM error
    console.error("Tool failed:", err.message, err.context);
  } else if (err instanceof ProviderError) {
    // The LLM call itself failed
    console.error("LLM provider error:", err.message);
  }
}
```

### Unsupported Input — Check Before Attaching

Check model capabilities before sending multimodal inputs to avoid `UnsupportedInputError`:

```ts
import { Agent, Provider, UnsupportedInputError } from "@deskcreate/agentcraft";

const model = Provider.groq["llama-3.3-70b-versatile"];

if (!Agent.supports(model, "vision")) {
  console.warn("This model cannot process images — skipping vision input");
} else {
  const agent = Agent.create({ model, apiKey: process.env.GROQ_API_KEY! });
  const response = await agent.run({
    prompt: "Describe this image.",
    images: [{ type: "url", data: "https://example.com/image.png" }],
  });
}
```

## Retry Configuration

Configure retry on the agent for automatic backoff of transient errors:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  retry: {
    maxAttempts: 4, // total attempts including the first
    backoff: "exponential", // "exponential" | "linear" | "fixed"
    initialDelay: 500, // ms before first retry
    maxDelay: 30_000, // cap on per-attempt delay
  },
});
```

| Field          | Required | Default | Purpose                                                   |
| -------------- | -------- | ------- | --------------------------------------------------------- |
| `maxAttempts`  | Yes      | —       | Total attempts including the initial one                  |
| `backoff`      | Yes      | —       | Delay strategy: `"exponential"`, `"linear"`, or `"fixed"` |
| `initialDelay` | Yes      | —       | Milliseconds before the first retry                       |
| `maxDelay`     | Yes      | —       | Maximum delay per attempt in milliseconds                 |

Only errors with `retryable === true` are retried. Non-retryable errors (bad config, auth failures, content policy, quota exhaustion) surface immediately regardless of retry settings.

### Which errors are retried?

| Error Class                             | Retried |
| --------------------------------------- | ------- |
| `RateLimitError`                        | Yes     |
| `ServiceUnavailableError`               | Yes     |
| `InternalServerError`                   | Yes     |
| `TimeoutError`                          | Yes     |
| `NetworkError` (when `retryable: true`) | Yes     |
| `AuthenticationError`                   | No      |
| `QuotaExceededError`                    | No      |
| `ModelNotFoundError`                    | No      |
| `ContentPolicyError`                    | No      |
| `ConfigurationError`                    | No      |
| `ContextWindowError`                    | No      |
| All others                              | No      |

## Utilities

### `isRetryableError(err)`

Check if any error (including non-AgentCraft errors) is retryable:

```ts
import { isRetryableError } from "@deskcreate/agentcraft";

function shouldRetry(err: unknown): boolean {
  return isRetryableError(err);
}
```

### `wrapUnknown(err, provider, model)`

Wrap an unknown throw into a typed `ProviderError` — useful when implementing custom providers or adapters:

```ts
import { wrapUnknown } from "@deskcreate/agentcraft";

try {
  await someProviderCall();
} catch (err) {
  throw wrapUnknown(err, "my-provider", "my-model");
}
```

## Structured Error Logging

Every `AgentCraftError` carries a `context` object with structured metadata. Use it for machine-readable log entries:

```ts
import { AgentCraftError } from "@deskcreate/agentcraft";

function logError(err: unknown) {
  if (err instanceof AgentCraftError) {
    console.error(
      JSON.stringify({
        level: "error",
        code: err.code,
        message: err.message,
        retryable: err.retryable,
        context: err.context,
        stack: err.stack,
      }),
    );
  } else if (err instanceof Error) {
    console.error(
      JSON.stringify({
        level: "error",
        message: err.message,
        stack: err.stack,
      }),
    );
  }
}
```

## Cookbook

### Global Error Handler for an Agent Service

Centralize error handling for a request-serving agent:

```ts
import {
  Agent,
  Provider,
  AgentCraftError,
  AuthenticationError,
  RateLimitError,
  QuotaExceededError,
  ContextWindowError,
  ContentPolicyError,
} from "@deskcreate/agentcraft";

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

async function handleRequest(
  prompt: string,
): Promise<
  { ok: true; content: string } | { ok: false; error: string; code: string }
> {
  try {
    const response = await agent.run({ prompt });
    return { ok: true, content: response.content };
  } catch (err) {
    if (err instanceof AuthenticationError) {
      return {
        ok: false,
        error: "Service configuration error",
        code: "auth_error",
      };
    }
    if (err instanceof RateLimitError) {
      return {
        ok: false,
        error: `Rate limited. Try again in ${err.retryAfterSeconds}s`,
        code: "rate_limit",
      };
    }
    if (err instanceof QuotaExceededError) {
      return {
        ok: false,
        error: "Service capacity reached",
        code: "quota_exceeded",
      };
    }
    if (err instanceof ContextWindowError) {
      return {
        ok: false,
        error: "Input too long — please shorten your request",
        code: "too_long",
      };
    }
    if (err instanceof ContentPolicyError) {
      return {
        ok: false,
        error: "Content policy violation",
        code: "content_policy",
      };
    }
    if (err instanceof AgentCraftError) {
      console.error(`[${err.code}]`, err.message, err.context);
      return {
        ok: false,
        error: "An unexpected error occurred",
        code: err.code,
      };
    }
    throw err; // Re-throw truly unexpected errors
  }
}
```

### Per-Provider Fallback

Fall back to a secondary provider when the primary is unavailable:

```ts
import {
  Agent,
  Provider,
  ServiceUnavailableError,
  RateLimitError,
  RetryExhaustedError,
} from "@deskcreate/agentcraft";

async function runWithFallback(prompt: string) {
  const primary = Agent.create({
    model: Provider.openai["gpt-4o"],
    apiKey: process.env.OPENAI_API_KEY!,
    retry: {
      maxAttempts: 2,
      backoff: "fixed",
      initialDelay: 1000,
      maxDelay: 1000,
    },
  });

  try {
    return await primary.run({ prompt });
  } catch (err) {
    if (
      err instanceof ServiceUnavailableError ||
      err instanceof RateLimitError ||
      err instanceof RetryExhaustedError
    ) {
      console.warn("Primary provider unavailable, falling back to Anthropic");
      const fallback = Agent.create({
        model: Provider.anthropic["claude-haiku-4-5"],
        apiKey: process.env.ANTHROPIC_API_KEY!,
      });
      return fallback.run({ prompt });
    }
    throw err;
  }
}
```

## Related

- [Retry Config](../configuration/retry-config.md)
- [Budgets & Cost](../core/budgets-cost.md)
- [Tool Policy](../tools/tool-policy.md)
- [Examples & Cookbook: Error Handling & Retries](../examples-cookbook/error-handling.md)
