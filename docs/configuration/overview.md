# Configuration Overview

AgentCraft configuration is layered. Create-time config defines the agent permanently; run-time config shapes one request; attached capabilities (adapters, MCP) each carry their own options. Layers compose: a workspace sets defaults, a team role can narrow them, and each `agent.run()` call can override further.

## Config Layers

```
┌─────────────────────────────────────────────────────┐
│ Agent.create(config)          ← permanent per-agent  │
│   model, apiKey, cache, toolPolicy                   │
├─────────────────────────────────────────────────────┤
│ agent.use(adapter / mcp)                             │
│   adds tools, behavior, prompt fragments             │
├─────────────────────────────────────────────────────┤
│ agent.run(runConfig)          ← per-request          │
│   prompt, budget, output, vars, assembly             │
├─────────────────────────────────────────────────────┤
│ AgentWorkspace (teams & workflows)  ← shared        │
│   cache, store, memory, toolPolicy, traceSink        │
└─────────────────────────────────────────────────────┘
```

## Choose The Right Config

| Config area            | Use it for                                          | Required?        | Deep dive                                              |
| ---------------------- | --------------------------------------------------- | ---------------- | ------------------------------------------------------ |
| Agent config           | Provider, model, cache, defaults                    | Yes              | [Agent Config](./agent-config.md)                      |
| Run config             | Prompt, inputs, budgets, output schema              | Yes, per run     | [Run Config](./run-config.md)                          |
| Tool policy config     | Approvals, read-only gates, max calls, guardrails   | No               | [Tool Policy Config](./tool-policy-config.md)          |
| Adapter config         | File, fetch, GitHub, Slack, Playwright, DB, email   | No               | [Adapter Config](./adapter-config.md)                  |
| MCP config             | External MCP servers via wrappers or generic stdio  | No               | [MCP Config](./mcp-config.md)                          |
| Cache config           | Memory, file, SQLite, Postgres, Redis backends      | No               | [Cache Config](./cache-config.md)                      |
| Structured output      | Zod schema, mode (json / md / text), strict         | No               | [Structured Output Config](./structured-output-config.md) |
| Workspace config       | Shared cache/store/memory for teams and workflows   | No               | [Workspace Config](./workspace-config.md)              |
| Workflow config        | Step graphs, input contracts, review hooks          | No               | [Workflow Config](./workflow-config.md)                 |
| Prompt assembly config | File-based prompts, variables, partials, config     | No               | [Prompt Assembly Config](./prompt-assembly-config.md)  |
| Environment variables  | API keys, integration flags, test switches          | Provider-specific| [Environment Variables](./environment-variables.md)    |

## Minimal Setup

The bare minimum: a model name and an API key.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({ prompt: "Summarize this release note." });
console.log(response.content);
```

## Standard Setup (Recommended Starting Point)

Adds cache, tool policy, and a budget cap — safe defaults for most applications.

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  cache: AgentCache.file("./.agentcraft/cache", { strategy: "auto" }),
  toolPolicy: {
    readOnly: false,
    onApprovalRequired: async ({ tool }) => ["write_file", "send_email"].includes(tool.name),
    maxResultBytes: 20_000,
    redactSecrets: true,
  },
});

const response = await agent.run({
  prompt: "Draft a release summary for v2.0.",
  budget: { maxToolCalls: 8, maxCost: 0.10 },
});
console.log(response.content);
```

## Production Setup

Adds structured output, observability, and a file artifact store.

```ts
import { Agent, AgentCache, AgentReports, FileArtifactStore, Provider } from "@deskcreate/agentcraft";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";
import { z } from "zod";

const tracer = AgentReports.traceCollector();

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  cache: AgentCache.file("./.agentcraft/cache", { strategy: "auto" }),
  toolPolicy: {
    readOnly: true,
    maxResultBytes: 50_000,
    redactSecrets: true,
  },
  traceSink: tracer,
})
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

const response = await agent.run({
  prompt: "Research TypeScript agent frameworks and summarize the landscape.",
  budget: { maxToolCalls: 10, maxCost: 0.25 },
  output: {
    schema: z.object({
      summary: z.string(),
      topFrameworks: z.array(z.string()),
      recommendation: z.string(),
    }),
    mode: "json",
  },
});

console.log(response.output); // typed Zod-parsed object

await AgentReports.writeMarkdown(tracer.spans(), "reports/run.md", {
  title: "Research Run",
});
```

## How Layers Override

Later layers can only restrict, not relax, earlier safety constraints. For example, a workspace `toolPolicy.readOnly: true` cannot be overridden by a per-run call to `toolPolicy.readOnly: false` at the run level — the workspace policy wins. Budget caps accumulate: a workspace `maxCost: 2` plus a run `budget.maxCost: 0.25` results in the run being capped at 0.25 (the more restrictive value).

## Config Composition With Teams And Workflows

When using `AgentTeam` or `AgentWorkflow`, pass an `AgentWorkspace` to establish shared defaults across all agents and steps:

```ts
import { AgentWorkspace, AgentCache } from "@deskcreate/agentcraft";

const workspace = AgentWorkspace.create({
  cache: AgentCache.file(".agentcraft/cache"),
  toolPolicy: { readOnly: true, redactSecrets: true },
  budget: { maxCost: 2.00, maxToolCalls: 50 },
});

// Pass to AgentTeam.create({ workspace, ... }) or
// AgentWorkflow.create({ workspace, ... })
```

See [Workspace Config](./workspace-config.md) for the full config table and factory variants.

## Common Mistakes

| Mistake | Fix |
| ------- | ---- |
| Passing `apiKey` directly in code | Use `process.env.YOUR_KEY!` and add the key to `.env` |
| Using `readOnly: true` but expecting file writes | Set `readOnly: false` and gate write tools via `onApprovalRequired` |
| Omitting `budget` in production | Always set `maxCost` or `maxToolCalls` for long agentic pipelines |
| Forgetting to `await agent.run(...)` | `agent.run()` is async; always await the result |
