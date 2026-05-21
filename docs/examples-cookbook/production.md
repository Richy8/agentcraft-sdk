# Production Examples

Production examples combine safety, cache, budgets, observability, and deterministic tests.

## Safe Tool Defaults

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    readOnly: true,
    maxResultBytes: 20_000,
  },
});

const response = await agent.run({
  prompt: "Run a read-only production check.",
  budget: { maxToolCalls: 6 },
});
console.log(response.content);
```

## Cache With Short TTL

```ts
import { AgentCache } from "@deskcreate/agentcraft";

const cache = AgentCache.file("./.agentcraft/cache", {
  strategy: "conservative",
  defaultTtlMs: 15 * 60 * 1000,
});
```

## Distributed Cache

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";

const redisCache = AgentCache.redis({
  url: process.env.REDIS_URL!,
  namespace: "prod",
  locking: { enabled: true, ttlMs: 30_000 },
});

const supabaseCache = AgentCache.postgres({
  url: process.env.SUPABASE_DB_URL!,
  tableName: "agentcraft_cache",
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache: redisCache,
});

const warm = await AgentCache.warm(agent, [
  "Prepare tomorrow's source-backed newsletter brief.",
  "Summarize current cache hit-rate risks.",
]);

console.log(redisCache.config.type);
console.log(supabaseCache.config.type);
console.log(warm.succeeded);
```

## Live Test Gates

```bash
INTEGRATION_TESTS=true AGENTCRAFT_LIVE_PROVIDERS=openai npm run test:int:light
```

## Cost, Cache, and Compression Benchmark

Use this when validating prompt overhead, skill activation, cache replay, and cost reports before publishing claims.

```bash
npm run benchmark:mock
INTEGRATION_TESTS=true AGENTCRAFT_LIVE_BENCHMARKS=true AGENTCRAFT_LIVE_PROVIDERS=openai npm run benchmark:live:light
```

The live benchmark writes `reports/agentcraft-live-cost-cache-benchmark.md`. Current benchmark variants cover flat prompt, directive skill, creator pack with `always`, creator pack with `auto`, compressed creator pack, cache warm/replay, memory-informed output, and artifact-resume output.

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache: AgentCache.file("./.agentcraft/cache", { strategy: "auto" }),
  skillActivation: "auto",
  toolSelection: "auto",
  promptCompression: "balanced",
}).use(CreatorPacks.blog({ cache: "auto", readOnlyByDefault: true }));

const response = await agent.run({
  prompt: "Create a compact Medium article plan about reducing token waste.",
  budget: { mode: "prefer-cache", maxCost: 0.03, maxToolCalls: 4 },
});

console.log(response.costReport);
console.log(response.cache?.summary);
```

## AgentEval Gate

Use `AgentEval` when a prompt, skill pack, adapter set, or cache strategy needs a repeatable quality and cost gate.

```ts
import { Agent, AgentEval, Provider } from "@deskcreate/agentcraft";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
  toolSelection: "auto",
}).use(CreatorPacks.blog({ readOnlyByDefault: true }));

const suite = AgentEval.suite({
  name: "Production creator gate",
  defaults: {
    maxCostUsd: 0.05,
    maxTotalTokens: 8_000,
    requireSkillActivation: true,
  },
}).case({
  name: "cost article plan",
  prompt: "Create a Medium article plan about reducing agent token waste.",
  expect: {
    activeSkills: ["blog-writer"],
    maxToolCalls: 2,
  },
  assertions: [
    AgentEval.assert.matches(/cache|token|cost/i),
    AgentEval.assert.notContains("game changer"),
  ],
});

const report = await AgentEval.run({ agent, suite });
await AgentEval.writeMarkdown(report, "reports/evals/creator-gate.md");
```

## Observability Report

Use `AgentReports` when you need a redacted artifact for CI, support, reviewer handoff, or run debugging.

```ts
import { Agent, AgentReports, Provider } from "@deskcreate/agentcraft";

const collector = AgentReports.traceCollector();
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Audit this launch copy for unsupported claims.",
  trace: collector,
});

await AgentReports.writeMarkdown(response, "reports/runs/launch-copy.md", {
  title: "Launch Copy Claim Audit",
  redact: true,
  maxOutputChars: 1_500,
});

await AgentReports.writeJson(
  collector.spans(),
  "reports/runs/launch-copy-trace.json",
);
```

## Governance Queue

```ts
import {
  ApprovalQueue,
  AgentReports,
  AgentWorkspace,
} from "@deskcreate/agentcraft";

const approvals = ApprovalQueue.memory({
  defaultReviewer: "editor@example.com",
  requireReason: true,
  riskPolicy: {
    write: "queue",
    external: "queue",
    destructive: "block",
  },
});

const workspace = AgentWorkspace.create({
  toolPolicy: { approvalQueue: approvals },
});

const events = AgentReports.eventCollector(workspace.events);

// Run an agent/team/workflow with workspace. Confirmation-gated tools queue.
const pending = await approvals.list({ status: "pending" });
console.log(pending[0]?.reviewer);
console.log(events.events().length);
```

## Semantic Memory

Use semantic memory when production agents need remembered context without loading a whole database into the prompt.

```ts
import {
  Agent,
  AgentMemory,
  AgentReports,
  AgentWorkspace,
  Provider,
} from "@deskcreate/agentcraft";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

const memory = AgentMemory.local({
  root: ".agentcraft/memory",
  namespace: "linkedin-system",
  maxContextChars: 1_000,
  writes: {
    requireApproval: true,
    approveWrite: async (request) => {
      // Route this to your reviewer UI in production.
      console.log(request.preview);
      return true;
    },
  },
});

await memory.add({
  scope: "brand",
  text: "Voice: operator-led, specific, no motivational filler.",
  source: "brand-workshop",
});

const workspace = AgentWorkspace.create({ memory });
const events = AgentReports.eventCollector(workspace.events);

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  workspace,
  skillActivation: "auto",
}).use(CreatorPacks.social());

const response = await agent.run({
  prompt: "Draft three LinkedIn post ideas about reducing agent token waste.",
  memory: { scopes: ["brand"], topK: 2 },
});

await AgentReports.writeMarkdown(response, "reports/linkedin-memory.md", {
  events: events.events(),
});
```

## Artifact and Memory Hardening

Use schema validation, artifact links, capabilities, and memory approvals when a workflow writes durable state.

```ts
import {
  FileArtifactStore,
  FileSystemCreatorMemoryStore,
} from "@deskcreate/agentcraft";

const store = FileArtifactStore({
  root: "./.agentcraft/artifacts",
  validateSchemas: true,
});

const memory = new FileSystemCreatorMemoryStore({
  root: "./.agentcraft/memory",
  requireWriteApproval: true,
  approveWrite: async () => true,
  redactSensitive: true,
});

console.log(store.capabilities());
console.log(await memory.summarizeContext({ query: "brand voice" }));
```

## Replay Test

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "This prompt is satisfied from replay during the test.",
  replay: {
    content: "ok",
    cost: 0,
    tokensUsed: { prompt: 1, completion: 1, total: 2 },
    finishReason: "stop",
    model: "replay-model",
    provider: "replay",
  },
});
console.log(response.content);
```

More detail: [Security Model](../production/security-model.md), [Live Testing](../examples-cookbook/production.md), [Integration Testing](../examples-cookbook/production.md).
