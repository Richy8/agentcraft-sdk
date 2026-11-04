# MCP Config

MCP config connects external Model Context Protocol servers through built-in wrapper helpers (`GitHubMCP`, `SlackMCP`, etc.) or the generic `MCP.connect()` factory. Wrappers provide pinned package metadata, default transport, required secret names, and side-effect labels. You always decide which tools the agent can see.

## Attach Pattern

1. **Choose a wrapper** — use a built-in wrapper for known servers, or `MCP.connect()` for custom ones. See [Built-In MCPs](../reference/built-in-mcps.md).
2. **Configure** — pass credentials, `allowedTools`, and other options.
3. **Attach** — call `agent.use(wrapper.connect(config))`. See [Agents](../core/agents.md).
4. **Govern** — apply `toolPolicy` and approval callbacks. See [Tool Policy Config](./tool-policy-config.md).

## Transport Types

| Transport | Use case                                   | How to connect                   |
| --------- | ------------------------------------------ | -------------------------------- |
| stdio     | Local npm package spawned as child process | `MCP.connect({ command, args })` |
| http      | Remote MCP server over HTTP/SSE            | `MCP.connect({ url, auth? })`    |
| package   | Auto-install and run an npm package        | `MCP.connect({ package })`       |

## Built-In Wrappers — Shared Config

All built-in wrappers accept these options:

| Option            | Required | Default          | Purpose                                                            |
| ----------------- | -------- | ---------------- | ------------------------------------------------------------------ |
| `allowedTools`    | No       | All server tools | Tool names to expose. Unlisted tools are hidden from the model.    |
| `requireApproval` | No       | never            | never, always, or array of tool names that require human approval. |

## GitHubMCP

Read and write GitHub repos, issues, PRs, and files.

| Option  | Required | Default | Purpose                                           |
| ------- | -------- | ------- | ------------------------------------------------- |
| `token` | Yes      | None    | GitHub personal access token or fine-grained PAT. |

```ts
import { GitHubMCP } from "@deskcreate/agentcraft/mcp";

agent.use(
  GitHubMCP.connect({
    token: process.env.GITHUB_TOKEN!,
    allowedTools: [
      "get_pull_request",
      "get_pull_request_diff",
      "get_file_contents",
      "list_issues",
    ],
  }),
);
```

Read-only config — safe for code review agents. Add `create_issue` to `allowedTools` to enable write access.

## SlackMCP

Read channel history and post messages via the Slack MCP server.

| Option     | Required | Default | Purpose                     |
| ---------- | -------- | ------- | --------------------------- |
| `botToken` | Yes      | None    | Slack bot token (xoxb-...). |
| `teamId`   | Yes      | None    | Slack workspace team ID.    |

```ts
import { SlackMCP } from "@deskcreate/agentcraft/mcp";

agent.use(
  SlackMCP.connect({
    botToken: process.env.SLACK_BOT_TOKEN!,
    teamId: process.env.SLACK_TEAM_ID!,
    allowedTools: ["list_channels", "get_channel_history"],
  }),
);
```

## FilesystemMCP

Read and write files within scoped directory paths.

| Option         | Required | Default | Purpose                                                 |
| -------------- | -------- | ------- | ------------------------------------------------------- |
| `allowedPaths` | Yes      | None    | Array of absolute or relative directory paths to allow. |

```ts
import { FilesystemMCP } from "@deskcreate/agentcraft/mcp";

agent.use(
  FilesystemMCP.connect({
    allowedPaths: ["./src", "./docs"],
  }),
);
```

## PostgresMCP / SupabaseMCP

Connect to PostgreSQL or Supabase databases.

```ts
import { PostgresMCP, SupabaseMCP } from "@deskcreate/agentcraft/mcp";

// PostgreSQL
agent.use(
  PostgresMCP.connect({
    connectionString: process.env.DATABASE_URL!,
  }),
);

// Supabase
agent.use(
  SupabaseMCP.connect({
    supabaseUrl: process.env.SUPABASE_URL!,
    supabaseKey: process.env.SUPABASE_SERVICE_KEY!,
  }),
);
```

## BraveSearchMCP / FirecrawlMCP

Web search and web scraping.

