# Approvals

Approvals make write-capable tools safe for production. A tool that declares `requiresConfirmation: true` is blocked by default — it only executes when the caller explicitly approves it via `ToolPolicy`.

## How It Works

1. A tool is defined with `security: { requiresConfirmation: true }`.
2. When the model calls that tool, AgentCraft checks `ToolPolicy`:
   - If the tool name is in `approvedTools` — approved.
   - If `allowSideEffects: true` — approved globally.
   - If `onApprovalRequired` is provided — calls your callback and uses its return value.
   - Otherwise — denied, and a `ToolExecutionError` is thrown.
3. An audit event fires: `approval_required`, then `approval_granted` or `approval_denied`.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { tool } from "@deskcreate/agentcraft/adapters";

// Tool that requires explicit approval before executing
const sendEmail = tool({
  name: "send_email",
  description: "Send an email to a customer.",
  security: {
    sideEffect: "write",
    requiresConfirmation: true, // blocked by default
    scopes: ["email:send"],
  },
  params: {
    to: { type: "string", description: "Recipient email address." },
    subject: { type: "string", description: "Email subject." },
    body: { type: "string", description: "Email body text." },
  },
  run: async ({ to, subject, body }) => {
    await emailService.send({ to, subject, body });
    return { sent: true, to };
  },
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    // Approve send_email — deny all other confirmation-gated tools
    onApprovalRequired: async ({ tool: t }) => t.name === "send_email",
  },
}).use(/* email adapter or pass tools per-run */);

const response = await agent.run({
  prompt: "Send a welcome email to user@example.com.",
  tools: [sendEmail],
});

console.log(response.content);
```

## Patterns

### Static Allowlist (`approvedTools`)

Pre-approve tool names at agent creation time. Useful when you know at startup which tools are always safe to execute.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    // These tools bypass the approval gate entirely
    approvedTools: ["create_draft", "update_draft"],
  },
});
```

### Dynamic Approval Callback

The `onApprovalRequired` callback receives the full `ToolGuardrailContext` — including the tool definition and the arguments the model passed. Use this to validate arguments before approving.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import type { ToolGuardrailContext } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    onApprovalRequired: async ({ tool: t, args }: ToolGuardrailContext) => {
      // Approve publish_draft only if it's going to the staging channel
      if (t.name === "publish_draft") {
        const channel = args?.channel as string | undefined;
        return channel === "staging"; // deny if targeting production
      }

      // Approve send_email only for internal addresses
      if (t.name === "send_email") {
        const to = args?.to as string | undefined;
        return to?.endsWith("@internal.example.com") ?? false;
      }

      return false; // deny all other confirmation-gated tools
    },
  },
});
```

### Human-in-the-Loop Approval

Route approvals through a real human approval step — useful for high-stakes operations.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    onApprovalRequired: async ({ tool: t, args }) => {
      // Send approval request to your approval system
      const requestId = await approvalSystem.request({
        toolName: t.name,
        args,
        requestedAt: new Date().toISOString(),
      });

      // Wait for a human to approve or deny (with a timeout)
      const approved = await approvalSystem.waitForDecision(requestId, {
        timeoutMs: 30_000, // 30 second timeout
      });

      console.log(`[approval] ${t.name}: ${approved ? "granted" : "denied"}`);
      return approved;
    },
  },
});
```

### Audit Approval Events

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import type { ToolAuditEvent } from "@deskcreate/agentcraft/adapters";

const auditLog: ToolAuditEvent[] = [];

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    approvedTools: ["create_draft"],
    onAuditEvent: (event: ToolAuditEvent) => {
      // Record every approval-related event
      if (
        event.type === "approval_required" ||
        event.type === "approval_granted" ||
        event.type === "approval_denied"
      ) {
        auditLog.push(event);
        console.log(`[audit] ${event.type}: ${event.toolName}`);
      }
    },
  },
});

const response = await agent.run({ prompt: "Create a new draft." });
console.log(response.content);
console.log("Approval events:", auditLog);
```

### Allow All Side Effects Globally

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

// allowSideEffects: true bypasses the confirmation gate for ALL tools
// Only use this in trusted, controlled environments
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    allowSideEffects: true, // dangerous — approves all confirmation-gated tools
  },
});
```

### Per-Run Approval Override

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { tool } from "@deskcreate/agentcraft/adapters";

const deleteDraft = tool({
  name: "delete_draft",
  description: "Permanently delete a draft.",
  security: { sideEffect: "write", requiresConfirmation: true },
  params: { draftId: { type: "string", description: "Draft ID." } },
  run: async ({ draftId }) => drafts.delete(draftId),
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    readOnly: true, // default: no write tools
  },
});

// This specific run overrides the agent-level policy to allow delete_draft
const response = await agent.run({
  prompt: "Delete draft ID abc-123.",
  tools: [deleteDraft],
  toolPolicy: {
    readOnly: false,
    approvedTools: ["delete_draft"],
  },
});

console.log(response.content);
```

## Config Reference

| Field                  | Default         | Purpose                                                                     |
| ---------------------- | --------------- | --------------------------------------------------------------------------- |
| `requiresConfirmation` | `false`         | Declared on the tool — marks it as confirmation-gated.                      |
| `approvedTools`        | `[]`            | Static list of tool names that bypass the approval gate.                    |
| `allowSideEffects`     | `false`         | Globally bypasses confirmation for all tools. Use only in trusted contexts. |
| `onApprovalRequired`   | Deny by default | `(context) => boolean` callback for dynamic per-call approval decisions.    |
| `readOnly`             | `false`         | Blocks all write and confirmation-gated tools. Overrides `approvedTools`.   |

## Related

- [Tool Policy](./tool-policy.md)
- [Guardrails](./guardrails.md)
- [Tool Authoring](./tool-authoring.md)
