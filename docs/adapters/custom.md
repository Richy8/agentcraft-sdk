# Custom Adapters

Use custom adapters when your app owns the capability: internal APIs, product data, tenant-specific workflows, or domain tools.

## Quick Start

```ts
import { Agent, Provider } from "agentcraft";
import { createAdapter, tool } from "agentcraft/adapters";

const OrdersAdapter = createAdapter({
  name: "orders",
  metadata: {
    kind: "custom",
    auth: "custom",
    sideEffects: ["read"],
    scopes: ["orders"],
    readOnly: true,
  },
  tools: [
    tool({
      name: "lookup_order",
      description: "Look up order status.",
      security: { sideEffect: "read", scopes: ["orders:read"] },
      params: { orderId: { type: "string", description: "Order id." } },
      run: async ({ orderId }) => ({ orderId, status: "shipped" }),
    }),
  ],
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(OrdersAdapter);

const response = await agent.run({ prompt: "Look up order 1234." });
console.log(response.content);
```

## Config Checklist

| Area                  | Required    | Default   | Purpose                  |
| --------------------- | ----------- | --------- | ------------------------ |
| `name`                | Yes         | None      | Stable adapter id.       |
| `metadata`            | Recommended | Undefined | Docs and policy context. |
| `tools` or `getTools` | Usually     | Empty     | Exposes capability.      |
| hooks                 | No          | None      | Lifecycle extension.     |

## More Examples

- [Custom adapter example](../examples.md#custom-adapter)
- [Adapter authoring guide](../guides/adapter-authoring.md)
