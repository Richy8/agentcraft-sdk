# AgentTeam Orchestration Guide

`AgentTeam` coordinates an orchestrator, members, optional supervisor, shared adapters, and optional memory.

Supported modes:

- orchestrator-driven member invocation through tools
- parallel member collection
- planner/executor/reviewer prompting
- supervisor approval or revision loops
- role-specific budgets
- handoff guidance
- max rounds and max revisions to prevent loops

Use `trace: true` to receive human-readable `trace` entries and machine-readable `traceSpans`.

## Team Creation Config

| Field                  | Required | Values                                               | Purpose                                                                                                                                          |
| ---------------------- | -------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `orchestrator`         | Yes      | `Agent`                                              | Owns planning, delegation, and final synthesis.                                                                                                  |
| `members`              | Yes      | Team members                                         | Specialist agents callable by role.                                                                                                              |
| `supervisor`           | No       | `Agent`                                              | Reviews outputs and can trigger revision loops.                                                                                                  |
| `sharedAdapters`       | No       | Adapter array                                        | **Deprecated.** Works when no workspace is provided, but ignored (with a warning) when `workspace` is present. Use `workspace.adapters` instead. |
| `sharedSkills`         | No       | Skill array                                          | Adds common prompt/capability behavior across the team.                                                                                          |
| `memory`               | No       | Adapter                                              | Shared memory or context store. Treat retrieved memory as untrusted input.                                                                       |
| `executionHint`        | No       | `'parallel'`, `'sequential'`, `'pipeline'`, `'auto'` | Biases orchestration strategy without forcing impossible task shapes.                                                                            |
| `maxRounds`            | No       | Integer                                              | Caps delegation loops. Set this in production.                                                                                                   |
| `maxRevisions`         | No       | Integer                                              | Caps member revision attempts.                                                                                                                   |
| `maxSupervisorReviews` | No       | Integer                                              | Caps supervisor review loops.                                                                                                                    |
| `onMemberError`        | No       | `'retry'`, `'skip'`, `'fail'`                        | Controls behavior when a member fails.                                                                                                           |
| `mode`                 | No       | `'orchestrator'`, `'planner-executor-reviewer'`      | Selects orchestration prompt pattern.                                                                                                            |
| `supervisorRubric`     | No       | String                                               | Review criteria used by the supervisor.                                                                                                          |
| `roleBudgets`          | No       | Map from role to budget                              | Applies cost, token, run, and tool limits per role.                                                                                              |

`AgentTeam.spawn()` uses `root` and optional `roleHints` instead of explicit `orchestrator` and `members`. Use `create()` when you need deterministic team membership; use `spawn()` for dynamic role formation.

## Execution Hints

| Value        | Use when                                                                         |
| ------------ | -------------------------------------------------------------------------------- |
| `parallel`   | Specialists can work independently and the orchestrator can merge their outputs. |
| `sequential` | Each member depends on the previous member's result.                             |
| `pipeline`   | The workflow has predictable stages such as plan, execute, review, refine.       |
| `auto`       | You want the team to infer the strategy from the task.                           |

For production teams, combine `trace: true`, `roleBudgets`, `maxRounds`, and `onMemberError: 'fail'` or `'retry'` so failures are observable and bounded.
