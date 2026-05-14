# Production Guardrails

Use this path when the agent can read sensitive content, call tools, write to external systems, or produce customer-visible output.

## Start With

- Example: [Guardrails And Approvals](../../examples.md#guardrails-and-approvals)
- Observability: [Observability Tracing](../../examples.md#observability-tracing)
- Config: [Tools And Guardrails](../config/tools-and-guardrails.md)
- Guides: [Security Model](../security-model.md), [Guardrails](../guardrails.md), [MCP Production Security Checklist](../mcp-security-checklist.md)

## Required Choices

| Config                     | Required               | Purpose                                                           |
| -------------------------- | ---------------------- | ----------------------------------------------------------------- |
| `toolPolicy.readOnly`      | Recommended            | Blocks write or confirmation-gated tools for analysis-only flows. |
| `toolPolicy.approvedTools` | Optional               | Allows specific tools for a run.                                  |
| `onApprovalRequired`       | Recommended for writes | Lets the host app decide whether to allow a side-effecting tool.  |
| `inputGuardrails`          | Optional               | Blocks unsafe tool input before execution.                        |
| `outputGuardrails`         | Optional               | Blocks unsafe tool output before returning it to the model/user.  |
| `trace`                    | Recommended            | Records run/model/tool spans for review and debugging.            |
| `replay`                   | Recommended for tests  | Replays deterministic responses without provider calls.           |

## Tradeoffs

Guardrails add friction where the agent touches real systems. That friction is useful: it makes policy explicit, auditable, and testable.

## Next Steps

Add trace sinks and replay fixtures before live integration tests. Keep secrets in environment variables or secret managers, never in examples.
