# Tools

Tools are typed functions the model may call during a run. Define them with `tool()`, attach them to an agent or pass them per-run, and AgentCraft handles argument validation, policy enforcement, caching, and tracing.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { tool } from "@deskcreate/agentcraft/adapters";

// Define a typed tool
const lookupOrder = tool("lookup_order", {
  description: "Look up a customer order by ID.",
  sideEffect: "read",
  scopes: ["orders:read"],
  params: {
    orderId: { type: "string", description: "The order ID to look up." },
  },
  run: async ({ orderId }) => ({
    orderId,
    status: "shipped",
    updatedAt: "2024-01-15",
  }),
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Check order A123 and tell me its status.",
  tools: [lookupOrder],
});

console.log(response.content);
// → "Order A123 has been shipped as of January 15, 2024."
```

## `tool()` Helper

`tool()` is the standard way to define a tool. It validates arguments at runtime and infers TypeScript types for your `run` function.

```ts
import { tool } from "@deskcreate/agentcraft/adapters";

const myTool = tool("lookup_customer", {
  description: "Look up a customer profile by ID.",
  sideEffect: "read",
  requiresConfirmation: false,
  scopes: ["customers:read"],
  params: {
    customerId: {
      type: "string",
      description: "The customer ID to inspect.",
    },
  },
  run: async ({ customerId }) => ({
    customerId,
    plan: "growth",
  }),
});
```

## `ToolParam` Fields

Each entry in `params` defines one argument:

| Field         | Type                                                       | Required | Default | Purpose                                    |
| ------------- | ---------------------------------------------------------- | -------- | ------- | ------------------------------------------ |
| `type`        | `"string" \| "number" \| "boolean" \| "array" \| "object"` | Yes      | —       | Argument type. Validated at call time.     |
| `description` | `string`                                                   | Yes      | —       | Describes the argument to the model.       |
| `required`    | `boolean`                                                  | No       | `true`  | Set `false` to make optional.              |
| `options`     | `string[]`                                                 | No       | None    | Restricts to a fixed set of values (enum). |
| `default`     | `unknown`                                                  | No       | None    | Default value hint (informational only).   |

## Tool Spec Fields

| Field                  | Values                                      | Purpose                                                                                                |
| ---------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `description`          | `string`                                    | Shown to the model to describe what the tool does.                                                     |
| `sideEffect`           | `"none" \| "read" \| "write" \| "external"` | Classifies the tool's impact. `"none"` and `"read"` are cacheable. `"write"` and `"external"` are not. |
| `requiresConfirmation` | `boolean`                                   | `true` — the tool is blocked unless explicitly approved via `toolPolicy`.                              |
| `scopes`               | `string[]`                                  | Logical permission scopes — useful for audit logging.                                                  |

## Patterns

### Read-Only Tool (Cacheable)

```ts
import { tool } from "@deskcreate/agentcraft/adapters";

// sideEffect: "read" — results are safe to cache
const getArticle = tool("get_article", {
  description: "Fetch a published article by slug.",
  sideEffect: "read",
  scopes: ["content:read"],
  params: {
    slug: { type: "string", description: "Article slug." },
  },
  run: async ({ slug }) => {
    const article = await db.articles.findBySlug(slug);
    return { title: article.title, body: article.body };
  },
});
```

### Tool With Optional Parameters

```ts
import { tool } from "@deskcreate/agentcraft/adapters";

const searchProducts = tool("search_products", {
  description: "Search the product catalog.",
  sideEffect: "read",
  params: {
    query: { type: "string", description: "Search query." },
    category: {
      type: "string",
      description: "Filter by category.",
      required: false,
    },
    limit: {
      type: "number",
      description: "Max results to return.",
      required: false,
      default: 10,
    },
  },
  run: async ({ query, category, limit }) => {
    return await catalog.search({ query, category, limit: limit ?? 10 });
  },
});
```

### Tool With Enum Options

```ts
import { tool } from "@deskcreate/agentcraft/adapters";

const setTicketPriority = tool("set_ticket_priority", {
  description: "Set the priority level of a support ticket.",
  sideEffect: "write",
  requiresConfirmation: true,
  scopes: ["tickets:write"],
  params: {
    ticketId: { type: "string", description: "Ticket ID." },
    priority: {
      type: "string",
      description: "Priority level.",
      options: ["p0", "p1", "p2", "p3"],
    },
  },
  run: async ({ ticketId, priority }) => {
    await ticketing.setPriority(ticketId, priority);
    return { ticketId, priority, updated: true };
  },
});
```

### Tool Requiring Confirmation (Write Side Effect)

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { tool } from "@deskcreate/agentcraft/adapters";

const deleteRecord = tool("delete_record", {
  description: "Permanently delete a database record.",
  sideEffect: "write",
  requiresConfirmation: true,
  scopes: ["db:delete"],
  params: {
    recordId: { type: "string", description: "Record ID to delete." },
  },
  run: async ({ recordId }) => {
    await db.delete(recordId);
    return { deleted: true, recordId };
  },
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    // Approve delete_record only — deny all other confirmation-gated tools
    onApprovalRequired: async ({ tool: t }) => t.name === "delete_record",
  },
});

const response = await agent.run({
  prompt: "Delete record ID abc-123.",
  tools: [deleteRecord],
});
console.log(response.content);
```

### Agent-Level vs Per-Run Tools

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { tool } from "@deskcreate/agentcraft/adapters";

// Agent-level: available on every run
const agentWithTool = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  tools: [lookupOrder],
});

// Per-run: only for this specific run
const response = await agentWithTool.run({
  prompt: "Look up order B456 and check the product catalog for similar items.",
  tools: [searchProducts],
});
console.log(response.content);
```

### Check Which Tools Were Exposed

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Check order A123.",
  tools: [lookupOrder],
});

console.log(response.selection?.exposedTools); // → ["lookup_order"]
console.log(response.selection?.executedToolCalls); // → 1
console.log(response.toolCalls); // full tool call log
```

## Raw `ToolDefinition` (Without the Helper)

If you need to build tool definitions manually (e.g. from an OpenAPI spec), use `ToolDefinition` directly:

```ts
import type { ToolDefinition } from "@deskcreate/agentcraft/adapters";

const rawTool: ToolDefinition = {
  name: "get_user",
  description: "Fetch a user profile by ID.",
  parameters: {
    type: "object",
    properties: {
      userId: { type: "string", description: "User ID." },
    },
    required: ["userId"],
  },
  security: { sideEffect: "read" },
  execute: async (args) => {
    const { userId } = args as { userId: string };
    return await userService.get(userId);
  },
};
```

## Related

- [Tool Policy](./tool-policy.md)
- [Tool Authoring](./tool-authoring.md)
- [Tool Caching](./tool-caching.md)
- [Guardrails](./guardrails.md)
- [Custom Adapters](../adapters/custom.md)
