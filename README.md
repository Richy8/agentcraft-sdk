# AgentCraft

[![npm version](https://img.shields.io/npm/v/@deskcreate/agentcraft)](https://www.npmjs.com/package/@deskcreate/agentcraft)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![CI](https://github.com/Richy8/agentcraft-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/Richy8/agentcraft-sdk/actions/workflows/ci.yml)
[![Node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)

Production-grade TypeScript agent runtime with provider routing, tools, MCP, skills, workflows, structured output, streaming, budgets, caching, durable artifacts, creator memory, and observability.

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
- Built-in adapters for filesystem, fetch, GitHub, database, browser, SaaS, storage, vector, voice, and image workflows.
- Built-in skills with structured prompt metadata and dependency validation.
- Domain packs for creator, brand, marketing, sales, finance, product, support, healthcare, data analytics, and engineering workflows.
- Structured output with JSON Schema, Zod-like schemas, native JSON mode, retry repair, and tool fallback.
- Streaming events for model deltas, tool calls, tool results, and finals.
- Run budgets, cost reports, pricing staleness checks, fallback routing, and AgentTeam orchestration.
- Prompt compression modes for reducing skill and creator-pack prompt overhead.
- Explainable skill activation with directive, alias, artifact, capability, and keyword/domain reason codes.
- `AgentCache` for read-tool replay, hit-rate reporting, avoided-call accounting, and estimated savings.
- `AgentWorkflow` for repeatable step graphs with retries, approvals, branches, parallel fan-out, Zod-validated input, and resumable failed runs.
- `AgentWorkspace` for shared runtime context wiring cache, adapters, tool policy, budget, events, and artifact stores once for teams and workflows.
- `ArtifactStore` for typed durable persistence with validation, history, link traversal, capabilities, and memory/file/SQLite backends.
- `ArtifactRegistry` for 19 built-in creator artifact schemas with custom extension support.
- Creator memory with freshness metadata, write approvals, secret blocking, corpus search, and compact memory summaries.
- `AgentEval`, `AgentReports`, distributed cache, governance queues, and semantic memory for production readiness.

## What You Can Build

AgentCraft is not only a creator toolkit. The same primitives can power cross-industry agent systems:

- **Content operations**: remember brand/audience context, draft calendar assets, queue publish approvals, and export reviewer reports.
- **Customer support**: retrieve customer preferences from semantic memory, call read-only SaaS tools, enforce cost/tool budgets, and persist case artifacts.
- **Engineering review**: run code-review skills with GitHub tools, gate risky write tools, and attach trace reports to pull requests.
- **Research and analytics**: warm expensive search/cache paths before scheduled jobs, compare prompt variants with `AgentEval`, and keep token spend visible.
- **Internal copilots**: share workspace cache, tool policies, memory, artifact stores, and adapters across teams and workflows without hiding the underlying APIs.

## Cost, Cache, and Skill Efficiency

AgentCraft is designed to make higher-quality agent runs cheaper and easier to reason about. The runtime now reports what happened instead of leaving cost control as guesswork.

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache: AgentCache.file(".agentcraft/cache", {
    strategy: "auto",
    namespace: "creator-demo",
  }),
  skillActivation: "auto",
  toolSelection: "auto",
  promptCompression: "balanced",
}).use(CreatorPacks.blog({ cache: "auto", readOnlyByDefault: true }));

const response = await agent.run({
  prompt: "Create a compact Medium article plan about reducing wasted tokens.",
  budget: {
    mode: "prefer-cache",
    maxCost: 0.03,
    maxToolCalls: 4,
  },
});

console.log(response.selection?.activationReasons);
console.log(response.measurement?.estimatedPromptTokens);
console.log(response.cache?.summary);
console.log(response.costReport);
```

Recent light live benchmark results, generated by `npm run benchmark:live:light`, showed:

| Variant                 | Prompt tokens |     Cost | Active skills               | Cache hits | Tool calls |
| ----------------------- | ------------: | -------: | --------------------------- | ---------: | ---------: |
| Flat prompt             |            29 | 0.000112 | none                        |          0 |          0 |
| Directive blog skill    |          1451 | 0.000326 | `blog-writer`               |          0 |          0 |
| Creator pack always     |          3675 | 0.000659 | 7 creator skills            |          0 |          0 |
| Creator pack auto       |          1270 | 0.000298 | `blog-writer`, `blog-brief` |          0 |          0 |
| Creator pack compressed |           948 | 0.000250 | `blog-writer`, `blog-brief` |          0 |          0 |
| Cache warm              |            95 | 0.000020 | none                        |          0 |          1 |
| Cache replay            |            95 | 0.000020 | none                        |          1 |          0 |

Measured facts from that run: auto activation reduced the creator-pack prompt from `3675` to `1270` prompt tokens, balanced prompt compression reduced it again to `948`, and cached replay avoided the live tool execution. See `reports/agentcraft-live-cost-cache-benchmark.md` after running the benchmark locally.

## Eval And Run Reports

AgentCraft now includes `AgentEval` and `AgentReports` for production gates and support-ready run artifacts:

```ts
import { AgentEval, AgentReports } from "@deskcreate/agentcraft";

const suite = AgentEval.suite({
  name: "Cost-aware content gate",
  defaults: { maxCostUsd: 0.05, requireSkillActivation: true },
}).case({
  name: "article plan",
  prompt: "Create a Medium article plan about cache-aware agents.",
  assertions: [AgentEval.assert.matches(/cache|cost|token/i)],
});

const evalReport = await AgentEval.run({ agent, suite });
await AgentEval.writeMarkdown(evalReport, "reports/evals/content-gate.md");

const response = await agent.run({
  prompt: "Summarize the article plan.",
  trace: true,
});
await AgentReports.writeMarkdown(response, "reports/runs/article-plan.md");
```

Use evals to catch prompt bloat, skill activation regressions, excessive tool calls, weak cache replay, and avoidable cost increases before a workflow reaches users.

## Distributed Cache And Governance

For production deployments, AgentCraft can share cache across workers and queue write approvals:

```ts
import {
  AgentCache,
  ApprovalQueue,
  AgentWorkspace,
} from "@deskcreate/agentcraft";

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

Cache also supports Postgres/Supabase URLs, Postgres pools, SQLite files, custom controllers, `AgentCache.fromUrl(...)`, and `AgentCache.warm(...)`.

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";

// One env var can switch between Redis, Postgres/Supabase, or local file cache.
const cache = process.env.AGENTCRAFT_CACHE_URL
  ? AgentCache.fromUrl(process.env.AGENTCRAFT_CACHE_URL, {
      namespace: "prod",
      tableName: "agentcraft_cache",
      locking: { enabled: true },
    })
  : AgentCache.file(".agentcraft/cache", { namespace: "local-dev" });

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache,
});

