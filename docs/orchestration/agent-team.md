# Agent Team

`AgentTeam` coordinates multiple named agents around a shared task. Use it when the work has roles: researcher, writer, reviewer, publisher, or analyst.

## Purpose

| Role pattern        | Works well for                   | Shared capabilities   | Related page                                   |
| ------------------- | -------------------------------- | --------------------- | ---------------------------------------------- |
| Research then write | Articles, books, scripts         | Search, files, cache  | [Creator Workflows](../creator/workflows.md)   |
| Draft then review   | Copy, SEO, publish QA            | Skills and guardrails | [Skills](../skills/overview.md)                |
| Ops team            | Support, reports, internal tasks | Adapters and MCP      | [MCP](../mcp/overview.md)                      |
| Dynamic team        | Unknown task decomposition       | Spawn config          | [Dynamic Spawning](./dynamic-team-spawning.md) |

## Usage

```ts
import { Agent, Provider } from "agentcraft";
import { AgentTeam } from "agentcraft/team";
import { CreatorPacks } from "agentcraft/packs";

const openaiKey = process.env.OPENAI_API_KEY ?? "";
const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";

const orchestrator = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: openaiKey,
});
const writer = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: openaiKey,
}).use(CreatorPacks.blog());
const reviewer = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: anthropicKey,
}).use(CreatorPacks.publishing());

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

await team.run({
  prompt: "Produce and review a Medium article on MCP security.",
});
```

## Configuration

| Option           | Required | Default | Purpose                                                                       |
| ---------------- | -------- | ------- | ----------------------------------------------------------------------------- |
| `orchestrator`   | Yes      | None    | Agent that plans and merges the team work.                                    |
| `members`        | Yes      | None    | Named agents and roles.                                                       |
| `workspace`      | No       | None    | `AgentWorkspaceInstance` that propagates cache, adapters, policy, and events. |
| `rolePolicies`   | No       | None    | Per-role `ToolPolicy` overrides keyed by member role.                         |
| `sharedAdapters` | No       | `[]`    | Deprecated. Use `workspace.adapters`.                                         |
| `sharedSkills`   | No       | `[]`    | Skills attached to every member.                                              |
| `memory`         | No       | None    | Deprecated. Use memory MCP in `workspace.mcps`.                               |

## Workspace Integration

```ts
import { Agent, AgentCache, AgentWorkspace, Provider } from "agentcraft";
import { AgentTeam } from "agentcraft/team";

const apiKey = process.env.OPENAI_API_KEY ?? "";
const workspace = AgentWorkspace.create({
  cache: AgentCache.memory(),
  toolPolicy: { readOnly: true },
});
const orchestrator = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey,
});
const reviewer = orchestrator.cloneWithSystem(
  "Review for factual risk.",
  "reviewer",
);

const team = AgentTeam.create({
  workspace,
  orchestrator,
  members: [{ role: "reviewer", agent: reviewer }],
  rolePolicies: {
    reviewer: { readOnly: true },
  },
});

console.log(team);
```

## Local Examples

Attach shared read-only tools and keep write tools only on the publisher:

```ts
const team = AgentTeam.create({
  orchestrator,
  sharedAdapters: [
    FetchAdapter.connect({ allowedDomains: ["developer.mozilla.org"] }),
  ],
  members: [
    { role: "writer", agent: writer },
    {
      role: "publisher",
      agent: publisher.use(
        CreatorPacks.publishing({ readOnlyByDefault: true }),
      ),
    },
  ],
});
```

More variants: [orchestration cookbook](../examples-cookbook/orchestration.md).
