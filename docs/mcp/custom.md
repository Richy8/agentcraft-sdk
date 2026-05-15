# Custom MCP Servers

Use `MCPAdapter.connect()` to connect to any MCP server — internal, self-hosted, or third-party — when AgentCraft does not ship a built-in wrapper. Supports `stdio`, `http`, and `sse` transports.

## Transports

| Transport | When to use                                            | Required config    |
| --------- | ------------------------------------------------------ | ------------------ |
| `stdio`   | Local MCP process spawned as a child process.          | `command`, `args?` |
| `http`    | Hosted MCP server over HTTP/JSON-RPC.                  | `url`              |
| `sse`     | Hosted MCP server over Server-Sent Events (streaming). | `url`              |

## Stdio Server

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { MCPAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  MCPAdapter.connect({
    transport: "stdio",
    command: "node",
    args: ["./servers/internal-docs.mjs"],
    allowedTools: ["search_docs", "read_doc"], // only expose these tools to the model
    metadata: {
      trustLevel: "review-required",
      sideEffects: ["read"],
      scopes: ["docs"],
    },
  }),
);

const response = await agent.run({
  prompt: "Search the docs for AgentCraft streaming.",
});
console.log(response.content);
```

### Stdio With npx (Pinned Package)

```ts
import { MCPAdapter } from "@deskcreate/agentcraft/adapters";

// Use rejectUnpinnedPackage to prevent running unpinned npx packages
const filesystemMcp = MCPAdapter.connect({
  transport: "stdio",
  command: "npx",
  args: ["-y", "@modelcontextprotocol/server-filesystem@2026.1.14", "./docs"],
  allowedCommands: ["npx"], // allowlist which commands may be spawned
  rejectUnpinnedPackage: true, // throw if no exact version is pinned
  allowedTools: ["read_file", "list_directory"],
  roots: ["./docs"], // restrict filesystem access to ./docs
  metadata: {
    trustLevel: "review-required",
    sideEffects: ["read"],
    packageName: "@modelcontextprotocol/server-filesystem",
    packagePinned: true,
  },
});
```

### Stdio With Environment Variables

```ts
import { MCPAdapter } from "@deskcreate/agentcraft/adapters";

const internalApiMcp = MCPAdapter.connect({
  transport: "stdio",
  command: "python3",
  args: ["servers/api-gateway.py"],
  env: {
    API_BASE_URL: process.env.INTERNAL_API_URL!,
    API_SECRET: process.env.INTERNAL_API_SECRET!,
  },
  allowedTools: ["get_customer", "list_orders"],
  metadata: {
    trustLevel: "trusted",
    auth: "api-key" as const,
    sideEffects: ["read"],
    requiredSecrets: ["INTERNAL_API_URL", "INTERNAL_API_SECRET"],
  },
});
```

## HTTP Server

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { MCPAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  MCPAdapter.connect({
    transport: "http",
    url: "https://mcp.example.internal/rpc",
    headers: {
      Authorization: `Bearer ${process.env.MCP_API_KEY}`,
    },
    allowedTools: ["search_kb", "create_ticket"],
    timeoutMs: 10_000,
    metadata: {
      trustLevel: "trusted",
      sideEffects: ["read", "write"],
    },
  }),
);

const response = await agent.run({
  prompt: "Search the knowledge base for GDPR requirements.",
});
console.log(response.content);
```

## SSE Server

```ts
import { MCPAdapter } from "@deskcreate/agentcraft/adapters";

const streamingMcp = MCPAdapter.connect({
  transport: "sse",
  url: "https://mcp.example.com/events",
  headers: {
    "X-Api-Key": process.env.MCP_KEY!,
  },
  allowedTools: ["stream_logs", "get_metrics"],
  discovery: "eager", // discover tools immediately on connect (default: lazy)
  metadata: {
    trustLevel: "review-required",
    sideEffects: ["read"],
  },
});
```

## Discovery Modes

