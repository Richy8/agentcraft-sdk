# Team & Pool Config

`AgentTeamConfig`, `AgentTeamSpawnConfig`, and `AgentPoolOptions` reference.

## `AgentTeamConfig`

| Field          | Type                     | Required | Description                                                     |
| -------------- | ------------------------ | -------- | --------------------------------------------------------------- |
| `orchestrator` | `Agent`                  | Yes      | The orchestrator agent that plans and delegates.                |
| `members`      | `TeamMember[]`           | Yes      | Named specialist agents available to the orchestrator.          |
| `mode`         | `'orchestrator'`         | No       | Team mode. Currently only `'orchestrator'` is supported.        |
| `workspace`    | `AgentWorkspaceInstance` | No       | Shared workspace providing cache, adapters, policy, and budget. |

## `TeamMember`

| Field   | Type     | Required | Description                                                 |
| ------- | -------- | -------- | ----------------------------------------------------------- |
| `role`  | `string` | Yes      | The role name the orchestrator uses to refer to this agent. |
| `agent` | `Agent`  | Yes      | The agent instance.                                         |

## Usage

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { AgentTeam } from "@deskcreate/agentcraft/team";

const orchestrator = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  systemPrompt: "You coordinate a team of specialist agents.",
});

const researcher = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const writer = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const team = AgentTeam.create({
  orchestrator,
  members: [
    { role: "researcher", agent: researcher },
    { role: "writer", agent: writer },
  ],
});

const response = await team.run({
  prompt: "Research TypeScript 5.4 and write a blog post about it.",
});
```

## `AgentTeamSpawnConfig`

For dynamic team spawning — letting the orchestrator create specialist agents at runtime:

| Field            | Type              | Required | Description                                              |
| ---------------- | ----------------- | -------- | -------------------------------------------------------- |
| `root`           | `Agent`           | Yes      | The root orchestrator agent.                             |
| `availableRoles` | `SpawnableRole[]` | Yes      | Roles the orchestrator can spawn.                        |
| `maxSpawned`     | `number`          | No       | Maximum number of agents spawned per run. Default: `10`. |

```ts
import { AgentTeam } from "@deskcreate/agentcraft/team";

const team = AgentTeam.spawn({
  root: orchestratorAgent,
  availableRoles: [
    {
      role: "domain-expert",
      agentFactory: (context) =>
        Agent.create({
          model: Provider.openai["gpt-4o"],
          apiKey: process.env.OPENAI_API_KEY!,
          systemPrompt: `You are a domain expert in: ${context.domain}`,
        }),
    },
  ],
  maxSpawned: 5,
});
```

## `AgentPoolOptions`

| Field      | Type            | Default         | Description                                      |
| ---------- | --------------- | --------------- | ------------------------------------------------ |
| `strategy` | `'round-robin'` | `'round-robin'` | How requests are distributed across pool agents. |

## AgentPool Usage

```ts
import { AgentPool } from "@deskcreate/agentcraft";

const pool = AgentPool.create([agentA, agentB, agentC], {
  strategy: "round-robin",
});

// Distributed across agents in order
const [r1, r2, r3] = await Promise.all([
  pool.run({ prompt: "Task 1" }),
  pool.run({ prompt: "Task 2" }),
  pool.run({ prompt: "Task 3" }),
]);
```

## TeamResponse Shape

```ts
interface TeamResponse extends AgentResponse {
  teamTrace: TeamTrace;
}

interface TeamTrace {
  orchestratorCalls: number;
  memberCalls: Record<string, number>; // { researcher: 2, writer: 1 }
  totalCost: number;
  totalTokens: number;
}
```

## Related

- [Agent Team](../orchestration/agent-team.md)
- [Dynamic Team Spawning](../orchestration/dynamic-team-spawning.md)
- [Agent Pool](../orchestration/agent-pool.md)
- [Agent Workspace](../orchestration/agent-workspace.md)
- [Workspace Config](./workspace-config.md)
