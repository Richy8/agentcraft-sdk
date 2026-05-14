# Custom Skills

Use this path when you need reusable behavior: domain review rules, output standards, tool-use policy, or skill-local tools.

## Start With

- Example: [Custom Skills](../../examples.md#custom-skills)
- Config: [Adapters, MCP, And Skills](../config/adapters-mcp-skills.md)
- Guide: [Skill Authoring](../skill-authoring.md)
- API: [defineSkill](/api/functions/skills.defineSkill.html)

## Required Choices

| Config        | Required    | Purpose                                                                    |
| ------------- | ----------- | -------------------------------------------------------------------------- |
| `name`        | Yes         | Stable skill identifier used in traces, dependency checks, and docs.       |
| `description` | Yes         | Human-facing explanation of when to use the skill.                         |
| `directive`   | Optional    | Enables slash-targeted behavior such as `/support-triage`.                 |
| `requires`    | Optional    | Declares model/runtime capabilities such as `tools` or `vision`.           |
| `metadata`    | Recommended | Makes side effects, statefulness, adapters, and prompt version reviewable. |
| `prompt`      | Recommended | Keeps skill instructions structured and auditable.                         |
| `tools`       | Optional    | Adds skill-local tools that still pass through normal tool policy.         |

## Tradeoffs

Skills are excellent for repeatable behavior. They should not hide product authorization, tenant policy, or irreversible business actions. Keep that policy in the host application and tool guardrails.

## Next Steps

Attach custom skills with `.use()`, add tests for directive behavior, and version `promptVersion` when changing output expectations.
