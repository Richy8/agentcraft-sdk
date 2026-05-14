# Tools

Tools are typed functions the model may call during a run. You can pass tools directly, attach them through adapters, or get them from MCP servers.

## Minimal Tool

```ts
import { tool } from "agentcraft/adapters";

const lookupOrder = tool({
  name: "lookup_order",
  description: "Look up a customer order by id.",
  security: { sideEffect: "read", scopes: ["orders:read"] },
  params: {
    orderId: { type: "string", description: "Order id." },
  },
  run: async ({ orderId }) => ({ orderId, status: "shipped" }),
});
```

## Configuration

| Field                           | Required    | Default                                      | Purpose                                 |
| ------------------------------- | ----------- | -------------------------------------------- | --------------------------------------- |
| `name`                          | Yes         | None                                         | Stable tool identifier.                 |
| `description`                   | Yes         | None                                         | Helps the model decide when to call it. |
| `params`                        | Yes         | `{}`                                         | Runtime argument validation.            |
| `security.sideEffect`           | Recommended | Treated as external if unknown in cache path | Classifies safety.                      |
| `security.requiresConfirmation` | No          | `false`                                      | Forces approval for sensitive tools.    |
| `run`                           | Yes         | None                                         | Host-owned execution function.          |

## Usage With Agent

```ts
import { Agent, Provider } from "agentcraft";
import { tool } from "agentcraft/adapters";

const lookupOrder = tool({
  name: "lookup_order",
  description: "Look up a customer order by id.",
  security: { sideEffect: "read", scopes: ["orders:read"] },
  params: { orderId: { type: "string", description: "Order id." } },
  run: async ({ orderId }) => ({ orderId, status: "shipped" }),
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Check order A123 and summarize the status.",
  tools: [lookupOrder],
  toolPolicy: { readOnly: true },
});
console.log(response.content);
```

## Related

- [Tool Policy](./tool-policy.md)
- [Tool Authoring](./tool-authoring.md)
- [Built-In Adapters](../reference/built-in-adapters.md)
- [Tool examples](../examples-cookbook/tools-adapters.md)
