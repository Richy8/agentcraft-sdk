# Orchestration Examples

Orchestration examples show pools, teams, and specialist roles.

## Research And Review Team

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { AgentTeam } from "@deskcreate/agentcraft/team";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

const openaiKey = process.env.OPENAI_API_KEY ?? "";
const anthropicKey = process.env.ANTHROPIC_API_KEY ?? "";

const orchestrator = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: openaiKey,
});
const researchAgent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: openaiKey,
});
const writerAgent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: openaiKey,
});
const reviewAgent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: anthropicKey,
});

const team = AgentTeam.create({
  orchestrator,
  members: [
    { role: "researcher", agent: researchAgent.use(CreatorPacks.seo()) },
    { role: "writer", agent: writerAgent.use(CreatorPacks.blog()) },
    { role: "reviewer", agent: reviewAgent.use(CreatorPacks.publishing()) },
  ],
});

const result = await team.run({
  prompt: "Create and review a launch article about agent cache strategy.",
});
console.log(result.content);
```

## Pool With Fallback

```ts
import { Agent, AgentPool, Provider } from "@deskcreate/agentcraft";

const cheapAgent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});
const strongAgent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const pool = AgentPool.create([cheapAgent, strongAgent], {
  strategy: "cost", // pick the cheapest agent first; fall back to the stronger one on failure
  fallbackMode: "first-error",
});

const result = await pool.run({ prompt: "Summarize this research paper." });
console.log(result.content);
```

## Shared Tools

Share adapters across all team members by attaching them to a `workspace`. This is the
correct approach — `sharedAdapters` on the team config is not supported.

```ts
import { Agent, AgentWorkspace, Provider } from "@deskcreate/agentcraft";
import { AgentTeam } from "@deskcreate/agentcraft/team";
import { FetchAdapter } from "@deskcreate/agentcraft/adapters";

const apiKey = process.env.OPENAI_API_KEY ?? "";

// Attach adapters to the workspace — they are available to all team members
const workspace = AgentWorkspace.create({
  adapters: [FetchAdapter.connect({ allowedDomains: ["docs.example.com"] })],
});

const orchestrator = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey,
});

const team = AgentTeam.create({
  workspace, // FetchAdapter is shared via workspace, not per-member
  orchestrator,
  members: [
    {
      role: "writer",
      agent: Agent.create({ model: Provider.openai["gpt-4o-mini"], apiKey }),
    },
  ],
});

const result = await team.run({ prompt: "Research and summarize the docs." });
console.log(result.content);
```

## Workspace With Team

```ts
import {
  Agent,
  AgentCache,
  AgentWorkspace,
  Provider,
} from "@deskcreate/agentcraft";
import { AgentTeam } from "@deskcreate/agentcraft/team";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";

const apiKey = process.env.OPENAI_API_KEY ?? "";

const workspace = AgentWorkspace.create({
  cache: AgentCache.file(".cache"),
  adapters: [
    TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }),
  ],
  toolPolicy: { readOnly: true },
});

workspace.events.on("cost.updated", ({ cost }) => {
  if (cost > 3) console.warn("Budget threshold reached");
});

const orchestrator = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey,
});
const researcher = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey,
});
const writer = Agent.create({ model: Provider.openai["gpt-4o-mini"], apiKey });

const team = AgentTeam.create({
  workspace,
  orchestrator,
  members: [
    { role: "researcher", agent: researcher },
    { role: "writer", agent: writer },
  ],
  rolePolicies: {
    researcher: { allowSideEffects: false },
    writer: { readOnly: false },
  },
});

const result = await team.run({
  prompt: "Research and write an article on AI caching.",
});
console.log(result.content);
```

## Multi-Step Workflow

```ts
import {
  Agent,
  AgentCache,
  AgentWorkspace,
  AgentWorkflow,
  AgentStep,
  ApprovalStep,
  Provider,
} from "@deskcreate/agentcraft";

const apiKey = process.env.OPENAI_API_KEY ?? "";
const workspace = AgentWorkspace.create({ cache: AgentCache.memory() });

const researcher = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey,
});
const writer = Agent.create({ model: Provider.openai["gpt-4o-mini"], apiKey });

const workflow = AgentWorkflow.create({
  workspace,
  steps: [
    AgentStep({
      id: "research",
      agent: researcher,
      prompt: "Research AI caching.",
    }),
    ApprovalStep({
      id: "gate",
      description: "Approve research before writing",
      approve: async () => true,
    }),
    AgentStep({
      id: "write",
      agent: writer,
      prompt: (ctx) => `Write an article using: ${ctx.steps.research?.output}`,
    }),
  ],
});

const result = await workflow.run({ input: {} });
console.log(result.status);
```

More detail: [Agent Pool](../orchestration/agent-pool.md), [Agent Team](../orchestration/agent-team.md), and [Agent Workflow](../orchestration/agent-workflow.md).
