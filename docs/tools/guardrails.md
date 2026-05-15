# Guardrails

Guardrails are functions that inspect tool inputs (before execution) or outputs (after execution) and decide whether the call should proceed. Use them to block prompt injection, PII leakage, secrets, unsafe URLs, and destructive actions.

## Built-In Guardrails

| Guardrail                         | Checks                                              | Common use case            |
| --------------------------------- | --------------------------------------------------- | -------------------------- |
| `blockPromptInjectionGuardrail`   | Detects "ignore previous instructions" patterns.    | Web fetch, MCP content.    |
| `blockSecretsGuardrail`           | Detects API keys, Bearer tokens, password patterns. | Logs, external API calls.  |
| `blockPiiGuardrail`               | Detects SSNs, email addresses, phone numbers.       | Customer-facing workflows. |
| `blockUnsafeUrlGuardrail`         | Detects `localhost`, `127.0.0.1`, `*.local` URLs.   | Fetch / browser tools.     |
| `blockDestructiveActionGuardrail` | Blocks write tools that don't require confirmation. | Admin / database tools.    |

All built-in guardrails are exported from `"agentcraft"`.

## Quick Start

```ts
import { Agent, blockPromptInjectionGuardrail, Provider } from "agentcraft";
import { TavilySearchAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

// Block tool results that contain prompt injection attempts
const response = await agent.run({
  prompt: "Search for recent TypeScript releases and summarize.",
  toolPolicy: {
    outputGuardrails: [blockPromptInjectionGuardrail],
    guardrailMode: "enforce", // throw if blocked; use "warn" to log and continue
  },
});

console.log(response.content);
```

## Guardrail Interface

A guardrail is a function that receives a `ToolGuardrailContext` and returns `{ allowed: boolean; reason?: string }`.

```ts
type ToolGuardrail = (
  context: ToolGuardrailContext,
) => ToolGuardrailResult | Promise<ToolGuardrailResult>;

interface ToolGuardrailContext {
  tool: ToolDefinition; // the tool being called
  args?: Record<string, unknown>; // input args (present for input guardrails)
  result?: unknown; // tool result (present for output guardrails)
}

interface ToolGuardrailResult {
  allowed: boolean;
  reason?: string; // surfaced in the audit event and error message
}
```

## Patterns

### Block Prompt Injection in Fetched Content

```ts
import { Agent, blockPromptInjectionGuardrail, Provider } from "agentcraft";
import { FetchAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(FetchAdapter.connect({ allowedDomains: ["docs.example.com"] }));

const response = await agent.run({
  prompt: "Read this doc page and extract the API examples.",
  toolPolicy: {
    // Check fetched content AFTER the tool returns — before the model sees it
    outputGuardrails: [blockPromptInjectionGuardrail],
    guardrailMode: "enforce",
  },
});

console.log(response.content);
```

### Block Secrets in Tool Arguments

```ts
import { Agent, blockSecretsGuardrail, Provider } from "agentcraft";
import { tool } from "agentcraft/adapters";

const logEvent = tool({
  name: "log_event",
  description: "Log an event string to the audit log.",
  security: { sideEffect: "write" },
  params: { message: { type: "string", description: "Event message." } },
  run: async ({ message }) => auditLog.write(message),
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    // Check args BEFORE execution — block if they contain API keys or tokens
    inputGuardrails: [blockSecretsGuardrail],
  },
});

const response = await agent.run({
  prompt: "Log this message: 'User api_key=sk-abc123 connected'",
  tools: [logEvent],
});

console.log(response.content);
// Throws before logging — secret pattern detected in args
```

### Block PII in Tool Results

```ts
import { Agent, blockPiiGuardrail, Provider } from "agentcraft";
import { tool } from "agentcraft/adapters";

const queryDatabase = tool({
  name: "query_database",
  description: "Run a read query on the database.",
  security: { sideEffect: "read" },
  params: { query: { type: "string", description: "SQL SELECT query." } },
  run: async ({ query }) => db.query(query),
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    // Block results that contain SSNs, emails, or phone numbers
    outputGuardrails: [blockPiiGuardrail],
    guardrailMode: "enforce",
  },
});

const response = await agent.run({
  prompt: "Find users who signed up last week.",
  tools: [queryDatabase],
});

console.log(response.content);
```

### Warn Instead of Block

```ts
import { Agent, blockUnsafeUrlGuardrail, Provider } from "agentcraft";
import type { ToolAuditEvent } from "agentcraft/adapters";

const blocked: ToolAuditEvent[] = [];

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    inputGuardrails: [blockUnsafeUrlGuardrail],
    guardrailMode: "warn", // log the event but don't throw — execution continues
    onAuditEvent: (event) => {
      if (event.type === "guardrail_blocked") {
        blocked.push(event);
        console.warn(
          `[guardrail] ${event.phase} blocked: ${event.toolName} — ${event.reason}`,
        );
      }
    },
  },
});

const response = await agent.run({
  prompt: "Fetch http://localhost:8080/internal-api and summarize it.",
});

console.log(response.content);
console.log(`Guardrail warnings: ${blocked.length}`);
```

### Custom Guardrail

Write your own guardrail for domain-specific validation:

```ts
import { Agent, Provider } from "agentcraft";
import type { ToolGuardrail } from "agentcraft/adapters";

// Block any tool call that targets a production environment in staging
const noProductionInStaging: ToolGuardrail = ({ args }) => {
  const text = JSON.stringify(args ?? {}).toLowerCase();
  const isProduction = text.includes("production") || text.includes("prod-db");
  return isProduction && process.env.NODE_ENV !== "production"
    ? { allowed: false, reason: "Production target not allowed in staging" }
    : { allowed: true };
};

// Block results larger than 100KB to prevent context flooding
const maxResultSize: ToolGuardrail = ({ result }) => {
  const bytes = Buffer.byteLength(JSON.stringify(result ?? ""), "utf8");
  return bytes > 100_000
    ? { allowed: false, reason: `Result too large: ${bytes} bytes` }
    : { allowed: true };
};

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    inputGuardrails: [noProductionInStaging],
    outputGuardrails: [maxResultSize],
    guardrailMode: "enforce",
  },
});
```

### Stack Multiple Guardrails

Guardrails run in order. The first one that returns `{ allowed: false }` stops execution.

```ts
import {
  Agent,
  blockPromptInjectionGuardrail,
  blockPiiGuardrail,
  blockSecretsGuardrail,
  Provider,
} from "agentcraft";
import { FetchAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(FetchAdapter.connect({ allowedDomains: ["api.example.com"] }));

const response = await agent.run({
  prompt: "Fetch the user data endpoint and summarize what you find.",
  toolPolicy: {
    // All three run against the output — first failure wins
    outputGuardrails: [
      blockPromptInjectionGuardrail,
      blockSecretsGuardrail,
      blockPiiGuardrail,
    ],
    guardrailMode: "enforce",
  },
});

console.log(response.content);
```

## Guardrail Mode

| Mode        | Behavior when blocked                                    |
| ----------- | -------------------------------------------------------- |
| `"enforce"` | Throws `ToolExecutionError`. The run fails immediately.  |
| `"warn"`    | Emits an audit event and continues. The tool still runs. |

## Related

- [Tool Policy](./tool-policy.md)
- [Approvals](./approvals.md)
- [Security Model](../production/security-model.md)
