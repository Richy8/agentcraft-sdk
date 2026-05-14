# Custom Adapters

Use this path when your application has a capability that should be exposed as one or more model-callable tools.

## Start With

- Example: [Custom Adapter](../../examples.md#custom-adapter)
- Scenario: [Adapter Skill Workflow](../../examples.md#adapter-skill-workflow)
- Config: [Tools And Guardrails](../config/tools-and-guardrails.md), [Adapters, MCP, And Skills](../config/adapters-mcp-skills.md)
- Guide: [Adapter Authoring](../adapter-authoring.md)
- API: [createAdapter](/api/functions/adapters.createAdapter.html), [tool](/api/functions/adapters.tool.html)

## Required Choices

| Config                     | Required    | Purpose                                                               |
| -------------------------- | ----------- | --------------------------------------------------------------------- |
| `name`                     | Yes         | Stable adapter identifier used in traces and tool conflict checks.    |
| `tools` or `getTools`      | Yes         | Exposes static or dynamic tools.                                      |
| Tool `description`         | Yes         | Tells the model when to call the tool.                                |
| Tool `params`              | Yes         | Defines and validates tool arguments.                                 |
| Tool `security.sideEffect` | Recommended | Marks tools as `none`, `read`, `write`, or `external`.                |
| Adapter `metadata`         | Recommended | Communicates auth, trust, scopes, read-only status, and side effects. |

## Tradeoffs

Adapters are powerful because they connect the model to real systems. Keep tools small, typed, side-effect labeled, and easy to audit. Use `requiresConfirmation` for writes or customer-visible actions.

## Next Steps

Add deterministic adapter tests with mocked clients before connecting live services.