const warm = await AgentCache.warm(agent, [
  "Research provider pricing caveats.",
  "Prepare a cache-warming launch brief.",
]);

console.log(warm.cache);
console.log(cache.config.type);
```

## Durable Living-System Primitives

Use artifacts for structured workflow state, semantic memory for bounded cross-run context, and creator memory for reusable creator-specific brand/corpus context:

```ts
import {
  AgentMemory,
  AgentWorkspace,
  FileArtifactStore,
  FileSystemCreatorMemoryStore,
} from "@deskcreate/agentcraft";

const store = FileArtifactStore({
  root: ".agentcraft/artifacts",
  validateSchemas: true,
});

const semanticMemory = AgentMemory.local({
  root: ".agentcraft/semantic-memory",
  namespace: "prod",
  maxContextChars: 1200,
  writes: { requireApproval: true, approveWrite: async () => true },
});

await semanticMemory.add({
  scope: "brand",
  text: "Voice: specific, practical, no motivational filler.",
  source: "brand-workshop",
});

const creatorMemory = new FileSystemCreatorMemoryStore({
  root: ".agentcraft/memory",
  staleAfterMs: 1000 * 60 * 60 * 24 * 30,
  requireWriteApproval: true,
  approveWrite: async () => true,
});

const workspace = AgentWorkspace.create({ store, memory: semanticMemory });
const memoryContext = await creatorMemory.summarizeContext({
  query: "brand voice for cache articles",
  maxChars: 1000,
});

