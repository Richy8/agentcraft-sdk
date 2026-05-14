# Dynamic Team Spawning

Dynamic spawning lets a team create specialist members during a run when the task requires a role that was not declared up front.

## Purpose

| Need            | Dynamic spawning helps            | Guardrail    | Related page                                     |
| --------------- | --------------------------------- | ------------ | ------------------------------------------------ |
| Unknown scope   | Create roles from the prompt      | Spawn limits | [Run Config](../configuration/run-config.md)     |
| Specialist work | Add reviewer, researcher, analyst | Tool policy  | [Tool Policy](../tools/tool-policy.md)           |
| Cost control    | Spawn only when useful            | Budget caps  | [Budgets](../core/budgets-cost.md)               |
| Traceability    | Record spawned role and reason    | Trace sink   | [Observability](../core/observability-replay.md) |

## Usage

```ts
import { Agent, Provider } from "agentcraft";
import { AgentTeam } from "agentcraft/team";

const apiKey = process.env.OPENAI_API_KEY ?? "";

const orchestrator = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey,
});
const leadAgent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey,
});

const team = AgentTeam.create({
  orchestrator,
  members: [
    { role: "lead", agent: leadAgent, description: "Lead the research." },
  ],
  dynamicSpawning: {
    enabled: true,
    maxAgents: 3,
  },
});

const result = await team.run({
  prompt: "Research, draft, SEO-review, and publish-QA this article plan.",
});
console.log(result.content);
```

## Configuration

| Option           | Required | Default         | Purpose                                  |
| ---------------- | -------- | --------------- | ---------------------------------------- |
| `enabled`        | No       | `false`         | Allows runtime specialist creation.      |
| `maxAgents`      | No       | Runtime default | Prevents unbounded fan-out.              |
| `allowedRoles`   | No       | Undefined       | Limits spawned role categories.          |
| `sharedAdapters` | No       | `[]`            | Controls what spawned agents can access. |

## Local Examples

Use dynamic spawning with a hard budget:

```ts
await team.run({
  prompt: "Create a launch content plan and review risks.",
  budget: { maxToolCalls: 8, maxCost: 0.4 },
});
```

More variants: [AgentTeam config](../guides/config/agentteam.md) and [orchestration cookbook](../examples-cookbook/orchestration.md).
