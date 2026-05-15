# Dynamic Team Spawning

`AgentTeam.spawn()` creates a team where the root agent decides at runtime which specialist roles to spawn — rather than declaring members up front. The root agent calls an internal `spawn_agent` tool, names a role, gives it a system prompt, and that agent joins the team.

## Quick Start

```ts
import { Agent, Provider } from "agentcraft";
import { AgentTeam } from "agentcraft/team";

const root = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const team = AgentTeam.spawn({
  root,
  maxAgents: 3, // max specialist agents the root can spawn
});

const result = await team.run({
  prompt:
    "Research, draft, and review a short article about TypeScript generics.",
});

console.log(result.content);
console.log(`Rounds: ${result.rounds}, Agents used: ${result.agentsUsed}`);
```

## `AgentTeam.spawn()` vs `AgentTeam.create()`

| Feature            | `AgentTeam.create()`     | `AgentTeam.spawn()`                 |
| ------------------ | ------------------------ | ----------------------------------- |
| Members defined by | You — at setup time      | Root agent — at runtime             |
| Member roles       | Fixed, declared up front | Dynamic, based on the task          |
| Best for           | Predictable pipelines    | Open-ended tasks with unknown scope |
| Spawn limit        | N/A                      | `maxAgents` (default: 5)            |

## Configuration

`AgentTeam.spawn(config: AgentTeamSpawnConfig)` accepts:

| Option                 | Required | Default          | Purpose                                                                  |
| ---------------------- | -------- | ---------------- | ------------------------------------------------------------------------ |
| `root`                 | Yes      | None             | The orchestrating agent that spawns and coordinates members.             |
| `maxAgents`            | No       | `5`              | Maximum specialist agents the root may spawn.                            |
| `roleHints`            | No       | None             | Suggested role names given to the root as starting hints.                |
| `supervisor`           | No       | None             | Optional agent that reviews the final result and requests revisions.     |
| `workspace`            | No       | None             | `AgentWorkspaceInstance` for shared cache, adapters, policy, and events. |
| `rolePolicies`         | No       | `{}`             | Per-role `ToolPolicy` overrides keyed by role string.                    |
| `executionHint`        | No       | `"auto"`         | `"parallel"`, `"sequential"`, `"pipeline"`, or `"auto"`.                 |
| `maxRounds`            | No       | `10`             | Maximum coordination rounds before the team stops.                       |
| `maxRevisions`         | No       | `3`              | Maximum revision cycles per spawned member.                              |
| `maxSupervisorReviews` | No       | `2`              | Maximum supervisor review iterations.                                    |
| `onMemberError`        | No       | `"fail"`         | What to do when a member fails: `"retry"`, `"skip"`, or `"fail"`.        |
| `mode`                 | No       | `"orchestrator"` | `"orchestrator"` or `"planner-executor-reviewer"`.                       |
| `supervisorRubric`     | No       | None             | Custom quality rubric string passed to the supervisor agent.             |
| `roleBudgets`          | No       | `{}`             | Per-role `RunBudget` limits keyed by role string.                        |

## Patterns

### With Role Hints

`roleHints` nudges the root agent toward specific roles without hardcoding members.

```ts
import { Agent, Provider } from "agentcraft";
import { AgentTeam } from "agentcraft/team";

const root = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const team = AgentTeam.spawn({
  root,
  roleHints: ["researcher", "writer", "fact-checker"],
  maxAgents: 3,
});

const result = await team.run({
  prompt: "Research and write an article about the latest TypeScript features.",
});

console.log(result.content);
```

### With a Supervisor

The supervisor reviews the final output from the spawned team and may request revisions.

```ts
import { Agent, Provider } from "agentcraft";
import { AgentTeam } from "agentcraft/team";

const root = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const supervisor = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  system: "You are an editorial director. Approve or reject based on quality.",
});

const team = AgentTeam.spawn({
  root,
  supervisor,
  supervisorRubric:
    "Approve only if the content is factually accurate and under 500 words.",
  maxAgents: 4,
  maxSupervisorReviews: 2,
});

const result = await team.run({
  prompt:
    "Research and write a product announcement for our new streaming API.",
});

console.log(result.content);
```

### With a Shared Workspace

Pass a workspace to share cache, adapters, and tool policy with all spawned agents.

```ts
import { Agent, AgentCache, AgentWorkspace, Provider } from "agentcraft";
import { AgentTeam } from "agentcraft/team";
import { TavilySearchAdapter } from "agentcraft/adapters";

const workspace = AgentWorkspace.create({
  cache: AgentCache.file(".agentcraft/cache", { strategy: "auto" }),
  adapters: [
    TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }),
  ],
  toolPolicy: { readOnly: true },
});

const root = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const team = AgentTeam.spawn({
  root,
  workspace, // Tavily and cache shared with all spawned agents
  roleHints: ["researcher", "writer"],
  maxAgents: 3,
});

const result = await team.run({
  prompt: "Research recent news about Anthropic and write a summary.",
});

console.log(result.content);
```

### With Budget Caps

Apply a `RunBudget` per-run to limit cost and tool calls.

```ts
import { Agent, Provider } from "agentcraft";
import { AgentTeam } from "agentcraft/team";

const root = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const team = AgentTeam.spawn({
  root,
  maxAgents: 3,
  roleBudgets: {
    researcher: { maxToolCalls: 5, maxCost: 0.05 },
    writer: { maxToolCalls: 3, maxCost: 0.03 },
  },
});

const result = await team.run({
  prompt: "Research and write about the benefits of TypeScript.",
  budget: { maxCost: 0.2 }, // overall run budget
});

console.log(result.content);
```

### Reading the Team Trace

```ts
import { Agent, Provider } from "agentcraft";
import { AgentTeam } from "agentcraft/team";
import type { TeamTrace } from "agentcraft";

const root = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const team = AgentTeam.spawn({
  root,
  roleHints: ["researcher", "writer"],
  maxAgents: 3,
});

const result = await team.run({
  prompt: "Research and write about TypeScript 5.x features.",
});

const traces = result.trace as TeamTrace[] | undefined;
if (traces) {
  for (const trace of traces) {
    console.log(`Round ${trace.round} — ${trace.agentRole}`);
    console.log(`  Tokens: ${trace.tokensUsed.total}`);
    console.log(`  Cost: $${trace.cost.toFixed(4)}`);
  }
}

console.log(`Total rounds: ${result.rounds}`);
console.log(`Agents spawned: ${result.agentsUsed}`);
```

## How Spawning Works

1. `AgentTeam.spawn()` sets up the root agent with an internal `spawn_agent` tool.
2. On `team.run()`, the root agent calls `spawn_agent` for each specialist role it decides it needs, up to `maxAgents`.
3. Each spawned agent gets a system prompt the root provides, and joins the team.
4. After spawning, the orchestration continues the same as `AgentTeam.create()`.

If `roleHints` are provided, the root agent receives them as suggestions. If `maxAgents` is reached before all work is done, the root is told it cannot spawn more.

## Related

- [Agent Team](./agent-team.md)
- [Agent Pool](./agent-pool.md)
- [Agent Workspace](./agent-workspace.md)
- [Agents](../core/agents.md)
