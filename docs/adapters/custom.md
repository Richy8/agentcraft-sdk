# Custom Adapters

Use custom adapters when your app owns the capability: internal APIs, product data, tenant-specific workflows, or domain tools. `createAdapter()` bundles tools and lifecycle hooks into a reusable unit you can attach to any agent.

## Quick Start

```ts
import { Agent, Provider } from "agentcraft";
import { createAdapter, tool } from "agentcraft/adapters";

// Define tools
const lookupOrder = tool({
  name: "lookup_order",
  description: "Look up order status by ID.",
  security: { sideEffect: "read", scopes: ["orders:read"] },
  params: {
    orderId: { type: "string", description: "Order ID." },
  },
  run: async ({ orderId }) => ({ orderId, status: "shipped", updatedAt: "2024-01-15" }),
});

// Bundle into an adapter
const OrdersAdapter = createAdapter({
  name: "orders",
  metadata: {
    kind: "custom",
    auth: "api-key",
    sideEffects: ["read"],
    scopes: ["orders:read"],
    readOnly: true,
  },
  tools: [lookupOrder],
});

// Attach and run
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(OrdersAdapter);

const response = await agent.run({ prompt: "Check the status of order A123." });
console.log(response.content);
```

## `createAdapter()` Config

| Field         | Required    | Default            | Purpose                                            |
| ------------- | ----------- | ------------------ | -------------------------------------------------- |
| `name`        | Yes         | None               | Stable adapter identifier. Used in traces and logs.|
| `metadata`    | Recommended | None               | Auth type, side effects, scopes, trust level.      |
| `tools`       | Usually     | None               | Static array of `ToolDefinition`s.                 |
| `getTools`    | Alternative | None               | Async function returning tools — for dynamic tools.|
| `requires`    | No          | `["tools"]`        | Model capabilities this adapter needs.             |
| `dependsOn`   | No          | None               | Other adapters that must be attached first.        |
| `init`        | No          | None               | Called once before the first run.                  |
| `cleanup`     | No          | None               | Called when `agent.dispose()` runs.                |
| `onBeforeRun` | No          | None               | Transform `AgentRunParams` before the LLM call.    |
| `onAfterRun`  | No          | None               | Transform `AgentResponse` after the LLM call.      |
| `onAfterStream` | No        | None               | Post-process stream chunks and assembled response. |

## Patterns

### Single Tool Adapter

```ts
import { createAdapter, tool } from "agentcraft/adapters";

const getWeather = tool({
  name: "get_weather",
  description: "Get current weather for a city.",
  security: { sideEffect: "external" },
  params: {
    city: { type: "string", description: "City name." },
    units: {
      type: "string",
      description: "Temperature units.",
      required: false,
      options: ["celsius", "fahrenheit"],
    },
  },
  run: async ({ city, units }) => {
    const data = await weatherApi.current(city, units ?? "celsius");
    return { city, temp: data.temp, condition: data.condition };
  },
});

export const WeatherAdapter = createAdapter({
  name: "weather",
  metadata: { kind: "custom", auth: "api-key", sideEffects: ["external"] },
  tools: [getWeather],
});
```

### Multi-Tool Adapter (Read + Write)

```ts
import { createAdapter, tool } from "agentcraft/adapters";

const getTicket = tool({
  name: "get_ticket",
  description: "Fetch a support ticket by ID.",
  security: { sideEffect: "read", scopes: ["tickets:read"] },
  params: { ticketId: { type: "string", description: "Ticket ID." } },
  run: async ({ ticketId }) => tickets.get(ticketId),
});

const updateTicketStatus = tool({
  name: "update_ticket_status",
  description: "Update the status of a ticket.",
  security: { sideEffect: "write", requiresConfirmation: true, scopes: ["tickets:write"] },
  params: {
    ticketId: { type: "string", description: "Ticket ID." },
    status: {
      type: "string",
      description: "New status.",
      options: ["open", "in-progress", "resolved", "closed"],
    },
  },
  run: async ({ ticketId, status }) => tickets.updateStatus(ticketId, status),
});

export const TicketingAdapter = createAdapter({
  name: "ticketing",
  metadata: {
    kind: "custom",
    auth: "api-key",
    sideEffects: ["read", "write"],
    scopes: ["tickets:read", "tickets:write"],
  },
  tools: [getTicket, updateTicketStatus],
});
```

### Adapter With Lifecycle Hooks

Use `init` and `cleanup` for stateful adapters that need a connection or external session.

```ts
import { createAdapter, tool } from "agentcraft/adapters";

let client: DatabaseClient;

const queryRecords = tool({
  name: "query_records",
  description: "Run a safe read query.",
  security: { sideEffect: "read" },
  params: { query: { type: "string", description: "SQL SELECT statement." } },
  run: async ({ query }) => client.query(query), // uses the shared client
});

export const DatabaseAdapter = createAdapter({
  name: "database",
  metadata: { kind: "custom", auth: "connection-string" },

  // Called once before the first run — set up the connection here
  init: async () => {
    client = await db.connect(process.env.DATABASE_URL!);
    console.log("Database connected");
  },

  // Called when agent.dispose() runs — clean up connections
  cleanup: async () => {
    await client?.disconnect();
    console.log("Database disconnected");
  },

  tools: [queryRecords],
});
```

