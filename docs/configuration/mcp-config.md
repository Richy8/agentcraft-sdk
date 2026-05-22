# MCP Config

MCP config connects external Model Context Protocol servers through built-in wrapper helpers (`GitHubMcp`, `Context7Mcp`, etc.) or the generic `McpAdapter`. Wrappers provide pinned package metadata, default transport, required secret names, and side-effect labels. You always decide which tools and resources the agent can see.

## Attach Pattern

| Step           | Action                                          | Required?               | Related page                              |
| -------------- | ----------------------------------------------- | ----------------------- | ----------------------------------------- |
| Choose wrapper | `GitHubMcp`, `Context7Mcp`, etc.                | No — use McpAdapter     | [Built-In MCPs](../reference/built-in-mcps.md)|
| Configure      | Pass credentials, `allowedTools`, `roots`       | Credentials: yes        | See per-wrapper tables below              |
| Attach         | `agent.use(wrapper.connect(config))`            | Yes                     | [Agents](../core/agents.md)               |
| Govern         | `toolPolicy`, approval callbacks                | Recommended             | [Tool Policy Config](./tool-policy-config.md)|

## Transport Types

| Transport | Use case                                              | Config key              |
| --------- | ----------------------------------------------------- | ----------------------- |
| `stdio`   | Local npm package spawned as a child process          | `McpAdapter.stdio(...)` |
| `http`    | Remote MCP server over HTTP/SSE                       | `McpAdapter.http(...)`  |
| `dual`    | Wrapper picks transport based on environment context  | Handled by wrapper      |

## Built-In Wrappers — Shared Config

All built-in wrappers accept these options in addition to their required credentials:

| Option             | Required | Default                 | Purpose                                                               |
| ------------------ | -------- | ----------------------- | --------------------------------------------------------------------- |
| `allowedTools`     | No       | All server tools        | Array of tool names to expose. Unlisted tools are hidden from model.  |
| `allowedResources` | No       | All resources           | Array of resource URIs to allow. For resource-capable servers.        |
| `roots`            | No       | Unrestricted            | Filesystem/workspace root paths for servers that support scoping.     |
| `metadata`         | No       | Wrapper defaults        | Extra trust, package, and side-effect labels.                         |
| `onTrace`          | No       | No-op                   | Callback receiving lifecycle trace events.                            |

## GitHubMcp

Read and write GitHub repos, issues, PRs, and files.

| Option    | Required | Default | Purpose                                          |
| --------- | -------- | ------- | ------------------------------------------------ |
| `token`   | Yes      | None    | GitHub personal access token or fine-grained PAT.|

```ts
import { GitHubMcp } from "@deskcreate/agentcraft/mcp";

agent.use(GitHubMcp.connect({
  token: process.env.GITHUB_TOKEN!,
  allowedTools: [
    "get_pull_request",
    "get_pull_request_diff",
    "get_file_contents",
    "list_issues",
  ],
}));
```

Read-only config — safe for code review agents. Remove `get_file_contents` from `allowedTools` to restrict further, or add `create_issue` for write access.

## Context7Mcp

Fetch live documentation for npm packages and open-source libraries.

| Option | Required | Default | Purpose                                                         |
| ------ | -------- | ------- | --------------------------------------------------------------- |
| None   | —        | —       | No credentials needed. Fetches from the Context7 public index.  |

```ts
import { Context7Mcp } from "@deskcreate/agentcraft/mcp";

agent.use(Context7Mcp.connect());
// or restrict to specific operations:
agent.use(Context7Mcp.connect({
  allowedTools: ["resolve-library-id", "get-library-docs"],
}));
```

Useful when the agent needs to look up library APIs or migration guides at runtime rather than relying on training-time knowledge.

## NotionMcp

Search, read, and write Notion pages and databases.

| Option  | Required | Default | Purpose              |
| ------- | -------- | ------- | -------------------- |
| `token` | Yes      | None    | Notion integration token. |

```ts
import { NotionMcp } from "@deskcreate/agentcraft/mcp";

agent.use(NotionMcp.connect({
  token: process.env.NOTION_TOKEN!,
  allowedTools: ["search", "retrieve_page", "retrieve_block_children"],
}));
```

## SlackMcp

Read channel history and send messages via Slack MCP server.

