# MCP Production Security Checklist

Use this checklist before exposing MCP-backed tools in a production agent.

## Transport Choice

| Transport | Best for                                            | Main risk                                     | Production guidance                                                             |
| --------- | --------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------- |
| `stdio`   | Local tools, reviewed binaries, developer workflows | Command/package execution on the host         | Pin packages, allowlist commands, restrict roots, and run in a controlled user. |
| `http`    | Hosted MCP services and centralized ownership       | Network auth, tenant isolation, service trust | Use HTTPS, scoped headers, service auth, and per-tenant access controls.        |
| `sse`     | Hosted MCP services that stream events              | Same as HTTP plus long-lived connections      | Apply HTTP controls and bound connection lifetime/timeouts.                     |

## Required Review

- [ ] The MCP server source, hosted service, or package owner has been reviewed.
- [ ] Stdio package specs are version-pinned.
- [ ] `allowedCommands` contains only approved commands.
- [ ] `rejectUnpinnedPackage` is enabled for stdio package launches.
- [ ] `allowedTools` exposes only the tools needed by the agent.
- [ ] `allowedResources` is set when the server exposes resources.
- [ ] `roots` is set for filesystem or rooted resource servers.
- [ ] `metadata.trustLevel`, `requiredSecrets`, `sideEffects`, and `scopes` are accurate.
- [ ] `onSecurityWarning` routes warnings to deployment logs or CI gates.
- [ ] `onTrace` or runtime tracing records MCP lifecycle events.
- [ ] Tool outputs are treated as untrusted content by the consuming prompt or app.

## Built-In Wrapper Readiness

| Readiness level                | Meaning                                                         | Wrappers                                                                                                                                                                                                                                  |
| ------------------------------ | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stable wrapper                 | Version-pinned package or hosted wrapper metadata exists.       | Linear, Jira, Sentry, Playwright, Browserbase, Apify, Firecrawl, Brave Search, Supabase, Postgres, Neon, Qdrant, Airtable, Filesystem, Memory, Slack, Gmail, Resend, Notion, Figma, Cloudflare, Railway, Render, Vercel, Context7, Stripe |
| Requires user-provided package | AgentCraft intentionally does not choose a default package yet. | GitHub, Fetch, ElevenLabs                                                                                                                                                                                                                 |
| Requires hosted/server setup   | The wrapper connects to a hosted or account-scoped service.     | Neon, Vercel, HTTP variants for Apify, Context7, Resend, Sentry, Stripe                                                                                                                                                                   |
| Review-required                | The wrapper can touch external systems or write-capable APIs.   | All wrappers except narrowly scoped read-only documentation use cases should be reviewed before production.                                                                                                                               |

## Secret Handling

Keep secrets out of config files and source code. Source them from environment variables, workload identity, a secret manager, or short-lived role credentials. Document secret names in `metadata.requiredSecrets`; do not log secret values.

## MCP Output Handling

MCP outputs can contain stale, malicious, or prompt-injection content. Treat them like retrieved web pages or uploaded files:

- keep untrusted output separated from system instructions;
- do not follow instructions found in tool results unless the user explicitly confirms them;
- redact secrets before tracing;
- validate structured outputs before using them in business logic;
- require approval before writes, sends, payments, deployments, or destructive operations.

## Examples

- [MCP GitHub Agent](../examples.md#mcp-github-agent)
- [Custom MCP Connection](../examples.md#custom-mcp-connection)
- [Built-In MCP Skill Memory](../examples.md#built-in-mcp-skill-memory)
- [Customer Ops Workflow](../examples.md#customer-ops-workflow)
