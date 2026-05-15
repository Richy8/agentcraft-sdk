# Tool Authoring

Good tools are small, typed, scoped, and honest about side effects. This page covers how to write tools correctly and how to compose them into reusable adapters.

## Authoring Checklist

| Area         | Rule                                            | Why                                                    |
| ------------ | ----------------------------------------------- | ------------------------------------------------------ |
| Name         | Use stable `snake_case`.                        | Models and tests depend on the name — don't change it. |
| Params       | Validate every input with `type` and `options`. | Prevents malformed tool calls from reaching your code. |
| Results      | Return small structured objects, not raw HTML.  | Easier to cache, trace, audit, and reason about.       |
| Security     | Always set `sideEffect` and `scopes`.           | Enables policy enforcement and tool caching.           |
| Side effects | Use `requiresConfirmation: true` for writes.    | Forces approval before the tool executes.              |

## Basic Read Tool

```ts
import { tool } from "@deskcreate/agentcraft/adapters";

// A simple read tool — cacheable, no approval needed
const getUser = tool({
  name: "get_user",
  description: "Fetch a user profile by ID.",
  security: {
    sideEffect: "read", // safe to cache
    scopes: ["users:read"], // logical scope for audit logs
  },
  params: {
    userId: {
      type: "string",
      description: "The user's unique ID.",
    },
  },
  run: async ({ userId }) => {
    const user = await db.users.findById(userId);
    if (!user) return { error: "User not found" };
    return { id: user.id, name: user.name, email: user.email, plan: user.plan };
  },
});
```

## Tool With Optional Params

```ts
import { tool } from "@deskcreate/agentcraft/adapters";

const listOrders = tool({
  name: "list_orders",
  description: "List recent orders for a customer.",
  security: { sideEffect: "read", scopes: ["orders:read"] },
  params: {
    customerId: {
      type: "string",
      description: "Customer ID.",
    },
    status: {
      type: "string",
      description: "Filter by status.",
      required: false, // model may omit this — defaults to all statuses
      options: ["pending", "shipped", "delivered", "cancelled"],
    },
    limit: {
      type: "number",
      description: "Maximum number of orders to return. Defaults to 10.",
      required: false,
      default: 10,
    },
  },
  run: async ({ customerId, status, limit }) => {
    return await orders.list({ customerId, status, limit: limit ?? 10 });
  },
});
```

## Write Tool With Confirmation

Tools that change state should use `sideEffect: "write"` and `requiresConfirmation: true`. They are blocked by default unless the caller provides an approval callback or `approvedTools` list.

```ts
import { tool } from "@deskcreate/agentcraft/adapters";

const cancelOrder = tool({
  name: "cancel_order",
  description: "Cancel a customer order by ID.",
  security: {
    sideEffect: "write",
    requiresConfirmation: true, // blocked unless explicitly approved
    scopes: ["orders:write"],
  },
  params: {
    orderId: {
      type: "string",
      description: "The order ID to cancel.",
    },
    reason: {
      type: "string",
      description: "Cancellation reason for the audit log.",
      required: false,
    },
  },
  run: async ({ orderId, reason }) => {
    await orders.cancel(orderId, { reason });
    return { cancelled: true, orderId };
  },
});
```

## External Tool

Tools that call third-party APIs should use `sideEffect: "external"`. These are not cached by default.

```ts
import { tool } from "@deskcreate/agentcraft/adapters";

const sendSlackMessage = tool({
  name: "send_slack_message",
  description: "Send a message to a Slack channel.",
  security: {
    sideEffect: "external", // not cacheable — external side effect
    requiresConfirmation: true, // require approval before sending
    scopes: ["slack:post"],
  },
  params: {
    channel: {
      type: "string",
      description: "Slack channel name (e.g. #engineering).",
    },
    message: {
      type: "string",
      description: "Message text to send.",
    },
  },
  run: async ({ channel, message }) => {
    await slack.chat.postMessage({ channel, text: message });
    return { sent: true, channel };
  },
});
```

## Composing Tools Into an Adapter