console.log(workspace.store?.capabilities());
console.log(memoryContext);
```

Semantic memory can also be vector-backed when a product needs hosted retrieval:

```ts
import { AgentMemory } from "@deskcreate/agentcraft";

const vectorMemory = AgentMemory.vector({
  provider: "qdrant",
  url: process.env.QDRANT_URL!,
  apiKey: process.env.QDRANT_API_KEY,
  collection: "agentcraft_memory",
  embeddings: AgentMemory.embeddings.openAI({
    apiKey: process.env.OPENAI_API_KEY!,
    model: "text-embedding-3-small",
  }),
});
```

## Guides

- [Architecture](https://agentcraft-sdk.vercel.app/architecture)
- [Quickstart](https://agentcraft-sdk.vercel.app/start/quickstart)
- [Feature Map](https://agentcraft-sdk.vercel.app/start/feature-map)
- [Run Configuration](https://agentcraft-sdk.vercel.app/configuration/run-config)
- [Models and Providers](https://agentcraft-sdk.vercel.app/core/models-and-providers)
- [Tool Lifecycle](https://agentcraft-sdk.vercel.app/tools/tools)
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
- [Adapter Authoring](https://agentcraft-sdk.vercel.app/adapters/custom)
- [Skill Authoring](https://agentcraft-sdk.vercel.app/skills/custom)
- [Structured Output](https://agentcraft-sdk.vercel.app/core/structured-output)
- [Guardrails](https://agentcraft-sdk.vercel.app/tools/guardrails)

For the local documentation site:

```sh
npm run docs:dev
```

## Examples

See the [examples guide](https://agentcraft-sdk.vercel.app/examples) for basic chat, structured output, streaming with tools, safe filesystem usage, GitHub review, MCP GitHub, research, AgentTeam, AgentWorkflow, ArtifactStore, semantic memory, governance queues, AgentEval, observability reports, cost/cache compression, and custom adapter patterns.

## Safety Defaults

AgentCraft treats prompt, file, browser, MCP, retrieval, and tool inputs as untrusted by default. Side-effecting tools require approval metadata and should be run with policy controls in production.

Pricing metadata is source-stamped and estimator-grade. Update the model catalog against official provider pricing before using estimates for billing or hard financial commitments.

## Testing

Unit tests are mocked and do not require live API keys:

```sh
npm test
```

Live integration tests are opt-in and should be run with cost-bounded provider keys only:

```sh
INTEGRATION_TESTS=true npm run test:int:light
```

Cost/cache/skill benchmark:

```sh
npm run benchmark:mock
INTEGRATION_TESTS=true AGENTCRAFT_LIVE_BENCHMARKS=true AGENTCRAFT_LIVE_PROVIDERS=openai npm run benchmark:live:light
```

The live benchmark writes `reports/agentcraft-live-cost-cache-benchmark.md` and separates measured provider cost from tool/search estimates.

Eval/report certification:

```sh
npm test -- src/__tests__/agent-eval.test.ts src/__tests__/agent-reports.test.ts
```

## Community

- [Contributing](CONTRIBUTING.md)
- [Code of Conduct](CODE_OF_CONDUCT.md)
- [Security Policy](SECURITY.md)
- [GitHub Discussions](https://github.com/Richy8/agentcraft-sdk/discussions)
