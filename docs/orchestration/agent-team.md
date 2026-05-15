# Agent Team

`AgentTeam` coordinates multiple named agents around a shared task. Each agent has a role — the orchestrator plans and merges, members execute their specific responsibilities.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { AgentTeam } from "@deskcreate/agentcraft/team";

const orchestrator = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  name: "orchestrator",
});

const writer = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  name: "writer",
  system: "You are a clear, concise content writer.",
});

const reviewer = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  name: "reviewer",
  system: "You are a critical reviewer. Check for accuracy and clarity.",
});

const team = AgentTeam.create({
  orchestrator,
  members: [
    { role: "writer", agent: writer, description: "Draft the content." },
    {
      role: "reviewer",
      agent: reviewer,
      description: "Review quality and evidence.",
    },
  ],
});

const result = await team.run({
  prompt: "Write and review a short article about TypeScript generics.",
});

console.log(result.content);
console.log(`Rounds: ${result.rounds}, Agents used: ${result.agentsUsed}`);
```

## Configuration

| Option                 | Required | Default          | Purpose                                                                                                                         |
| ---------------------- | -------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `orchestrator`         | Yes      | None             | Plans the work, assigns tasks to members, and merges results.                                                                   |
| `members`              | Yes      | None             | Array of `{ role, agent, description? }` — at least one required.                                                               |
| `supervisor`           | No       | None             | Optional agent that reviews the final result and requests revisions.                                                            |
| `workspace`            | No       | None             | Propagates cache, adapters, tool policy, and events to all members. Use `workspace.adapters` to share adapters across the team. |
| `rolePolicies`         | No       | `{}`             | Per-role `ToolPolicy` overrides keyed by member role string.                                                                    |
| `sharedSkills`         | No       | `[]`             | Skills attached to every member agent.                                                                                          |
| `executionHint`        | No       | `"auto"`         | `"parallel"`, `"sequential"`, `"pipeline"`, or `"auto"`.                                                                        |
| `maxRounds`            | No       | `10`             | Maximum coordination rounds before the team stops.                                                                              |
| `maxRevisions`         | No       | `3`              | Maximum revision cycles per member.                                                                                             |
| `maxSupervisorReviews` | No       | `2`              | Maximum supervisor review iterations.                                                                                           |
| `onMemberError`        | No       | `"fail"`         | What to do when a member fails: `"retry"`, `"skip"`, or `"fail"`.                                                               |
| `mode`                 | No       | `"orchestrator"` | `"orchestrator"` or `"planner-executor-reviewer"`.                                                                              |
| `supervisorRubric`     | No       | None             | Custom rubric string given to the supervisor agent.                                                                             |
| `roleBudgets`          | No       | `{}`             | Per-role `RunBudget` limits keyed by member role string.                                                                        |

## TeamResponse Fields

`team.run()` returns `TeamResponse` which extends `AgentResponse` with:

| Field        | Type          | Purpose                                 |
| ------------ | ------------- | --------------------------------------- |
| `rounds`     | `number`      | Number of coordination rounds executed. |
| `agentsUsed` | `number`      | Number of agents that participated.     |
| `trace`      | `TeamTrace[]` | Per-round execution traces.             |

Each `TeamTrace` has: `round`, `agentRole`, `input`, `output`, `cost`, `tokensUsed`.

## Patterns

### Two-Agent Draft and Review

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { AgentTeam } from "@deskcreate/agentcraft/team";

const orchestrator = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const writer = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  system: "Write concise, well-structured content.",
});

const reviewer = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  system:
    "Review for accuracy, clarity, and completeness. Be specific about what needs improvement.",
});

const team = AgentTeam.create({
  orchestrator,
  members: [
    { role: "writer", agent: writer, description: "Draft the article." },
    {
      role: "reviewer",
      agent: reviewer,
      description: "Review and approve or request revisions.",
    },
  ],
  maxRounds: 3, // at most 3 orchestration rounds
  maxRevisions: 2, // at most 2 revision cycles
  onMemberError: "fail", // fail fast if any member throws
});

const result = await team.run({
  prompt:
    "Write and review a 300-word article about the benefits of TypeScript.",
});

console.log(result.content);
console.log(
  `Completed in ${result.rounds} rounds using ${result.agentsUsed} agents.`,
);
```