Group related tools into a reusable adapter with `createAdapter()`. Adapters are attached to agents with `.use()`.

```ts
import { createAdapter, tool } from "@deskcreate/agentcraft/adapters";

const getOrder = tool({
  name: "get_order",
  description: "Fetch an order by ID.",
  security: { sideEffect: "read", scopes: ["orders:read"] },
  params: { orderId: { type: "string", description: "Order ID." } },
  run: async ({ orderId }) => orders.get(orderId),
});

const updateOrderStatus = tool({
  name: "update_order_status",
  description: "Update the status of an order.",
  security: {
    sideEffect: "write",
    requiresConfirmation: true,
    scopes: ["orders:write"],
  },
  params: {
    orderId: { type: "string", description: "Order ID." },
    status: {
      type: "string",
      description: "New status.",
      options: ["pending", "shipped", "delivered", "cancelled"],
    },
  },
  run: async ({ orderId, status }) => orders.updateStatus(orderId, status),
});

// Bundle tools into a named adapter
export const OrdersAdapter = createAdapter({
  name: "orders-adapter",
  tools: [getOrder, updateOrderStatus],
  metadata: {
    kind: "custom",
    auth: "api-key",
    sideEffects: ["read", "write"],
    scopes: ["orders:read", "orders:write"],
  },
});
```

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { OrdersAdapter } from "./adapters/orders-adapter.js";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    onApprovalRequired: async ({ tool: t }) => t.name === "update_order_status",
  },
}).use(OrdersAdapter);

const response = await agent.run({
  prompt: "Get order A123, then mark it as shipped.",
});
console.log(response.content);
```

## Adapter With Lifecycle Hooks

`createAdapter()` also supports `init`, `cleanup`, `onBeforeRun`, and `onAfterRun` for stateful adapters.

```ts
import { createAdapter } from "@deskcreate/agentcraft/adapters";

let dbConnection: DbConnection;

const DatabaseAdapter = createAdapter({
  name: "database-adapter",
  metadata: { kind: "custom", auth: "connection-string" },

  // Called once before the first run
  init: async () => {
    dbConnection = await db.connect(process.env.DATABASE_URL!);
  },

  // Called after the agent is disposed
  cleanup: async () => {
    await dbConnection?.disconnect();
  },

  // Inject shared context into every run's params
  onBeforeRun: async (params) => ({
    ...params,
    system: [params.system, `Database: connected to ${dbConnection.name}`]
      .filter(Boolean)
      .join("\n"),
  }),

  tools: [
    // ... tool definitions that use dbConnection
  ],
});
```

## Dynamic Tool Discovery

When tool definitions are not known at compile time (e.g. fetched from a remote registry), use `getTools` instead of `tools`.

```ts
import { createAdapter } from "@deskcreate/agentcraft/adapters";
import type { ToolDefinition } from "@deskcreate/agentcraft/adapters";

const DynamicAdapter = createAdapter({
  name: "dynamic-tools",

  // Called once per run to discover available tools
  getTools: async (): Promise<ToolDefinition[]> => {
    const specs = await toolRegistry.fetchAvailableTools();
    return specs.map((spec) => ({
      name: spec.name,
      description: spec.description,
      parameters: spec.schema,
      security: { sideEffect: "read" },
      execute: async (args) => toolRegistry.call(spec.name, args),
    }));
  },
});
```

## Return Value Guidelines

| Pattern        | Good                                | Avoid                                           |
| -------------- | ----------------------------------- | ----------------------------------------------- |
| Shape          | Small `{ field: value }` objects    | Raw HTML strings, full page dumps               |
| Errors         | `{ error: "message" }` with context | Throwing unhandled exceptions with stack traces |
| Size           | Under 20KB per result               | Megabyte payloads — use `maxResultBytes` to cap |
| Sensitive data | Strip before returning              | Include tokens, passwords, or PII in results    |

## Related

- [Tools](./tools.md)
- [Tool Policy](./tool-policy.md)
- [Custom Adapters](../adapters/custom.md)
- [Tool Caching](./tool-caching.md)
