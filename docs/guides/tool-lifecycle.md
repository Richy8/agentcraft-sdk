# Tool Lifecycle Guide

Tools are `ToolDefinition` objects with a name, description, JSON-like parameter schema, optional security metadata, and an async `execute`.

Runtime lifecycle:

1. Adapters and per-run tools are collected.
2. Tool policies merge global and per-run settings.
3. Input guardrails run before execution.
4. Side-effecting tools require approval unless explicitly allowed.
5. Execution is wrapped with timeout, retry, redaction, result byte limits, audit events, and trace spans.
6. Output guardrails run before the result is returned to the model.

Production guidance:

- Mark writes and external side effects with `requiresConfirmation`.
- Use read-only and dry-run policies for exploratory agents.
- Keep tool outputs concise and schema-shaped.
- Never return secrets from tools unless the caller explicitly owns the secret-handling path.

## Tool Definition Fields

| Field                           | Required            | Values                                      | Purpose                                                                     |
| ------------------------------- | ------------------- | ------------------------------------------- | --------------------------------------------------------------------------- |
| `name`                          | Yes                 | Stable tool identifier                      | The model calls this value. Keep it short, specific, and stable.            |
| `description`                   | Yes                 | Plain text                                  | Explains when to use the tool and any important constraints.                |
| `parameters`                    | Yes                 | Object schema                               | Describes required and optional arguments for provider tool calling.        |
| `security.sideEffect`           | Recommended         | `'none'`, `'read'`, `'write'`, `'external'` | Enables policy decisions, approvals, read-only blocking, and audit records. |
| `security.requiresConfirmation` | Required for writes | Boolean                                     | Forces explicit approval unless the caller policy permits the tool.         |
| `security.scopes`               | Recommended         | String array                                | Documents permission domains such as `filesystem:write` or `github:read`.   |
| `execute`                       | Yes                 | Async function                              | Runs the actual operation after policy and input validation.                |

`sideEffect` should describe the real-world consequence, not just whether code mutates memory. Use `external` for network calls, browsing, third-party APIs, or remote reads because those operations can leak intent, identifiers, or timing.

## Tool Policy Fields

| Field                                 | Required | Values                   | Purpose                                                                            |
| ------------------------------------- | -------- | ------------------------ | ---------------------------------------------------------------------------------- |
| `approvedTools`                       | No       | Tool names               | Allows named confirmation-gated tools. Prefer this over broad side-effect access.  |
| `allowSideEffects`                    | No       | Boolean                  | Allows all confirmation-gated tools. Reserve for trusted automation environments.  |
| `dryRun`                              | No       | Boolean                  | Returns the intended call without executing it.                                    |
| `readOnly`                            | No       | Boolean                  | Blocks writes and confirmation-gated tools.                                        |
| `timeoutMs`                           | No       | Milliseconds             | Fails slow tools instead of letting runs hang.                                     |
| `maxResultBytes`                      | No       | Integer                  | Prevents large outputs from flooding model context or traces.                      |
| `redactSecrets`                       | No       | Boolean                  | Redaction is enabled by default. Set `false` only inside controlled test fixtures. |
| `secretPatterns`                      | No       | `RegExp[]`               | Adds app-specific redaction rules.                                                 |
| `guardrailMode`                       | No       | `'enforce'` or `'warn'`  | Blocks or audits failed guardrails.                                                |
| `retry`                               | No       | `{ attempts, delayMs? }` | Retries tool failures. Keep conservative for side-effecting tools.                 |
| `onAuditEvent`                        | No       | Callback                 | Sends tool lifecycle events to logs, metrics, or review queues.                    |
| `onApprovalRequired`                  | No       | Callback                 | Application-owned approval decision for risky tools.                               |
| `inputGuardrails`, `outputGuardrails` | No       | Guardrail callbacks      | Validate args before execution and results before model exposure.                  |

See the [Configuration Reference](./config-reference.md) for examples of how these fields are combined in production runs.
