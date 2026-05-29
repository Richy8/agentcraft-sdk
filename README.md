# AgentCraft

[![npm version](https://img.shields.io/npm/v/@deskcreate/agentcraft)](https://www.npmjs.com/package/@deskcreate/agentcraft)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/Richy8/agentcraft-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/Richy8/agentcraft-sdk/actions/workflows/ci.yml)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

Production-grade TypeScript agent runtime with provider routing, tools, MCP, workflows, structured output, streaming, budgets, caching, durable artifacts, and observability.

## Install

```sh
npm install @deskcreate/agentcraft
```

## 60-Second Quickstart

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const result = await agent.run({
  prompt: "Summarize why typed tool calls matter.",
  responseSchema: {
    type: "object",
    required: ["summary", "risks"],
    properties: {
      summary: { type: "string" },
      risks: { type: "array", items: { type: "string" } },
    },
  },
  structuredOutput: { retries: 1 },
  trace: true,
});

console.log(result.structuredResponse);
console.log(result.trace);
```

## Core Ideas

- Provider-portable calls across OpenAI-compatible, Anthropic, Google, Bedrock, and Cohere protocols.
- Secure tool lifecycle with approvals, dry-run/read-only modes, guardrails, redaction, timeouts, and audits.
- MCP runtime for stdio, HTTP JSON-RPC, and SSE transports.
- Built-in adapters for fetch, web search, database, and image generation. MCP wrappers for GitHub, Slack, filesystem, Postgres, Supabase, Brave Search, Firecrawl, and more.
- Structured output with JSON Schema, Zod-like schemas, native JSON mode, retry repair, and tool fallback.
- Streaming events for model deltas, tool calls, tool results, and finals.
- Run budgets, cost reports, pricing staleness checks, fallback routing, and AgentTeam orchestration.
- `AgentCache` for read-tool replay, hit-rate reporting, avoided-call accounting, and estimated savings.
- `AgentWorkflow` for repeatable step graphs with retries, approvals, branches, parallel fan-out, Zod-validated input, and resumable failed runs.
- `AgentWorkspace` for shared runtime context wiring cache, adapters, tool policy, budget, events, and artifact stores once for teams and workflows.
- `ArtifactStore` for typed durable persistence with validation, history, link traversal, capabilities, and memory/file/SQLite backends.
- `ArtifactRegistry` for 19 built-in creator artifact schemas with custom extension support.
- `AgentEval`, `AgentReports`, distributed cache, governance queues, and semantic memory for production readiness.

## What You Can Build

- **Content operations**: remember brand/audience context, draft calendar assets, queue publish approvals, and export reviewer reports.
- **Customer support**: retrieve customer preferences from semantic memory, call read-only SaaS tools, enforce cost/tool budgets, and persist case artifacts.
- **Engineering review**: run code-review workflows with GitHub tools, gate risky write tools, and attach trace reports to pull requests.
- **Research and analytics**: warm expensive search/cache paths before scheduled jobs, compare prompt variants with `AgentEval`, and keep token spend visible.
- **Internal copilots**: share workspace cache, tool policies, memory, artifact stores, and adapters across teams and workflows without hiding the underlying APIs.

## Adapters and Tools

Adapters are named bundles of typed tools you attach to an agent with `.use()`. The model can only call tools from attached adapters — nothing else.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createAdapter, tool, FetchAdapter } from "@deskcreate/agentcraft/adapters";

// Built-in adapter — domain-allowlisted web fetch
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: { readOnly: true },
}).use(FetchAdapter.connect({ allowedDomains: ["docs.example.com"] }));

// Custom adapter — typed tools with security metadata
const mathAdapter = createAdapter({
  name: "math",
  metadata: { kind: "custom", auth: "none", sideEffects: ["none"], readOnly: true },
  tools: [
    tool("compound_interest", {
      description: "Calculate compound interest: principal × (1 + rate)^years.",
      sideEffect: "none",
      params: {
        principal: { type: "number", description: "Starting amount." },
        rate:      { type: "number", description: "Annual rate as decimal." },
        years:     { type: "number", description: "Number of years." },
      },
      run: async ({ principal, rate, years }) => ({
        result: principal * Math.pow(1 + rate, years),
      }),
    }),
  ],
});

const mathAgent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: { allowSideEffects: true },
}).use(mathAdapter);

const response = await mathAgent.run({
  prompt: "I invest $10,000 at 7% annually. What will it be worth in 20 years?",
});

console.log(response.content);
console.log(response.tokensUsed);
```

### Tool Policy

Every tool execution passes through `ToolPolicy` before it runs:

```ts
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    readOnly: true,                          // block any write/external sideEffect tools
    redactSecrets: true,                     // scrub secrets from args and results
    timeoutMs: 5000,                         // per-tool execution timeout
    onApprovalRequired: async ({ tool }) => {
      console.log(`Approval needed for: ${tool.name}`);
      return false;                          // deny; swap for real approval logic
    },
    onAuditEvent: (evt) => console.log(evt), // every tool lifecycle event
    inputGuardrails: [
      ({ args }) => ({
        allowed: !JSON.stringify(args).includes("DROP TABLE"),
        reason: "SQL injection detected",
      }),
    ],
  },
});
```

## Cost, Cache, and Efficiency

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";
import { FetchAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache: AgentCache.file(".agentcraft/cache", {
    strategy: "auto",
    namespace: "my-app",
  }),
}).use(FetchAdapter.connect({ allowedDomains: ["docs.example.com"] }));

const response = await agent.run({
  prompt: "Fetch the docs homepage and summarize the top 3 features.",
  budget: {
    mode: "prefer-cache",
    maxCost: 0.03,
    maxToolCalls: 4,
  },
});

console.log(response.cache?.summary);
console.log(response.costReport);
```

Cache supports memory, file, SQLite, Redis, and Postgres backends. Switch with one env var:

```ts
const cache = process.env.AGENTCRAFT_CACHE_URL
  ? AgentCache.fromUrl(process.env.AGENTCRAFT_CACHE_URL, { namespace: "prod" })
  : AgentCache.file(".agentcraft/cache", { namespace: "local-dev" });
```

## Eval and Run Reports

```ts
import { AgentEval, AgentReports } from "@deskcreate/agentcraft";

const suite = AgentEval.suite({
  name: "Cost-aware content gate",
  defaults: { maxCostUsd: 0.05 },
}).case({
  name: "article plan",
  prompt: "Create a Medium article plan about cache-aware agents.",
  assertions: [AgentEval.assert.matches(/cache|cost|token/i)],
});

const evalReport = await AgentEval.run({ agent, suite });
await AgentEval.writeMarkdown(evalReport, "reports/evals/content-gate.md");

const response = await agent.run({ prompt: "Summarize the article plan.", trace: true });
await AgentReports.writeMarkdown(response, "reports/runs/article-plan.md");
```

## Distributed Cache and Governance

```ts
import { AgentCache, ApprovalQueue, AgentWorkspace } from "@deskcreate/agentcraft";

const workspace = AgentWorkspace.create({
  cache: AgentCache.redis({
    url: process.env.REDIS_URL!,
    namespace: "prod",
    locking: { enabled: true, ttlMs: 30_000 },
  }),
  toolPolicy: {
    approvalQueue: ApprovalQueue.memory({
      defaultReviewer: "ops@example.com",
      requireReason: true,
    }),
  },
});
```

## Durable Primitives

```ts
import {
  AgentMemory,
  AgentWorkspace,
  FileArtifactStore,
} from "@deskcreate/agentcraft";

const store = new FileArtifactStore({ root: ".agentcraft/artifacts" });

const memory = AgentMemory.create({
  backend: "local",
  scope: "session",
});

await memory.store({ content: "Voice: specific, practical, no motivational filler." });

const results = await memory.search({ query: "brand voice", topK: 3 });

const workspace = AgentWorkspace.create({ store });
console.log(workspace.store?.capabilities());
```

## Guides

- [Architecture](https://agentcraft-sdk.vercel.app/architecture)
- [Quickstart](https://agentcraft-sdk.vercel.app/start/quickstart)
- [Feature Map](https://agentcraft-sdk.vercel.app/start/feature-map)
- [Run Configuration](https://agentcraft-sdk.vercel.app/configuration/run-config)
- [Models and Providers](https://agentcraft-sdk.vercel.app/core/models-and-providers)
- [Tool Lifecycle](https://agentcraft-sdk.vercel.app/tools/tools)
- [Adapter Authoring](https://agentcraft-sdk.vercel.app/adapters/custom)
- [MCP Overview](https://agentcraft-sdk.vercel.app/mcp/overview)
- [Security Model](https://agentcraft-sdk.vercel.app/production/security-model)
- [Pricing and Budgets](https://agentcraft-sdk.vercel.app/core/budgets-cost)
- [AgentCache](https://agentcraft-sdk.vercel.app/persistence/agent-cache)
- [Semantic Memory](https://agentcraft-sdk.vercel.app/persistence/semantic-memory)
- [AgentTeam Orchestration](https://agentcraft-sdk.vercel.app/orchestration/agent-team)
- [AgentWorkflow](https://agentcraft-sdk.vercel.app/orchestration/agent-workflow)
- [AgentWorkspace](https://agentcraft-sdk.vercel.app/orchestration/agent-workspace)
- [ArtifactStore](https://agentcraft-sdk.vercel.app/persistence/artifact-store)
- [ArtifactRegistry](https://agentcraft-sdk.vercel.app/persistence/artifact-registry)
- [Creator Memory](https://agentcraft-sdk.vercel.app/persistence/creator-memory-store)
- [Structured Output](https://agentcraft-sdk.vercel.app/core/structured-output)
- [Guardrails](https://agentcraft-sdk.vercel.app/tools/guardrails)

```sh
npm run docs:dev
```

## Examples

See the [examples guide](https://agentcraft-sdk.vercel.app/examples) for basic chat, structured output, streaming with tools, safe filesystem usage, GitHub review, MCP GitHub, research, AgentTeam, AgentWorkflow, ArtifactStore, semantic memory, governance queues, AgentEval, observability reports, cost/cache, and custom adapter patterns.

## Safety Defaults

AgentCraft treats prompt, file, browser, MCP, retrieval, and tool inputs as untrusted by default. Side-effecting tools require approval metadata and should be run with policy controls in production.

Pricing metadata is source-stamped and estimator-grade. Update the model catalog against official provider pricing before using estimates for billing or hard financial commitments.

## Testing

```sh
npm test                                    # unit tests — no API keys needed
INTEGRATION_TESTS=true npm run test:int:light  # live — OpenAI only
npm run benchmark:mock                      # cost/cache benchmark (mocked)
```

## Community

- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)
- [GitHub Discussions](https://github.com/Richy8/agentcraft-sdk/discussions)
