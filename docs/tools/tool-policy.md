# Tool Policy

`ToolPolicy` controls whether tools can execute, how results are bounded, and what gets audited or redacted. Set it at the agent level (applies to every run) or override it per run.

## Quick Start

```ts
import { Agent, Provider } from "agentcraft";
import { TavilySearchAdapter } from "agentcraft/adapters";

// Read-only policy: tools can only fetch/read, secrets are redacted, results are capped
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    readOnly: true,
    maxResultBytes: 100_000,
    redactSecrets: true,
  },
}).use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

const response = await agent.run({
  prompt: "Research the latest TypeScript release.",
});
console.log(response.content);
```

## Configuration

All fields are optional.

| Field                | Default         | Purpose                                                                             |
| -------------------- | --------------- | ----------------------------------------------------------------------------------- |
| `readOnly`           | `false`         | Blocks any tool with `sideEffect: "write"` or `requiresConfirmation: true`.         |
| `allowSideEffects`   | `false`         | Globally allows all confirmation-gated tools without per-tool approval.             |
| `approvedTools`      | `[]`            | Explicitly approve named tools that require confirmation.                           |
| `dryRun`             | `false`         | Returns the planned tool call without executing it.                                 |
| `timeoutMs`          | None            | Aborts a tool call after this many milliseconds.                                    |
| `maxResultBytes`     | None            | Throws if a tool result exceeds this byte size.                                     |
| `redactSecrets`      | `true`          | Strips API keys, tokens, and secrets from tool results and error messages.          |
| `secretPatterns`     | Built-in        | Custom `RegExp[]` to extend secret redaction beyond the built-in patterns.          |
| `guardrailMode`      | `"enforce"`     | `"enforce"` — blocked calls throw. `"warn"` — blocked calls are logged but proceed. |
| `retry`              | None            | `{ attempts: number; delayMs?: number }` — retry failed tool calls.                 |
| `onApprovalRequired` | Deny by default | `(context) => boolean` — runtime callback to approve or deny a tool call.           |
| `onAuditEvent`       | None            | `(event) => void` — receives every policy lifecycle event.                          |
| `inputGuardrails`    | `[]`            | Array of `ToolGuardrail` functions run before execution.                            |
| `outputGuardrails`   | `[]`            | Array of `ToolGuardrail` functions run after execution.                             |

## Patterns

### Read-Only Agent

```ts
import { Agent, Provider } from "agentcraft";
import { TavilySearchAdapter } from "agentcraft/adapters";

// Blocks any write-side-effect tools — only reads are allowed
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    readOnly: true, // blocks sideEffect:"write" and requiresConfirmation tools
    maxResultBytes: 50_000, // cap result size to 50KB
    redactSecrets: true, // strip any tokens/keys from results
  },
}).use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

const response = await agent.run({
  prompt: "Find recent TypeScript release notes.",
});
console.log(response.content);
```

### Approval Callback

When a tool has `requiresConfirmation: true`, it is blocked by default. Provide `onApprovalRequired` to grant approval at runtime.

```ts
import { Agent, Provider } from "agentcraft";
import { tool } from "agentcraft/adapters";

const publishDraft = tool({
  name: "publish_draft",
  description: "Publish a draft to the CMS.",
  security: { sideEffect: "write", requiresConfirmation: true },
  params: { draftId: { type: "string", description: "Draft ID to publish." } },
  run: async ({ draftId }) => cms.publish(draftId),
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    // Approve only publish_draft — deny all other confirmation-gated tools
    onApprovalRequired: async ({ tool: t, args }) => {
      console.log(`Approval requested for: ${t.name}`, args);
      return t.name === "publish_draft";
    },
  },
});

const response = await agent.run({
  prompt: "Publish draft ID abc-123.",
  tools: [publishDraft],
});
console.log(response.content);
```

### Named Tool Approvals

```ts
import { Agent, Provider } from "agentcraft";

// Pre-approve specific tools by name without a runtime callback
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    approvedTools: ["send_email", "create_draft"], // these bypass the approval gate
  },
});
```

### Dry Run (Preview Without Executing)

```ts
import { Agent, Provider } from "agentcraft";
import { tool } from "agentcraft/adapters";

const deleteRecord = tool({
  name: "delete_record",
  description: "Delete a database record.",
  security: { sideEffect: "write", requiresConfirmation: true },
  params: { id: { type: "string", description: "Record ID." } },
  run: async ({ id }) => db.delete(id),
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    dryRun: true, // returns { dryRun: true, toolName, args } instead of executing
  },
});

const response = await agent.run({
  prompt: "Delete record ID xyz-789.",
  tools: [deleteRecord],
});

// The tool was never actually called — just planned
console.log(response.toolCalls);
```

