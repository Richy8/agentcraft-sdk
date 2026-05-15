# AgentTeam Config

`AgentTeam` coordinates multiple agents. Use it when a task benefits from specialist roles, parallel collection, review loops, or supervisor approval.

| Field                                               | Required           | Purpose                                      | How it changes behavior                                             | Use case                                                 |
| --------------------------------------------------- | ------------------ | -------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------- |
| `orchestrator`                                      | Yes for `create()` | Plans and synthesizes work                   | Strong orchestrators improve delegation and final answer quality.   | [Agent team](../../examples.md#agent-team)               |
| `members`                                           | Yes for `create()` | Specialist agents                            | More members add capability but can increase cost and coordination. | [Agent team](../../examples.md#agent-team)               |
| `root`                                              | Yes for `spawn()`  | Seed agent for dynamic teams                 | Lets role hints create team shape.                                  | [Agent team spawn](../../examples.md#agent-team-spawn)   |
| `supervisor`                                        | No                 | Review agent                                 | Adds quality control and possible revisions.                        | [Agent team](../../examples.md#agent-team)               |
| `sharedSkills`                                      | No                 | Shared skills                                | Avoids duplicating common skills across members.                    | [Skill composition](../../examples.md#skill-composition) |
| `sharedAdapters` *(deprecated)*                     | No                 | Deprecated — use `workspace.adapters`        | Works without a workspace, but is ignored (with a warning) when workspace is present. | — |
| `memory`                                            | No                 | Shared context store                         | Can improve continuity; treat stored content as untrusted.          | [Agent team](../../examples.md#agent-team)               |
| `executionHint`                                     | No                 | `parallel`, `sequential`, `pipeline`, `auto` | Biases orchestration strategy.                                      | [Agent team](../../examples.md#agent-team)               |
| `maxRounds`, `maxRevisions`, `maxSupervisorReviews` | No                 | Loop limits                                  | Prevents runaway agent coordination.                                | [Agent team](../../examples.md#agent-team)               |
| `onMemberError`                                     | No                 | `retry`, `skip`, `fail`                      | Controls partial failure behavior.                                  | [Agent team](../../examples.md#agent-team)               |
| `roleBudgets`                                       | No                 | Per-role budgets                             | Prevents one specialist from consuming the whole run budget.        | [Cost budgeting](../../examples.md#cost-budgeting)       |

Use teams for complex workflows. Omit teams for simple single-agent tasks because multi-agent orchestration adds latency, cost, and review complexity.
