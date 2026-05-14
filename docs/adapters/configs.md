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
GitHubAdapter.connect({
  token: process.env.GITHUB_TOKEN!,
  allowedRepos: ["owner/repo"],
});

FileSystemAdapter.connect({
  rootPath: "./docs",
  readOnly: true,
});
```

## Optional Defaults Example

```ts
GoogleCalendarAdapter.connect({
  accessToken: process.env.GOOGLE_ACCESS_TOKEN!,
  defaultCalendarId: "primary",
  timezone: "UTC",
});
```

## Full Catalog

Use [Built-In Adapters Reference](../reference/built-in-adapters.md) for adapter-by-adapter config.