### Tool Timeout

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    timeoutMs: 5_000, // abort any tool that takes longer than 5 seconds
  },
});
```

### Tool Retry

```ts
import { Agent, Provider } from "agentcraft";

// Retry failing tool calls up to 3 times with a 500ms delay between attempts
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    retry: {
      attempts: 3,
      delayMs: 500,
    },
  },
});
```

### Audit Logging

`onAuditEvent` receives every policy lifecycle event — approvals, guardrail blocks, tool starts, successes, and errors.

```ts
import { Agent, Provider } from "agentcraft";
import type { ToolAuditEvent } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    onAuditEvent: async (event: ToolAuditEvent) => {
      switch (event.type) {
        case "tool_start":
          console.log(`[audit] starting: ${event.toolName}`);
          break;
        case "tool_success":
          console.log(
            `[audit] success: ${event.toolName} (${event.resultBytes} bytes)`,
          );
          break;
        case "tool_error":
          console.error(`[audit] error: ${event.toolName} — ${event.error}`);
          break;
        case "approval_required":
          console.warn(`[audit] approval needed: ${event.toolName}`);
          break;
        case "approval_denied":
          console.warn(`[audit] denied: ${event.toolName}`);
          break;
        case "guardrail_blocked":
          console.warn(
            `[audit] blocked by ${event.phase} guardrail: ${event.toolName} — ${event.reason}`,
          );
          break;
        case "dry_run":
          console.log(`[audit] dry-run: ${event.toolName}`);
          break;
      }
    },
  },
});
```

### Input and Output Guardrails

Guardrails are functions that run before (input) or after (output) tool execution. Return `{ allowed: false, reason }` to block the call.

```ts
import { Agent, Provider } from "agentcraft";
import type { ToolGuardrail } from "agentcraft/adapters";

// Input guardrail: block any call with a suspicious argument
const noSqlInjection: ToolGuardrail = ({ tool: t, args }) => {
  const suspicious = JSON.stringify(args).includes("DROP TABLE");
  return suspicious
    ? { allowed: false, reason: "Suspicious SQL in arguments" }
    : { allowed: true };
};

// Output guardrail: block results that contain PII-like patterns
const noPiiInOutput: ToolGuardrail = ({ result }) => {
  const text = JSON.stringify(result);
  const hasPii = /\b\d{3}-\d{2}-\d{4}\b/.test(text); // SSN pattern
  return hasPii
    ? { allowed: false, reason: "Result contains potential PII" }
    : { allowed: true };
};

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    inputGuardrails: [noSqlInjection],
    outputGuardrails: [noPiiInOutput],
    guardrailMode: "enforce", // "warn" to log instead of throw
  },
});
```

### Custom Secret Patterns

```ts
import { Agent, Provider } from "agentcraft";

// Extend redaction with your own regex patterns
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    redactSecrets: true,
    secretPatterns: [
      /\b[A-Z]{2}\d{6}\b/g, // passport-number-like strings
      /(ssn["']?\s*[:=]\s*)\S+/gi, // SSN field patterns
    ],
  },
});
```

### Per-Run Policy Override

Tool policy set on `agent.run()` is **merged** with the agent-level policy — it does not replace it entirely. `approvedTools`, `inputGuardrails`, `outputGuardrails`, and `secretPatterns` are concatenated; all other fields are overridden.

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    readOnly: true, // agent-level default
  },
});

// This run allows a specific write tool, overriding readOnly for that tool name
const response = await agent.run({
  prompt: "Update the record.",
  toolPolicy: {
    readOnly: false, // override for this run
    approvedTools: ["update_record"], // explicitly allow this one tool
    timeoutMs: 10_000, // add a timeout for this run
  },
});
console.log(response.content);
```

## Audit Event Types

| Event type          | When it fires                                    |
| ------------------- | ------------------------------------------------ |
| `tool_start`        | Before a tool executes.                          |
| `tool_success`      | After a tool returns successfully.               |
| `tool_error`        | After a tool throws an error.                    |
| `approval_required` | When a confirmation-gated tool is about to run.  |
| `approval_granted`  | When approval callback returns `true`.           |
| `approval_denied`   | When approval callback returns `false`.          |
| `guardrail_blocked` | When an input or output guardrail blocks a call. |
| `dry_run`           | When a tool call is captured but not executed.   |

## Related

- [Tools](./tools.md)
- [Guardrails](./guardrails.md)
- [Approvals](./approvals.md)
- [Tool Caching](./tool-caching.md)
- [Tool Policy Config](../configuration/tool-policy-config.md)
