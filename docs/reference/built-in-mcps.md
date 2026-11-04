# Built-In MCP Wrappers Reference

Built-in MCP wrappers are convenience factories over `MCPAdapter.connect(...)`. They provide pinned package metadata, default transport, required secret names, side-effect labels, and scopes. You still decide which tools and resources the agent can call via `allowedTools` and `allowedResources`.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { GitHubMCP } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  toolPolicy: { readOnly: true },
}).use(
  GitHubMCP.connect({
    token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN!,
    allowedTools: ["get_pull_request", "get_file_contents", "list_issues"],
  }),
);

const response = await agent.run({
  prompt: "Review PR #88 for type safety issues.",
});
console.log(response.content);
```

## Shared Config (All Wrappers)

| Option             | Required | Default          | Purpose                                                            |
| ------------------ | -------- | ---------------- | ------------------------------------------------------------------ |
| `allowedTools`     | No       | All server tools | Array of tool names to expose. Strongly recommended in production. |
| `allowedResources` | No       | All resources    | Array of resource URIs allowed for resource-capable servers.       |
| `roots`            | No       | Unrestricted     | Filesystem/workspace root paths for scoped servers.                |
| `metadata`         | No       | Wrapper defaults | Extra trust, package, and side-effect labels.                      |
| `onTrace`          | No       | No-op            | Callback receiving lifecycle trace events for observability.       |

## Wrapper Catalog

| Wrapper          | Transport | Required secrets                                 | Side effects        | Scope      |
| ---------------- | --------- | ------------------------------------------------ | ------------------- | ---------- |
| `GitHubMCP`      | stdio     | `GITHUB_TOKEN` or `GITHUB_PERSONAL_ACCESS_TOKEN` | read/write/external | repo       |
| `FirecrawlMCP`   | stdio     | `FIRECRAWL_API_KEY`                              | read/external       | web        |
| `FetchMCP`       | stdio     | None                                             | read/external       | web        |
| `BraveSearchMCP` | stdio     | `BRAVE_API_KEY`                                  | read/external       | web_search |
| `SupabaseMCP`    | stdio     | `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`  | read/write/external | database   |
| `PostgresMCP`    | stdio     | `DATABASE_URL`                                   | read/write          | database   |
| `FilesystemMCP`  | stdio     | None                                             | read/write          | filesystem |
| `SlackMCP`       | stdio     | `SLACK_BOT_TOKEN`, `SLACK_TEAM_ID`               | read/write/external | messages   |

## Per-Wrapper Examples

### GitHubMCP — Read-Only Code Review

```ts
import { GitHubMCP } from "@deskcreate/agentcraft/mcp";

agent.use(
  GitHubMCP.connect({
    token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN!,
    allowedTools: [
      "get_pull_request",
      "get_pull_request_diff",
      "list_pull_requests",
      "get_file_contents",
      "list_issues",
    ],
  }),
);
```

Remove write tools (`create_pr`, `create_issue`) to keep the agent read-only.

### FilesystemMCP — Directory-Scoped Access

```ts
import { FilesystemMCP } from "@deskcreate/agentcraft/mcp";

agent.use(
  FilesystemMCP.connect({
    roots: ["/home/user/projects/myapp/src"],
    allowedTools: ["read_file", "list_directory", "search_files"],
  }),
);
```

### FirecrawlMCP — Web Research

```ts
import { FirecrawlMCP } from "@deskcreate/agentcraft/mcp";

agent.use(
  FirecrawlMCP.connect({
    apiKey: process.env.FIRECRAWL_API_KEY!,
    allowedTools: ["scrape", "search"],
  }),
);
```

### SlackMCP — Channel Monitoring

```ts
import { SlackMCP } from "@deskcreate/agentcraft/mcp";

agent.use(
  SlackMCP.connect({
    token: process.env.SLACK_BOT_TOKEN!,
    allowedTools: ["get_channel_history", "list_channels"],
  }),
);
```

### PostgresMCP — Read-Only SQL

```ts
import { PostgresMCP } from "@deskcreate/agentcraft/mcp";

agent.use(
  PostgresMCP.connect({
    allowedTools: ["query"], // exclude "execute" to prevent writes
  }),
);
// DATABASE_URL is read from environment by the server
```

## Generic Adapters (Non-Wrapper)

For any MCP server without a built-in wrapper, use `MCP.connect()` or `MCPAdapter` directly.

```ts
import { MCP, MCPAdapter } from "@deskcreate/agentcraft/mcp";

// MCP.connect() — higher-level factory (command, url, or package transport)
agent.use(
  MCP.connect({
    command: "npx",
    args: [
      "-y",
      "@modelcontextprotocol/server-filesystem@0.6.2",
      "/path/to/dir",
    ],
    allowedTools: ["read_file", "list_directory"],
  }),
);

// MCP.connect() — HTTP with bearer auth
agent.use(
  MCP.connect({
    url: "https://mcp.internal.company.com/mcp",
    auth: { type: "bearer", token: process.env.MCP_TOKEN! },
    allowedTools: ["search_docs", "get_runbook"],
  }),
);

// MCPAdapter — lower-level, direct transport config
agent.use(
  MCPAdapter.connect({
    transport: "http",
    url: "https://mcp.internal.company.com/mcp",
    allowedTools: ["search_docs"],
  }),
);
```

See [MCP Custom](../mcp/custom.md) for the full `MCP.connect()` API including `timeoutMs`, `name`, and auth options.

## Production Guidance

- **Always use `allowedTools`** — never expose the full tool surface of a server you did not write.
- **Pin stdio package versions** — use `package@x.y.z`, not `package@latest`, to prevent silent tool-surface changes.
- **Treat MCP output as untrusted external data** — validate or redact before using in prompts or downstream systems.
- **Prefer native adapters** when you want typed config, fixed tool contracts, and a narrower blast radius.
- **Use `toolPolicy.readOnly: true`** or `onApprovalRequired` around write-capable MCPs.
- **Set `roots`** for filesystem and resource servers to scope their access.
- **Rotate credentials** on the same schedule as other API keys.

More detail: [MCP Config](../configuration/mcp-config.md), [MCP Overview](../mcp/overview.md), [MCP Security](../production/security-model.md), [MCP cookbook](../examples-cookbook/mcp.md).