```ts
import { Agent, Provider } from "agentcraft";
import { DatabaseAdapter } from "./adapters/database.js";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(DatabaseAdapter);

try {
  const response = await agent.run({ prompt: "How many users signed up this week?" });
  console.log(response.content);
} finally {
  await agent.dispose(); // triggers DatabaseAdapter.cleanup()
}
```

### Adapter With `onBeforeRun` Hook

Inject context into every run — useful for tenant ID, user info, or feature flags.

```ts
import { createAdapter } from "agentcraft/adapters";
import type { AgentRunParams } from "agentcraft";

export function createTenantAdapter(tenantId: string) {
  return createAdapter({
    name: "tenant-context",
    metadata: { kind: "custom", auth: "none" },

    // Prepend tenant context to the system prompt on every run
    onBeforeRun: async (params: AgentRunParams): Promise<AgentRunParams> => ({
      ...params,
      system: [
        params.system,
        `Tenant context: tenantId=${tenantId}. Only access data belonging to this tenant.`,
      ]
        .filter(Boolean)
        .join("\n"),
    }),
  });
}
```

```ts
import { Agent, Provider } from "agentcraft";
import { createTenantAdapter } from "./adapters/tenant.js";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(createTenantAdapter("tenant_abc123"));

const response = await agent.run({ prompt: "List the recent orders." });
console.log(response.content);
```

### Adapter With `onAfterRun` Hook

Post-process the response — useful for logging, cost tracking, or response enrichment.

```ts
import { createAdapter } from "agentcraft/adapters";
import type { AgentResponse } from "agentcraft";

export const CostTrackingAdapter = createAdapter({
  name: "cost-tracker",
  metadata: { kind: "custom", auth: "none" },

  onAfterRun: async (response: AgentResponse): Promise<AgentResponse> => {
    // Log cost to your billing system
    await billing.record({
      model: response.model,
      tokens: response.tokensUsed.total,
      cost: response.cost,
      runId: response.runId,
    });
    return response; // must return the response unchanged (or enriched)
  },
});
```

### Dynamic Tool Discovery

Use `getTools` when you don't know the tool list at compile time.

```ts
import { createAdapter } from "agentcraft/adapters";
import type { ToolDefinition } from "agentcraft/adapters";

export const PluginAdapter = createAdapter({
  name: "plugin-registry",
  metadata: { kind: "custom", auth: "api-key" },

  // Called each run to fetch available tools dynamically
  getTools: async (): Promise<ToolDefinition[]> => {
    const plugins = await pluginRegistry.list();
    return plugins.map((plugin) => ({
      name: plugin.name,
      description: plugin.description,
      parameters: plugin.schema,
      security: { sideEffect: "external" },
      execute: async (args) => pluginRegistry.call(plugin.name, args),
    }));
  },
});
```

### Adapter Requiring Another Adapter

Use `dependsOn` when your adapter needs another adapter to be attached first.

```ts
import { createAdapter, tool } from "agentcraft/adapters";

const summarizeDoc = tool({
  name: "summarize_doc",
  description: "Summarize a document fetched from the filesystem.",
  security: { sideEffect: "read" },
  params: { path: { type: "string", description: "File path." } },
  run: async ({ path }) => {
    // depends on FileSystemAdapter being available
    const content = await fs.readFile(path, "utf8");
    return { path, wordCount: content.split(" ").length };
  },
});

export const SummaryAdapter = createAdapter({
  name: "summary-tools",
  dependsOn: [{ adapterName: "filesystem" }], // throws if FileSystemAdapter not attached
  tools: [summarizeDoc],
});
```

## Metadata Fields

`metadata` provides context to policy enforcement, tracing, and documentation.

| Field             | Values                                                                 | Purpose                                     |
| ----------------- | ---------------------------------------------------------------------- | ------------------------------------------- |
| `kind`            | `"custom" \| "native-sdk" \| "mcp-backed" \| "placeholder"`           | Adapter implementation type.                |
| `auth`            | `"none" \| "api-key" \| "oauth" \| "aws" \| "connection-string" \| "custom"` | Authentication method.            |
| `sideEffects`     | `Array<"none" \| "read" \| "write" \| "external">`                    | Highest side-effect level this adapter has. |
| `scopes`          | `string[]`                                                             | Logical permission scopes.                  |
| `readOnly`        | `boolean`                                                              | Hint that this adapter never writes.        |
| `trustLevel`      | `"trusted" \| "review-required" \| "untrusted"`                       | For audit and policy decisions.             |
| `requiredSecrets` | `string[]`                                                             | Environment variable names needed.          |

## Related

- [Tools](../tools/tools.md)
- [Tool Authoring](../tools/tool-authoring.md)
- [Tool Policy](../tools/tool-policy.md)
- [Built-In Adapters](./built-in.md)
