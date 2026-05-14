# Guardrails Guide

Guardrails can run on tool input or output.

Built-ins include:

- prompt injection
- PII
- secrets
- unsafe URL
- destructive action

Use `guardrailMode: 'enforce'` to block or `guardrailMode: 'warn'` to emit audit events while allowing execution. Guardrail blocks are also represented in trace spans when tracing is enabled.

## Guardrail Config

Guardrails are functions attached through `toolPolicy.inputGuardrails` or `toolPolicy.outputGuardrails`.

| Field              | Required | Values                | Purpose                                                                                                                          |
| ------------------ | -------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `inputGuardrails`  | No       | Guardrail callbacks   | Inspect tool args before execution. Use for prompt injection, unsafe URLs, destructive actions, tenant checks, and scope checks. |
| `outputGuardrails` | No       | Guardrail callbacks   | Inspect tool results before the model sees them. Use for secrets, PII, oversized payloads, or unsafe retrieved content.          |
| `guardrailMode`    | No       | `'enforce'`, `'warn'` | `enforce` blocks failed guardrails. `warn` emits audit events and continues.                                                     |
| `onAuditEvent`     | No       | Callback              | Receives `guardrail_blocked` events with phase and reason.                                                                       |

## Mode Selection

| Mode      | Behavior                                                 | Use when                                                                                            |
| --------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `enforce` | Blocks the tool call or result and raises a typed error. | Production safety boundaries, tenant isolation, write actions, secrets, and destructive operations. |
| `warn`    | Emits an audit event and allows execution to continue.   | Local development, telemetry collection, migration windows, or non-blocking quality checks.         |

Guardrails are a runtime safety layer, not a replacement for product authorization. Applications should still validate user identity, tenant access, business permissions, and data retention policy before passing tools to an agent.
