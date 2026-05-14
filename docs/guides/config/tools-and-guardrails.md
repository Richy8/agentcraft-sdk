# Tools And Guardrails Config

Tools let the model ask the application to do work. Guardrails and policy decide whether that work is allowed, how it is audited, and what the model can see afterwards.

## Tool Definition

| Field                           | Purpose                     | How changing it changes behavior                                                          | Use case                                                               |
| ------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `name`                          | Provider-visible tool id    | Stable names improve model selection and trace readability.                               | [Custom adapter](../../examples.md#custom-adapter)                     |
| `description`                   | Model-facing selection hint | Better descriptions reduce wrong tool calls.                                              | [Custom adapter](../../examples.md#custom-adapter)                     |
| `parameters`                    | Tool argument schema        | Constrains arguments and improves provider tool calling.                                  | [Streaming with tools](../../examples.md#streaming-with-tools)         |
| `security.sideEffect`           | Risk label                  | Drives read-only blocking and audit context. Values: `none`, `read`, `write`, `external`. | [Guardrails and approvals](../../examples.md#guardrails-and-approvals) |
| `security.requiresConfirmation` | Approval gate               | Forces approval unless policy explicitly allows the tool.                                 | [Filesystem safe agent](../../examples.md#filesystem-safe-agent)       |
| `security.scopes`               | Permission labels           | Makes tool access reviewable and policy-friendly.                                         | [GitHub review agent](../../examples.md#github-review-agent)           |

## Tool Policy

| Field                                 | Purpose                                     | Use when                                                                |
| ------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------- |
| `approvedTools`                       | Allows specific confirmation-gated tools.   | A user approved exactly one operation.                                  |
| `allowSideEffects`                    | Allows side-effecting tools broadly.        | Trusted automation only. Prefer narrow approvals.                       |
| `dryRun`                              | Returns intended call without execution.    | Preview/review flows.                                                   |
| `readOnly`                            | Blocks writes and confirmation-gated tools. | Research, review, and untrusted prompts.                                |
| `timeoutMs`                           | Caps tool runtime.                          | User-facing workflows.                                                  |
| `maxResultBytes`                      | Blocks oversized tool output.               | Retrieval, browser, database, and MCP tools.                            |
| `redactSecrets`, `secretPatterns`     | Removes secrets from outputs/errors/traces. | Production and logs.                                                    |
| `guardrailMode`                       | `enforce` blocks; `warn` audits.            | Rollout, policy migration, or hard safety boundaries.                   |
| `inputGuardrails`, `outputGuardrails` | Validate tool args/results.                 | Prompt injection, PII, secrets, unsafe URLs, destructive action checks. |

## Benefits

Use tools when the model needs external facts or actions. Omit tools when a task can be answered from the prompt alone. Prefer per-run tools so a model only sees the capability it needs.