### With a Supervisor Agent

The supervisor reviews the final result and may request revisions from the team.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { AgentTeam } from "@deskcreate/agentcraft/team";

const orchestrator = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const writer = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  system: "Write clearly and concisely.",
});

const supervisor = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  system:
    "You are an editorial director. Approve or reject content based on quality and accuracy.",
});

const team = AgentTeam.create({
  orchestrator,
  supervisor,
  members: [
    { role: "writer", agent: writer, description: "Draft the content." },
  ],
  supervisorRubric:
    "Approve only if the content is factually accurate, well-structured, and under 400 words.",
  maxSupervisorReviews: 2,
});

const result = await team.run({
  prompt: "Write an article about AgentCraft's streaming support.",
});

console.log(result.content);
```

### With Shared Workspace

`AgentWorkspace` propagates cache, adapters, tool policy, and events to all team members.

```ts
import {
  Agent,
  AgentCache,
  AgentWorkspace,
  Provider,
} from "@deskcreate/agentcraft";
import { AgentTeam } from "@deskcreate/agentcraft/team";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";

const workspace = AgentWorkspace.create({
  cache: AgentCache.file(".agentcraft/cache", { strategy: "auto" }),
  toolPolicy: { readOnly: true },
  adapters: [
    TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }),
  ],
});

const orchestrator = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const researcher = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  system: "Research and summarize. Cite your sources.",
});

const writer = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  system: "Write clearly based on the research provided.",
});

const team = AgentTeam.create({
  workspace, // cache and Tavily shared across all agents
  orchestrator,
  members: [
    {
      role: "researcher",
      agent: researcher,
      description: "Research the topic.",
    },
    { role: "writer", agent: writer, description: "Write the article." },
  ],
});

const result = await team.run({
  prompt: "Research and write an article about the latest TypeScript features.",
});

console.log(result.content);
```

### Per-Role Budgets and Policies

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { AgentTeam } from "@deskcreate/agentcraft/team";

const orchestrator = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const researcher = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  system: "Research thoroughly.",
});

const publisher = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  system: "Publish content carefully.",
});

const team = AgentTeam.create({
  orchestrator,
  members: [
    { role: "researcher", agent: researcher },
    { role: "publisher", agent: publisher },
  ],
  rolePolicies: {
    researcher: { readOnly: true }, // researcher can only use read tools
    publisher: { approvedTools: ["publish_draft"] }, // publisher can publish
  },
  roleBudgets: {
    researcher: { maxToolCalls: 10, maxCost: 0.05 },
    publisher: { maxToolCalls: 3, maxCost: 0.02 },
  },
});
```

### Read the Team Trace

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { AgentTeam } from "@deskcreate/agentcraft/team";
import type { TeamTrace } from "@deskcreate/agentcraft";

// ... (create team as above)

const result = await team.run({ prompt: "Research and write a report." });

// Per-round trace: who ran, what was the input/output, cost
const traces = result.trace as TeamTrace[] | undefined;
if (traces) {
  for (const trace of traces) {
    console.log(`Round ${trace.round} — ${trace.agentRole}`);
    console.log(`  Cost: $${trace.cost.toFixed(4)}`);
    console.log(`  Tokens: ${trace.tokensUsed.total}`);
  }
}

console.log(`Total rounds: ${result.rounds}`);
console.log(`Agents involved: ${result.agentsUsed}`);
console.log(`Total cost: $${result.cost.toFixed(4)}`);
```

## Related

- [Agent Pool](./agent-pool.md)
- [Agent Workspace](./agent-workspace.md)
- [Dynamic Team Spawning](./dynamic-team-spawning.md)
- [Agents](../core/agents.md)