| Option       | Required | Default | Purpose              |
| ------------ | -------- | ------- | -------------------- |
| `token`      | Yes      | None    | Slack bot token.     |

```ts
import { SlackMcp } from "@deskcreate/agentcraft/mcp";

agent.use(SlackMcp.connect({
  token: process.env.SLACK_BOT_TOKEN!,
  allowedTools: ["get_channel_history", "send_message"],
}));
```

## Generic Stdio MCP

Use `McpAdapter.stdio()` for any MCP server installed as an npm package. Always pin the version.

| Option         | Required | Default | Purpose                                                                  |
| -------------- | -------- | ------- | ------------------------------------------------------------------------ |
| `command`      | Yes      | None    | The executable. Almost always `"npx"`.                                   |
| `args`         | Yes      | None    | Args array. The second element should be the pinned `package@version`.   |
| `allowedTools` | No       | All     | Restrict which tools the server exposes.                                 |
| `env`          | No       | `{}`    | Extra environment variables passed to the child process.                 |

```ts
import { McpAdapter } from "@deskcreate/agentcraft/mcp";

agent.use(McpAdapter.stdio({
  command: "npx",
  args: [
    "-y",
    "@modelcontextprotocol/server-filesystem@1.2.3", // always pin — never use @latest
    "/path/to/allowed/directory",
  ],
  allowedTools: ["read_file", "list_directory"],
}));
```

**Security:** Unpinned MCP packages can silently update and gain new tools or behaviors. Always pin the version in production.

## Generic HTTP MCP

Use `McpAdapter.http()` for remote MCP servers over HTTP or SSE.

| Option          | Required | Default     | Purpose                                                             |
| --------------- | -------- | ----------- | ------------------------------------------------------------------- |
| `url`           | Yes      | None        | Full URL of the MCP server endpoint.                                |
| `headers`       | No       | `{}`        | HTTP headers, typically `{ Authorization: \`Bearer ${token}\` }`.  |
| `allowedTools`  | No       | All         | Restrict which server tools the agent can call.                     |
| `discoveryMode` | No       | `'startup'` | `'startup'` discovers tools once; `'lazy'` defers until first call.|

```ts
import { McpAdapter } from "@deskcreate/agentcraft/mcp";

agent.use(McpAdapter.http({
  url: "https://mcp.internal.company.com/mcp",
  headers: { Authorization: `Bearer ${process.env.INTERNAL_MCP_TOKEN}` },
  allowedTools: ["search_docs", "get_runbook", "list_services"],
  discoveryMode: "startup",
}));
```

## Security Rules For MCP

1. **Always use `allowedTools`** — never expose the full tool surface of a server you didn't write.
2. **Pin stdio package versions** — use `package@x.y.z`, not `package@latest`.
3. **Treat MCP output as untrusted** — the server response should be considered external input.
4. **Add `toolPolicy.readOnly: true`** for read-only operations, or `requireConfirmation` for write-capable servers.
5. **Use `roots`** for filesystem/resource servers to scope the server's access.
6. **Rotate secrets** — MCP server credentials are environment variables; rotate them on the same schedule as API keys.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { GitHubMcp } from "@deskcreate/agentcraft/mcp";

// Production-safe MCP pattern
const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  toolPolicy: {
    readOnly: true,           // no writes get through
    maxResultBytes: 40_000,   // prevent large MCP payloads
    redactSecrets: true,
  },
}).use(GitHubMcp.connect({
  token: process.env.GITHUB_TOKEN!,
  allowedTools: [             // explicit allowlist — no surprises
    "get_pull_request",
    "get_file_contents",
    "list_issues",
  ],
}));
```

## Combining Multiple MCPs

Chain `.use()` calls for each server:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { GitHubMcp, NotionMcp, Context7Mcp } from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
})
  .use(Context7Mcp.connect())
  .use(GitHubMcp.connect({
    token: process.env.GITHUB_TOKEN!,
    allowedTools: ["get_pull_request", "get_file_contents"],
  }))
  .use(NotionMcp.connect({
    token: process.env.NOTION_TOKEN!,
    allowedTools: ["search", "retrieve_page"],
  }));
```

For the full wrapper catalog, see [Built-In MCP Wrappers Reference](../reference/built-in-mcps.md).

More patterns: [MCP cookbook](../examples-cookbook/mcp.md) and [MCP Security](../production/security-model.md).
