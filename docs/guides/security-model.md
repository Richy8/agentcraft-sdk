# Security Model Guide

AgentCraft assumes these inputs are untrusted:

- user prompts
- prompt partials and files
- fetched web content
- browser page content
- MCP server output
- tool arguments and tool results
- model output

Security controls include:

- filesystem sandboxing
- URL protocol and domain allowlists
- read-only and dry-run tool policy
- explicit approval for side-effecting tools
- secret redaction from tool args/results/errors/traces
- prompt injection, PII, unsafe URL, secrets, and destructive action guardrails
- MCP command, tool, resource, and root allowlists
- response schema validation and retry repair

Applications should still enforce product-specific authorization, tenant isolation, retention, and review flows above AgentCraft.

## Security-Relevant Config Checklist

| Area                 | Config                                                                    | Recommendation                                                                                                                                           |
| -------------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider credentials | `apiKey`, AWS/Vertex credentials, headers                                 | Source from environment variables, secret managers, workload identity, or short-lived role credentials. Do not commit secrets or place them in examples. |
| Tool side effects    | `security.sideEffect`, `requiresConfirmation`, `toolPolicy.approvedTools` | Mark all writes and risky external actions. Prefer explicit tool allowlists over broad `allowSideEffects`.                                               |
| Read-only workflows  | `toolPolicy.readOnly`, adapter `readOnly`                                 | Use for review, research, retrieval, database analysis, and untrusted user prompts.                                                                      |
| Dry-run workflows    | `toolPolicy.dryRun`                                                       | Use before enabling automations that can mutate files, tickets, repos, databases, email, or third-party systems.                                         |
| External access      | adapter allowlists, MCP `allowedTools`, `allowedResources`, `roots`       | Restrict domains, commands, roots, resources, and tools to the task's real need.                                                                         |
| Redaction            | `redactSecrets`, `secretPatterns`                                         | Keep default redaction enabled and add application-specific token patterns.                                                                              |
| Guardrails           | `inputGuardrails`, `outputGuardrails`, `guardrailMode`                    | Use `enforce` for production safety boundaries and `warn` only for observation or migration.                                                             |
| MCP stdio            | `allowedCommands`, `rejectUnpinnedPackage`, metadata package fields       | Run reviewed binaries or pinned packages. Treat user-provided MCP packages as review-required.                                                           |
| Cost control         | `budget`, `roleBudgets`, `maxToolCalls`                                   | Bound model and tool loops before exposing agents to end users.                                                                                          |
| Observability        | `trace`, `onAuditEvent`, `onTrace`                                        | Export redacted traces and audit events so security decisions can be reviewed after execution.                                                           |

## Production Boundary

AgentCraft can enforce runtime safety controls, but the host application remains responsible for:

- authenticating users and services
- authorizing access to tenant data and external systems
- deciding which tools and adapters a user can invoke
- storing, encrypting, retaining, and deleting traces or tool outputs
- reviewing generated actions before they affect customers, money, infrastructure, or regulated data

The safest integration model is capability-first: construct each agent with only the provider, tools, adapters, skills, budgets, and policies needed for the current task.
