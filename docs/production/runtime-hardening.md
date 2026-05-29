# Runtime Hardening

Runtime hardening is the ongoing work of splitting AgentCraft's core into smaller, independently testable modules — without changing the public API. The goal is to keep `Agent.create()` and `agent.run()` stable while making cache replay, memory injection, and adapter lifecycle behavior inspectable and safe.

## Architecture After Hardening

```txt
Agent (public facade)
  ├── agent/runtime/agent-runtime.ts       — run and stream execution
  ├── agent/runtime/structured-output-flow.ts — JSON-mode + tool fallback
  ├── agent/adapters/attachment-manager.ts — .use() validation, conflict checks
  ├── agent/adapters/lifecycle-manager.ts  — adapter init/cleanup ordering
  ├── agent/adapters/run-scope.ts          — run-scoped adapter isolation
  ├── agent/tools/                         — routing, policy, caching, budgets
  ├── agent/cache/backends/*               — memory, file, Redis, Postgres, SQLite
  └── agent/memory/*                       — local, embedding, vector-client
```

Each module has a focused responsibility and its own test file. The public `Agent` facade delegates to these modules but does not expose their internals.

## Hardened Module Status

| Module | What it does | Where to test |
| --- | --- | --- |
| `agent-runtime.ts` | Delegates run and stream execution paths | `src/agent/__tests__/agent.test.ts` |
| `structured-output-flow.ts` | JSON-mode vs. tool-fallback structured output | `src/agent/__tests__/structured-output.test.ts` |
| `attachment-manager.ts` | `.use()` validation, dependency checks, conflict detection | `src/agent/adapters/__tests__/attachment.test.ts` |
| `lifecycle-manager.ts` | Adapter init/cleanup in correct order | `src/agent/adapters/__tests__/lifecycle.test.ts` |
| `run-scope.ts` | Run-scoped adapter isolation per `.run()` call | `src/agent/adapters/__tests__/run-scope.test.ts` |
| `agent/tools/*` | Tool selection, caching, policy enforcement, tracing | `src/agent/tools/__tests__/` |
| `agent/cache/backends/*` | Backend-specific cache behavior | `src/agent/cache/__tests__/` |
| `agent/memory/*` | Memory store integration and vector recall | `src/agent/memory/__tests__/` |

## Inspecting Runtime Behavior

Use response fields to verify the runtime is doing real work rather than silently adding overhead:

### Prompt and Token Footprint

```ts
const response = await agent.run({
  prompt: "Write a summary of this document.",
});

const { promptTokens, completionTokens, total } = response.tokensUsed ?? {};
console.log(`Prompt: ${promptTokens}, Completion: ${completionTokens}, Total: ${total}`);

const measurement = response.measurement;
console.log("Estimated prompt tokens:", measurement?.estimatedPromptTokens);
```

### Cache Effectiveness

```ts
const response = await agent.run({
  prompt: "Search for TypeScript documentation.",
});

const cache = response.cache;
if (cache) {
  console.log(`Cache hits: ${cache.hits}, misses: ${cache.misses}`);
  console.log(`Tool calls avoided: ${cache.toolCallsAvoided}`);
  console.log(`Estimated saved tokens: ${cache.estimatedSavedTokens ?? 0}`);
  console.log(`Unsafe skips: ${cache.skippedUnsafe}`);
}
```

### Cost Reporting

```ts
const response = await agent.run({
  prompt: "Research and summarize 5 sources.",
});

const report = response.costReport;
if (report) {
  console.log(`Total: $${report.totalCost.toFixed(4)}`);
  console.log(`Input tokens: ${report.inputTokens} @ $${report.inputCostPerMToken}/M`);
  console.log(`Output tokens: ${report.outputTokens} @ $${report.outputCostPerMToken}/M`);
}
```

### Adapter Trace

```ts
import { RunTracer } from "@deskcreate/agentcraft";

const tracer = RunTracer.create();
const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  traceSink: tracer,
});

const response = await agent.run({ prompt: "Search for TypeScript best practices." });

const spans = tracer.spans();
for (const span of spans) {
  console.log(`${span.name}: ${span.durationMs}ms`);
}
```

## Offline Validation Gates

Run these before shipping any change to the runtime:

```sh
npm run typecheck          # TypeScript strict mode — no type errors
npm test                   # All unit tests with fake providers
npm run build              # TypeScript → dist/ compilation
npm run docs:api:check     # Generated API docs match public exports
npm run examples:typecheck # All runnable examples type-check
npm run examples:check     # Examples compile and pass assertions
npm run exports:smoke      # Public entry points export expected symbols
npm run format:check       # Prettier formatting
```

## Live Integration Gates

Live gates require API credentials and are opt-in. Keep `INTEGRATION_TESTS=false` and `AGENTCRAFT_LIVE_ALLOW_WRITES=false` in default CI:

```sh
INTEGRATION_TESTS=true npm run test:int:light   # OpenAI only
INTEGRATION_TESTS=true npm run test:int         # All providers
INTEGRATION_TESTS=true npm run benchmark:live:light  # Cost and cache benchmarks
```

## Security Posture in the Runtime

The hardened runtime enforces several implicit security properties:

- **Cache eligibility is centralized**: Write tools, confirmation-gated tools, and tools with `sensitive: true` metadata are unconditionally excluded from cache — this logic lives in `cache-eligibility.ts` and cannot be bypassed per-call
- **Adapter scoping is non-negotiable**: `FilesystemMCP` enforces `allowedPaths` at the tool execution layer, not in the prompt
- **Memory and cache events redact secrets**: The event emitter strips URL credentials, connection strings, and patterns matching `AGENTCRAFT_SECRET_PATTERN` before emitting

## Adding a New Runtime Module

When splitting a new concern out of `agent.ts`:

1. Create `src/agent/<subsystem>/<module>.ts` with a single focused export
2. Create `src/agent/<subsystem>/__tests__/<module>.test.ts` with unit tests using `DeterministicFakeProvider`
3. Re-export the new module through `src/agent/index.ts` if it's a public type
4. Do not export internal implementation types — only the public contract
5. Add a gate to `npm run typecheck` and `npm test`

## Related

- [Security Model](./security-model.md) — security layers and threat model
- [Observability Reports](./observability-reports.md) — trace replay and run reports
- [Agent Eval](./agent-eval.md) — regression testing for agent behavior
- [API Stability](./api-stability.md) — stability guarantees for public APIs
