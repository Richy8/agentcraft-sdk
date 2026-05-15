# Tool Policy Config

`ToolPolicy` controls how tools are approved, retried, redacted, guarded, and limited. Set it at agent creation time (`Agent.create({ toolPolicy })`) or override per-run (`agent.run({ toolPolicy })`). Per-run policy is merged with the agent-level policy.

## All Fields

| Field                | Default         | Purpose                                                                         |
| -------------------- | --------------- | ------------------------------------------------------------------------------- |
| `approvedTools`      | `[]`            | Tool names that bypass the confirmation gate without a callback.                |
| `allowSideEffects`   | `false`         | Globally approve all confirmation-gated tools. Use only in trusted contexts.    |
| `readOnly`           | `false`         | Block all write and confirmation-gated tools. Overrides `approvedTools`.        |
| `dryRun`             | `false`         | Allow tool calls to be planned but not executed.                                |
| `timeoutMs`          | None            | Maximum milliseconds for a single tool call. Throws if exceeded.                |
| `maxResultBytes`     | None            | Reject tool results larger than this byte count.                                |
| `redactSecrets`      | `true`          | Scan tool results for secrets and redact them before returning to the model.    |
| `secretPatterns`     | Built-in set    | Additional regex patterns for secret redaction (used with `redactSecrets`).     |
| `guardrailMode`      | `"enforce"`     | `"enforce"` blocks tool calls that fail guardrails; `"warn"` logs and proceeds. |
| `retry`              | None            | `{ attempts: number, delayMs?: number }` — retry failed tool calls.             |
| `onApprovalRequired` | Deny by default | `(context) => boolean` callback for dynamic per-call approval decisions.        |
| `onAuditEvent`       | None            | Callback fired for every tool audit event (called, approved, denied, etc.).     |
| `inputGuardrails`    | `[]`            | `ToolGuardrail[]` run before tool execution — block unsafe inputs.              |
| `outputGuardrails`   | `[]`            | `ToolGuardrail[]` run after tool execution — block unsafe outputs.              |

## Patterns

### Read-Only Agent

Block all write and side-effectful tools.

```ts
import { Agent, Provider } from "agentcraft";
import { FileSystemAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    readOnly: true, // blocks all write and confirmation-gated tools
  },
}).use(FileSystemAdapter.connect({ rootPath: "./docs", readOnly: true }));

const response = await agent.run({
  prompt: "List all markdown files in docs.",
});
console.log(response.content);
```

### Static Approval Allowlist

Pre-approve specific tools by name at agent creation.

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    approvedTools: ["create_draft", "update_draft"], // always approved
  },
});
```

### Dynamic Approval Callback

Approve or deny each tool call based on the tool name and arguments.

```ts
import { Agent, Provider } from "agentcraft";
import type { ToolGuardrailContext } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    onApprovalRequired: async ({ tool: t, args }: ToolGuardrailContext) => {
      // Only approve publish_draft for staging channel
      if (t.name === "publish_draft") {
        return (args?.channel as string) === "staging";
      }
      return false; // deny everything else
    },
  },
});
```

### Secret Redaction

Automatically redact secrets from tool results before they reach the model.

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    redactSecrets: true,
    secretPatterns: [
      /sk-[a-zA-Z0-9]{32,}/g, // custom API key pattern
      /ghp_[a-zA-Z0-9]{36}/g, // GitHub personal access tokens
    ],
  },
});
```

### Tool Timeout and Result Size Limit

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    timeoutMs: 5_000, // abort tool calls after 5 seconds
    maxResultBytes: 50_000, // reject tool results over 50 KB
  },
});
```

### Audit Logging

Record every tool event for compliance or observability.

```ts
import { Agent, Provider } from "agentcraft";
import type { ToolAuditEvent } from "agentcraft/adapters";

const auditLog: ToolAuditEvent[] = [];

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    onAuditEvent: (event: ToolAuditEvent) => {
      auditLog.push(event);
      console.log(`[audit] ${event.type}: ${event.toolName}`);
    },
  },
});

await agent.run({ prompt: "Check order status for ORD-123." });
console.log("Events recorded:", auditLog.length);
```

### Active Guardrail Mode

Block tool calls that fail a guardrail, rather than just logging.

```ts
import { Agent, Provider, blockPromptInjectionGuardrail } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    guardrailMode: "enforce", // "enforce" throws on violation; "warn" logs and proceeds
    inputGuardrails: [blockPromptInjectionGuardrail],
  },
});
```

### Tool Retry

Automatically retry failed tool calls with backoff.

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    retry: {
      attempts: 3, // max retry attempts per failed tool call
      delayMs: 500, // wait 500ms between attempts
    },
  },
});
```

### Per-Run Override

Override agent-level policy for a single run.

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: { readOnly: true }, // default: read-only
});

// This run can delete the draft
const response = await agent.run({
  prompt: "Delete draft ID draft-abc.",
  tools: [deleteDraftTool],
  toolPolicy: {
    readOnly: false,
    approvedTools: ["delete_draft"],
  },
});
```

## Related

- [Tool Policy](../tools/tool-policy.md)
- [Guardrails](../tools/guardrails.md)
- [Approvals](../tools/approvals.md)
- [Run Config](./run-config.md)
