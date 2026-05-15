# Tools

Tools are typed functions the model may call during a run. Define them with `tool()`, attach them to an agent or pass them per-run, and AgentCraft handles argument validation, policy enforcement, caching, and tracing.

## Quick Start

```ts
import { Agent, Provider } from "agentcraft";
import { tool } from "agentcraft/adapters";

// Define a typed tool
const lookupOrder = tool({
  name: "lookup_order",
  description: "Look up a customer order by ID.",
  security: { sideEffect: "read", scopes: ["orders:read"] },
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
import { tool } from "agentcraft/adapters";

const myTool = tool({
  name: string,              // stable snake_case identifier
  description: string,       // helps the model decide when to call it
  params: Record<string, ToolParam>, // parameter definitions
  security?: {               // optional — omit for non-sensitive tools
    sideEffect: "none" | "read" | "write" | "external",
    requiresConfirmation?: boolean,
    scopes?: string[],
  },
  run: async (args) => unknown, // typed by params
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

## Security Fields

The `security` object classifies what a tool does so that policy and caching can apply correctly.

| Field                  | Values                                      | Purpose                                                                                                |
| ---------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `sideEffect`           | `"none" \| "read" \| "write" \| "external"` | Classifies the tool's impact. `"none"` and `"read"` are cacheable. `"write"` and `"external"` are not. |
| `requiresConfirmation` | `boolean`                                   | `true` — the tool is blocked unless explicitly approved via `toolPolicy`.                              |
| `scopes`               | `string[]`                                  | Logical permission scopes — useful for audit logging.                                                  |

## Patterns

### Read-Only Tool (Cacheable)

```ts
import { tool } from "agentcraft/adapters";

// sideEffect: "read" — results are safe to cache
const getArticle = tool({
  name: "get_article",
  description: "Fetch a published article by slug.",
  security: { sideEffect: "read", scopes: ["content:read"] },
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
import { tool } from "agentcraft/adapters";

const searchProducts = tool({
  name: "search_products",
  description: "Search the product catalog.",
  security: { sideEffect: "read" },
  params: {
    query: { type: "string", description: "Search query." },
    category: {
      type: "string",
      description: "Filter by category.",
      required: false, // optional — model may omit this
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
import { tool } from "agentcraft/adapters";

const setTicketPriority = tool({
  name: "set_ticket_priority",
  description: "Set the priority level of a support ticket.",
  security: {
    sideEffect: "write",
    requiresConfirmation: true,
    scopes: ["tickets:write"],
  },
  params: {
    ticketId: { type: "string", description: "Ticket ID." },
    priority: {
      type: "string",
      description: "Priority level.",
      options: ["p0", "p1", "p2", "p3"], // model must pick from this list
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
import { Agent, Provider } from "agentcraft";
import { tool } from "agentcraft/adapters";

const deleteRecord = tool({
  name: "delete_record",
  description: "Permanently delete a database record.",
  security: {
    sideEffect: "write",
    requiresConfirmation: true, // blocked by default — requires explicit approval
    scopes: ["db:delete"],
  },
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
import { Agent, Provider } from "agentcraft";
import { tool } from "agentcraft/adapters";

// Agent-level: available on every run
const agentWithTool = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  tools: [lookupOrder], // always available
});

// Per-run: only for this specific run
const response = await agentWithTool.run({
  prompt: "Look up order B456 and check the product catalog for similar items.",
  tools: [searchProducts], // merged with agent-level tools for this run only
});
console.log(response.content);
```

### Check Which Tools Were Exposed

```ts
import { Agent, Provider } from "agentcraft";
import { tool } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Check order A123.",
  tools: [lookupOrder],
});

// See which tools the model had access to and how many it called
console.log(response.selection?.exposedTools); // → ["lookup_order"]
console.log(response.selection?.executedToolCalls); // → 1
console.log(response.toolCalls); // full tool call log
```

## Raw `ToolDefinition` (Without the Helper)

If you need to build tool definitions manually (e.g. from an OpenAPI spec), use `ToolDefinition` directly:

```ts
import type { ToolDefinition } from "agentcraft/adapters";

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
