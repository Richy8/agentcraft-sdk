# Adapter Configs

Adapter config tells AgentCraft how to connect and what boundaries to enforce.

## Common Fields

| Config type      | Required?             | Purpose                         | Example                                      |
| ---------------- | --------------------- | ------------------------------- | -------------------------------------------- |
| Credentials      | Provider-specific     | Authenticates external systems. | `token`, `apiKey`, `accessToken`             |
| Scope allowlists | Optional, recommended | Limits blast radius.            | `allowedRepos`, `allowedDomains`, `rootPath` |
| Defaults         | Optional              | Reduces repeated tool args.     | `defaultCalendarId`, `defaultDatasetId`      |
| Runtime bounds   | Optional              | Controls latency/size.          | `timeoutMs`, `maxResponseBytes`              |

## Required Config Examples

```ts
import {
  FetchAdapter,
  TavilySearchAdapter,
  DatabaseAdapter,
} from "@deskcreate/agentcraft/adapters";
import { GitHubMCP, FilesystemMCP } from "@deskcreate/agentcraft/mcp";

FetchAdapter.connect({
  allowedDomains: ["api.github.com"],
  maxResponseBytes: 500_000,
});

TavilySearchAdapter.connect({
  apiKey: process.env.TAVILY_API_KEY!,
});

// For filesystem access, use FilesystemMCP:
FilesystemMCP.connect({
  allowedPaths: ["./docs"],
});

// For GitHub, use GitHubMCP:
GitHubMCP.connect({
  token: process.env.GITHUB_TOKEN!,
  allowedTools: ["list_issues", "get_file_contents"],
});
```

## Optional Defaults Example

```ts
DatabaseAdapter.connect({
  connectionString: process.env.DATABASE_URL!,
  readOnly: true,
  rowLimit: 100,
  timeoutMs: 5000,
});
```

## Full Catalog

Use [Adapters Overview](./overview.md) for adapter-by-adapter config.