```ts
import { BraveSearchMCP, FirecrawlMCP } from "@deskcreate/agentcraft/mcp";

agent.use(BraveSearchMCP.connect({ apiKey: process.env.BRAVE_API_KEY! }));
agent.use(FirecrawlMCP.connect({ apiKey: process.env.FIRECRAWL_API_KEY! }));
```

## Generic MCP — Stdio

Use `MCP.connect({ command, args })` for any MCP server installed as an npm package. Always pin the version.

| Option         | Required | Default | Purpose                                                      |
| -------------- | -------- | ------- | ------------------------------------------------------------ |
| `command`      | Yes      | None    | The executable. Almost always npx.                           |
| `args`         | Yes      | None    | Args array. Second element must be a pinned package version. |
| `allowedTools` | No       | All     | Restrict which tools the server exposes.                     |
| `env`          | No       | None    | Extra environment variables passed to the child process.     |

```ts
import { MCP } from "@deskcreate/agentcraft/mcp";

agent.use(
  MCP.connect({
    command: "npx",
    args: [
      "-y",
      "@modelcontextprotocol/server-filesystem@1.2.3", // always pin — never use @latest
      "/path/to/allowed/directory",
    ],
    allowedTools: ["read_file", "list_directory"],
  }),
);
```

**Security:** Unpinned MCP packages can silently update and gain new tools or behaviors. Always pin the version in production.

## Generic MCP — HTTP

Use `MCP.connect({ url })` for remote MCP servers over HTTP or SSE.

| Option         | Required | Default | Purpose                                         |
| -------------- | -------- | ------- | ----------------------------------------------- |
| `url`          | Yes      | None    | Full URL of the MCP server endpoint.            |
| `auth`         | No       | None    | Bearer, API key, or basic auth object.          |
| `allowedTools` | No       | All     | Restrict which server tools the agent can call. |
| `headers`      | No       | None    | Additional HTTP headers.                        |

```ts
import { MCP } from "@deskcreate/agentcraft/mcp";

agent.use(
  MCP.connect({
    url: "https://mcp.internal.company.com/mcp",
    auth: { type: "bearer", token: process.env.INTERNAL_MCP_TOKEN! },
    allowedTools: ["search_docs", "get_runbook", "list_services"],
  }),
);
```

## Security Rules For MCP

1. **Always use `allowedTools`** — never expose the full tool surface of a server you didn't write.
2. **Pin stdio package versions** — use `package@x.y.z`, not `package@latest`.
3. **Treat MCP output as untrusted** — server responses are external input; enable `outputGuardrails`.
4. **Use `toolPolicy.readOnly: true`** for read-only operations.
5. **Use `onApprovalRequired`** to gate write-capable tools on human approval.
6. **Rotate secrets** — MCP server credentials are environment variables; rotate them like API keys.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { GitHubMCP } from "@deskcreate/agentcraft/mcp";

// Production-safe MCP pattern
const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  toolPolicy: {
    readOnly: true, // no writes get through
    maxResultBytes: 40_000, // prevent large MCP payloads
    redactSecrets: true,
  },
}).use(
  GitHubMCP.connect({
    token: process.env.GITHUB_TOKEN!,
    allowedTools: [
      // explicit allowlist — no surprises
      "get_pull_request",
      "get_file_contents",
      "list_issues",
    ],
  }),
);
```

## Combining Multiple MCPs

Chain `.use()` calls for each server:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  GitHubMCP,
  SlackMCP,
  BraveSearchMCP,
} from "@deskcreate/agentcraft/mcp";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
})
  .use(BraveSearchMCP.connect({ apiKey: process.env.BRAVE_API_KEY! }))
  .use(
    GitHubMCP.connect({
      token: process.env.GITHUB_TOKEN!,
      allowedTools: ["get_pull_request", "get_file_contents"],
    }),
  )
  .use(
    SlackMCP.connect({
      botToken: process.env.SLACK_BOT_TOKEN!,
      teamId: process.env.SLACK_TEAM_ID!,
      allowedTools: ["list_channels", "get_channel_history"],
    }),
  );
```

For the full wrapper catalog, see [Built-In MCP Wrappers Reference](../reference/built-in-mcps.md).

More patterns: [MCP cookbook](../examples-cookbook/mcp.md) and [MCP Security](../mcp/security.md).
