# Approvals

Approvals are how write-capable tools become safe enough for production. A tool can declare `requiresConfirmation`, and `ToolPolicy` decides whether that call is allowed.

## Tool Declaration

```ts
import { createAdapter } from "agentcraft/adapters";

const emailAdapter = createAdapter({
  name: "email",
  requires: [],
  getTools: () => [
    {
      name: "send_email",
      description: "Send a customer email.",
      security: {
        sideEffect: "write",
        requiresConfirmation: true,
        scopes: ["email:send"],
      },
      parameters: {
        type: "object",
        properties: {
          to: {
            type: "array",
            items: { type: "string" },
            description: "Recipients.",
          },
          subject: { type: "string", description: "Subject line." },
          body: { type: "string", description: "Email body." },
        },
        required: ["to", "subject", "body"],
      },
      execute: async (args) => ({ sent: true, to: args.to }),
    },
  ],
});
```

## Runtime Approval

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(emailAdapter);

const response = await agent.run({
  prompt: "Draft and send the approved customer update.",
  toolPolicy: {
    onApprovalRequired: async ({ tool, args }) => {
      // Show this to a human or validate against business rules.
      return tool.name === "send_email" && Array.isArray(args?.to);
    },
  },
});

console.log(response.content);
```

## Config

| Field                  | Required  | Default | Purpose                      |
| ---------------------- | --------- | ------- | ---------------------------- |
| `requiresConfirmation` | Tool-side | `false` | Marks sensitive tools.       |
| `approvedTools`        | No        | `[]`    | Static allowlist for a run.  |
| `onApprovalRequired`   | No        | Deny    | Dynamic approval callback.   |
| `readOnly`             | No        | `false` | Blocks approval-gated tools. |

## Related

- [ToolPolicy](./tool-policy.md)
- [Publishing Adapter](../reference/built-in-adapters.md)
- [Production examples](../examples-cookbook/production.md)