```ts
import { MCPAdapter } from "@deskcreate/agentcraft/adapters";

// "lazy" (default): tools are discovered on the first run
const lazy = MCPAdapter.connect({
  transport: "http",
  url: "https://mcp.example.com/rpc",
  discovery: "lazy", // connect on first use — faster startup
});

// "eager": tools are discovered immediately when the adapter is attached
const eager = MCPAdapter.connect({
  transport: "http",
  url: "https://mcp.example.com/rpc",
  discovery: "eager", // connect immediately — fails fast if server is down
});
```

## Tracing MCP Calls

`onTrace` receives lifecycle events for every MCP request/response — useful for debugging or custom observability.

```ts
import { MCPAdapter } from "@deskcreate/agentcraft/adapters";
import type { McpTraceEvent } from "@deskcreate/agentcraft/adapters";

const tracedMcp = MCPAdapter.connect({
  transport: "http",
  url: "https://mcp.example.com/rpc",
  onTrace: (event: McpTraceEvent) => {
    switch (event.type) {
      case "mcp_start":
        console.log(
          `[mcp] connected: ${event.serverName} via ${event.transport}`,
        );
        break;
      case "mcp_request":
        console.log(`[mcp] → ${event.method}`);
        break;
      case "mcp_response":
        console.log(`[mcp] ← ${event.method}`);
        break;
      case "mcp_error":
        console.error(`[mcp] error on ${event.method ?? "?"}: ${event.error}`);
        break;
      case "mcp_close":
        console.log(`[mcp] closed: ${event.serverName}`);
        break;
    }
  },
});
```

## Tool Allowlisting

Always use `allowedTools` to limit which server tools the model can invoke. MCP servers can expose many tools — exposing them all increases attack surface.

```ts
import { MCPAdapter } from "@deskcreate/agentcraft/adapters";

// Bad: exposes everything the server offers
const unrestricted = MCPAdapter.connect({
  transport: "http",
  url: "https://mcp.example.com/rpc",
});

// Good: model can only call these two tools
const restricted = MCPAdapter.connect({
  transport: "http",
  url: "https://mcp.example.com/rpc",
  allowedTools: ["search_docs", "get_article"], // narrow the surface
});
```

## Full Config Reference

### Shared Fields (All Transports)

| Field              | Required | Default  | Purpose                                                           |
| ------------------ | -------- | -------- | ----------------------------------------------------------------- |
| `transport`        | Yes      | None     | `"stdio"`, `"http"`, or `"sse"`.                                  |
| `name`             | No       | Derived  | Custom adapter name for traces.                                   |
| `allowedTools`     | No       | All      | Restrict which server tools the model can call.                   |
| `allowedResources` | No       | All      | Restrict which server resources are accessible.                   |
| `roots`            | No       | None     | Filesystem or resource root boundaries.                           |
| `discovery`        | No       | `"lazy"` | `"lazy"` — connect on first run. `"eager"` — connect immediately. |
| `timeoutMs`        | No       | None     | Request timeout in milliseconds.                                  |
| `signal`           | No       | None     | `AbortSignal` for cancellation.                                   |
| `metadata`         | No       | None     | Trust level, side effects, scopes, required secrets.              |
| `onTrace`          | No       | None     | Callback for MCP lifecycle events.                                |

### Stdio-Only Fields

| Field                   | Required | Purpose                                                 |
| ----------------------- | -------- | ------------------------------------------------------- |
| `command`               | Yes      | Command to spawn (e.g. `"node"`, `"npx"`, `"python3"`). |
| `args`                  | No       | Arguments passed to the command.                        |
| `env`                   | No       | Environment variables passed to the child process.      |
| `allowedCommands`       | No       | Allowlist of commands that may be spawned.              |
| `rejectUnpinnedPackage` | No       | Throw if the spawned package has no pinned version.     |
| `onSecurityWarning`     | No       | Callback when a security warning is detected.           |

### HTTP and SSE Fields

| Field     | Required | Purpose                                       |
| --------- | -------- | --------------------------------------------- |
| `url`     | Yes      | MCP server endpoint URL.                      |
| `headers` | No       | Additional HTTP headers (e.g. Authorization). |

## Related

- [MCP Overview](./overview.md)
- [MCP Security](./security.md)
- [Built-In MCP Wrappers](./built-in.md)
- [MCP Configs](./configs.md)
