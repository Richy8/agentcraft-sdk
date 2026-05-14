# Adapter Authoring Guide

Adapters expose tools and optional lifecycle hooks.

Best practices:

- declare static tool names when possible
- include metadata for kind, auth, trust level, side effects, scopes, and read-only behavior
- validate every input before side effects
- use root/domain/protocol allowlists
- normalize third-party errors into `ToolExecutionError` or `ConfigurationError`
- keep outputs small, structured, and redacted
- add mocked contract tests for every tool

Use `createAdapter()` and `tool()` for local consistency.

## Adapter Config Shape

`createAdapter()` accepts a small, explicit contract:

| Field           | Required    | Purpose                                                                                                |
| --------------- | ----------- | ------------------------------------------------------------------------------------------------------ |
| `name`          | Yes         | Stable adapter name for traces, dependency checks, and diagnostics.                                    |
| `requires`      | No          | Capability requirements such as `tools`, `vision`, `audio`, `video`, or `files`. Defaults to `tools`.  |
| `tools`         | No          | Static tool definitions. Use when tool names are known at construction time.                           |
| `getTools`      | No          | Dynamic tool discovery. Use for MCP, remote catalogs, or adapters whose tools depend on runtime state. |
| `dependsOn`     | No          | Declares local dependencies. Useful for composed adapters or skills.                                   |
| `metadata`      | Recommended | Security and maturity metadata for review, docs, and audit output.                                     |
| Lifecycle hooks | No          | `init`, `cleanup`, `onBeforeRun`, `onAfterRun`, and `onAfterStream`.                                   |

## Metadata Fields

| Field             | Values                                                                       | Purpose                                                                   |
| ----------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `kind`            | `'placeholder'`, `'mcp-backed'`, `'native-sdk'`, `'custom'`                  | Indicates implementation path and maturity.                               |
| `auth`            | `'none'`, `'api-key'`, `'oauth'`, `'aws'`, `'connection-string'`, `'custom'` | Describes credential handling.                                            |
| `trustLevel`      | `'trusted'`, `'review-required'`, `'untrusted'`                              | Communicates whether the adapter needs explicit review before production. |
| `sideEffects`     | `none`, `read`, `write`, `external` array                                    | Declares the highest-risk operations exposed by the adapter.              |
| `scopes`          | String array                                                                 | Documents permission domains.                                             |
| `requiredSecrets` | String array                                                                 | Lists secret names required to connect. Never put secret values here.     |
| `readOnly`        | Boolean                                                                      | Signals whether the adapter is intentionally non-mutating.                |

## Built-In Adapter Config Patterns

| Adapter type               | Typical required config                                   | Important optional config                      | Notes                                                                                            |
| -------------------------- | --------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Filesystem                 | `rootPath`                                                | `readOnly`, `allowedExtensions`                | Always scope to a project or tenant directory. Prefer `readOnly` for review and retrieval flows. |
| Fetch/search               | API key or allowlisted base settings depending on adapter | Domain/protocol allowlists, result limits      | Treat fetched content as untrusted and run output guardrails before exposing it to the model.    |
| Database                   | Connection or query executor                              | `readOnly`, query limits                       | Prefer read-only credentials for analysis. Writes should require explicit confirmation.          |
| Browser                    | Browser/page/session config                               | Domain allowlists, headless settings, timeouts | Browser content and page actions are untrusted. Click/type operations are side-effecting.        |
| GitHub/SaaS                | API token                                                 | repo/workspace allowlists, default owner/repo  | Use least-privilege tokens and avoid broad org-level secrets in general-purpose agents.          |
| Storage/vector/audio/image | Provider credentials                                      | bucket/index/model defaults, region/base URL   | Keep generated or retrieved payloads bounded so they do not flood model context.                 |

Adapter APIs should fail closed: missing allowlists, malformed inputs, oversized outputs, or unknown side effects should produce a typed error instead of a best-effort external call.
