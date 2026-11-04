# Agent Events

`AgentWorkspace` exposes a typed event bus that fires during cache operations, cost updates, tool calls, approval workflows, workflow step transitions, artifact reads/writes, and memory operations. Subscribe to events to build real-time cost dashboards, audit logs, alerting pipelines, and observability integrations without modifying agent logic.

## Quick Start

```ts
import { AgentWorkspace, AgentWorkflow, Agent, Provider } from "@deskcreate/agentcraft";
import { AgentStep } from "@deskcreate/agentcraft/team";

// Create a workspace — events are scoped to the workspace
const workspace = AgentWorkspace.memory();

// Subscribe to events before running any agents
workspace.events.on("cost.updated", ({ provider, model, cost, tokensUsed }) => {
  console.log(`[cost] ${provider}/${model} — $${cost.toFixed(6)} (${tokensUsed.total} tokens)`);
});

workspace.events.on("tool.called", ({ toolName, sideEffectLevel }) => {
  console.log(`[tool] ${toolName} — side effect: ${sideEffectLevel ?? "none"}`);
});

workspace.events.on("cache.hit", ({ toolName, estimatedSavedTokens }) => {
  console.log(`[cache:hit] ${toolName} — saved ~${estimatedSavedTokens ?? 0} tokens`);
});

// All agents in this workspace emit to the shared bus
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  workspace,
});

await agent.run({ prompt: "What is the capital of France?" });
// → [cost] openai/gpt-4o-mini — $0.000012 (48 tokens)
```

## Event Reference

### `cache.hit`

Fires when a tool call result is served from cache, skipping execution entirely.

```ts
workspace.events.on("cache.hit", (event) => {
  // event.toolName            — name of the tool that was cached
  // event.key                 — cache key (hash of toolName + args)
  // event.estimatedSavedTokens — how many tokens were saved by using the cache
  console.log(`Cache hit: ${event.toolName}, saved ~${event.estimatedSavedTokens ?? 0} tokens`);
});
```

### `cache.miss`

Fires when a tool call is not found in cache and must execute.

```ts
workspace.events.on("cache.miss", (event) => {
  // event.toolName — the tool that missed
  // event.key      — the cache key that was checked
  console.log(`Cache miss: ${event.toolName}`);
});
```

### `cache.write`

Fires after a tool call result is written to cache.

```ts
workspace.events.on("cache.write", (event) => {
  // event.toolName — the tool whose result was cached
  // event.key      — the cache key written
  console.log(`Cached result for: ${event.toolName}`);
});
```

### `cost.updated`

Fires after each completed LLM call with the incremental cost and token usage.

```ts
workspace.events.on("cost.updated", (event) => {
  // event.provider   — e.g. "openai"
  // event.model      — e.g. "gpt-4o-mini"
  // event.cost       — cost in USD for this call
  // event.tokensUsed — { input: number, output: number, total: number }
  totalCost += event.cost;
  console.log(`Running total: $${totalCost.toFixed(6)}`);
});
```

### `tool.called`

Fires when the model requests a tool call and it passes policy checks.

```ts
workspace.events.on("tool.called", (event) => {
  // event.toolName       — tool name as registered
  // event.sideEffectLevel — "none" | "read" | "write" | "external" | undefined
  if (event.sideEffectLevel === "write") {
    console.warn(`Write tool invoked: ${event.toolName}`);
  }
});
```

### `approval.requested`

Fires when a tool call is queued for human or programmatic approval.

```ts
workspace.events.on("approval.requested", (event) => {
  // event.toolName   — the tool awaiting approval
  // event.sideEffect — the sideEffect level that triggered the gate
  console.log(`Approval requested for: ${event.toolName}`);
});
```

### `approval.granted`

Fires when an approval is granted and the tool proceeds to execution.

```ts
workspace.events.on("approval.granted", (event) => {
  // event.toolName — the approved tool
  console.log(`Approved: ${event.toolName}`);
});
```

### `approval.denied`

Fires when an approval is denied and the tool is blocked.

```ts
workspace.events.on("approval.denied", (event) => {
  // event.toolName — the denied tool
  console.log(`Denied: ${event.toolName}`);
});
```

### `approval.queued`

Fires when an approval request is placed in the governance queue with reviewer assignment.

```ts
workspace.events.on("approval.queued", (event) => {
  // event.toolName  — the tool pending review
  // event.requestId — unique approval request ID
  // event.reviewer  — assigned reviewer ID (if set)
  // event.expiresAt — ISO timestamp for expiry (if set)
  console.log(`Queued approval ${event.requestId} — expires: ${event.expiresAt}`);
});
```

### `approval.expired`

Fires when a queued approval request passes its expiry time without being resolved.

```ts
workspace.events.on("approval.expired", (event) => {
  // event.toolName  — the tool whose approval expired
  // event.requestId — the expired request ID
  console.log(`Approval expired: ${event.requestId} for ${event.toolName}`);
});
```

### `workflow.step.started`

Fires at the start of each workflow step.

```ts
workspace.events.on("workflow.step.started", (event) => {
  // event.stepId — step identifier
  // event.type   — step type, e.g. "agent", "approval", "condition", "parallel"
  console.log(`Step started: ${event.stepId} (${event.type})`);
});
```

### `workflow.step.completed`

Fires when a workflow step finishes, regardless of outcome.

```ts
workspace.events.on("workflow.step.completed", (event) => {
  // event.stepId — step identifier
  // event.status — "completed" | "failed" | "skipped"
  if (event.status === "failed") {
    console.error(`Step failed: ${event.stepId}`);
  }
});
```

### `artifact.read`

Fires when an artifact is read from an `ArtifactStore`.

```ts
workspace.events.on("artifact.read", (event) => {
  // event.type — artifact type (e.g. "blog-post", "report")
  // event.id   — artifact identifier
  console.log(`Artifact read: ${event.type}/${event.id}`);
});
```

### `artifact.write`

Fires when an artifact is written to an `ArtifactStore`.

```ts
workspace.events.on("artifact.write", (event) => {
  // event.type      — artifact type
  // event.id        — artifact identifier
  // event.operation — "put" | "update" | "delete"
  console.log(`Artifact ${event.operation}: ${event.type}/${event.id}`);
});
```

### `memory.read`

Fires when semantic memory is queried during a run.

```ts
workspace.events.on("memory.read", (event) => {
  // event.query          — the retrieval query string
  // event.scopes         — memory scopes searched
  // event.count          — number of results returned
  // event.maxContextChars — context budget used
  // event.provider       — vector backend (e.g. "qdrant")
  // event.connection     — connection string or identifier
  console.log(`Memory read: ${event.count} results for "${event.query}"`);
});
```

### `memory.write`

Fires when a memory entry is added.

```ts
workspace.events.on("memory.write", (event) => {
  // event.id         — memory entry ID
  // event.scope      — memory scope (e.g. "user", "session")
  // event.operation  — always "add"
  // event.source     — source agent or context
  // event.provider   — vector backend
  // event.connection — connection identifier
  console.log(`Memory written: ${event.id} in scope "${event.scope}"`);
});
```

### `memory.delete`

Fires when a memory entry is removed.

```ts
workspace.events.on("memory.delete", (event) => {
  // event.id         — deleted entry ID
  // event.scope      — scope it was in
  // event.provider   — vector backend
  // event.connection — connection identifier
  console.log(`Memory deleted: ${event.id}`);
});
```

### `memory.blocked`

Fires when a memory write or delete is blocked by a policy or guardrail.

```ts
workspace.events.on("memory.blocked", (event) => {
  // event.operation — "write" | "delete"
  // event.scope     — targeted scope
  // event.reason    — human-readable reason for the block
  // event.preview   — content preview (truncated)
  console.warn(`Memory ${event.operation} blocked: ${event.reason}`);
});
```

## Subscribing and Unsubscribing

`workspace.events.on()` returns an unsubscribe function. Use it to clean up handlers when they are no longer needed:

```ts
import { AgentWorkspace } from "@deskcreate/agentcraft";

const workspace = AgentWorkspace.memory();

// Subscribe — returns an unsubscribe function
const unsubscribe = workspace.events.on("cost.updated", ({ cost }) => {
  console.log(`Cost: $${cost.toFixed(6)}`);
});

await agent.run({ prompt: "Hello" });

// Remove the handler
unsubscribe();

// Or use the two-argument form to remove by reference
const handler = ({ toolName }: { toolName: string }) => console.log(toolName);
workspace.events.on("tool.called", handler);
workspace.events.off("tool.called", handler);
```

## Patterns

### Real-Time Cost Dashboard

Track cumulative cost and token usage across all agents in a workspace:

```ts
import { AgentWorkspace, Agent, Provider } from "@deskcreate/agentcraft";

const workspace = AgentWorkspace.memory();

let totalCostUsd = 0;
let totalTokens = 0;
const callsByModel = new Map<string, number>();

workspace.events.on("cost.updated", ({ provider, model, cost, tokensUsed }) => {
  totalCostUsd += cost;
  totalTokens += tokensUsed.total;
  const key = `${provider}/${model}`;
  callsByModel.set(key, (callsByModel.get(key) ?? 0) + 1);
});

// Run multiple agents through the same workspace
const agents = [
  Agent.create({ model: Provider.openai["gpt-4o-mini"], apiKey: process.env.OPENAI_API_KEY!, workspace }),
  Agent.create({ model: Provider.anthropic["claude-haiku-4-5"], apiKey: process.env.ANTHROPIC_API_KEY!, workspace }),
];

await Promise.all(agents.map((a) => a.run({ prompt: "Summarize agentcraft in one sentence." })));

console.log(`Total cost: $${totalCostUsd.toFixed(6)}`);
console.log(`Total tokens: ${totalTokens}`);
console.log("Calls by model:", Object.fromEntries(callsByModel));
```

### Tool Audit Log

Record every tool call with its side-effect level for audit purposes:

```ts
import { AgentWorkspace } from "@deskcreate/agentcraft";
import * as fs from "node:fs";

const workspace = AgentWorkspace.memory();
const auditLog = fs.createWriteStream("audit.log", { flags: "a" });

workspace.events.on("tool.called", ({ toolName, sideEffectLevel }) => {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    event: "tool.called",
    toolName,
    sideEffectLevel,
  });
  auditLog.write(entry + "\n");
});

workspace.events.on("approval.granted", ({ toolName }) => {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    event: "approval.granted",
    toolName,
  });
  auditLog.write(entry + "\n");
});

workspace.events.on("approval.denied", ({ toolName }) => {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    event: "approval.denied",
    toolName,
  });
  auditLog.write(entry + "\n");
});
```

### Cache Efficiency Monitor

Track cache performance across a session and report hit rate:

```ts
import { AgentWorkspace } from "@deskcreate/agentcraft";

const workspace = AgentWorkspace.memory();
let hits = 0, misses = 0, savedTokens = 0;

workspace.events.on("cache.hit", ({ estimatedSavedTokens }) => {
  hits++;
  savedTokens += estimatedSavedTokens ?? 0;
});

workspace.events.on("cache.miss", () => { misses++; });

// After a session:
function reportCacheEfficiency() {
  const total = hits + misses;
  const hitRate = total > 0 ? ((hits / total) * 100).toFixed(1) : "0.0";
  console.log(`Cache hit rate: ${hitRate}% (${hits}/${total})`);
  console.log(`Estimated tokens saved: ${savedTokens}`);
}
```

### Workflow Progress Tracker

Surface workflow step progress to a UI or logging system:

```ts
import { AgentWorkspace } from "@deskcreate/agentcraft";

const workspace = AgentWorkspace.memory();
const stepTimings = new Map<string, number>();

workspace.events.on("workflow.step.started", ({ stepId, type }) => {
  stepTimings.set(stepId, Date.now());
  console.log(`→ Step started: ${stepId} (${type})`);
});

workspace.events.on("workflow.step.completed", ({ stepId, status }) => {
  const startedAt = stepTimings.get(stepId);
  const durationMs = startedAt ? Date.now() - startedAt : 0;
  const icon = status === "completed" ? "✓" : status === "failed" ? "✗" : "–";
  console.log(`${icon} ${stepId} — ${status} in ${durationMs}ms`);
  stepTimings.delete(stepId);
});
```

### Error Isolation

Handler errors are isolated — a throwing subscriber never breaks an agent run:

```ts
workspace.events.on("cost.updated", ({ cost }) => {
  // Even if this throws, the agent run continues normally
  if (cost < 0) throw new Error("Negative cost — something is wrong");
});
```

Workspace event subscribers are observers. Handler errors are isolated so they do not break the agent run that emitted the event.

## `AgentEventMap` Type Reference

```ts
import type { AgentEventMap, AgentEventType } from "@deskcreate/agentcraft";

// AgentEventType is a union of all event name strings:
// "cache.hit" | "cache.miss" | "cache.write" | "cost.updated" |
// "tool.called" | "approval.requested" | "approval.granted" |
// "approval.denied" | "approval.queued" | "approval.expired" |
// "workflow.step.started" | "workflow.step.completed" |
// "artifact.read" | "artifact.write" |
// "memory.read" | "memory.write" | "memory.delete" | "memory.blocked"

// Use it to write typed generic handlers:
function onEvent<K extends AgentEventType>(
  workspace: AgentWorkspace,
  event: K,
  handler: (data: AgentEventMap[K]) => void
) {
  return workspace.events.on(event, handler);
}
```

## All Events at a Glance

| Event | Fires when | Key fields |
| --- | --- | --- |
| `cache.hit` | Tool result served from cache | `toolName`, `key`, `estimatedSavedTokens` |
| `cache.miss` | Tool result not in cache | `toolName`, `key` |
| `cache.write` | Tool result written to cache | `toolName`, `key` |
| `cost.updated` | LLM call completes | `provider`, `model`, `cost`, `tokensUsed` |
| `tool.called` | Tool call passes policy check | `toolName`, `sideEffectLevel` |
| `approval.requested` | Tool queued for approval | `toolName`, `sideEffect` |
| `approval.granted` | Approval resolved as granted | `toolName` |
| `approval.denied` | Approval resolved as denied | `toolName` |
| `approval.queued` | Approval placed in governance queue | `toolName`, `requestId`, `reviewer`, `expiresAt` |
| `approval.expired` | Approval request timed out | `toolName`, `requestId` |
| `workflow.step.started` | Workflow step begins | `stepId`, `type` |
| `workflow.step.completed` | Workflow step ends | `stepId`, `status` |
| `artifact.read` | Artifact read from store | `type`, `id` |
| `artifact.write` | Artifact written to store | `type`, `id`, `operation` |
| `memory.read` | Semantic memory queried | `query`, `scopes`, `count` |
| `memory.write` | Memory entry added | `id`, `scope`, `operation` |
| `memory.delete` | Memory entry removed | `id`, `scope` |
| `memory.blocked` | Memory operation blocked | `operation`, `reason`, `preview` |

## Related

- [Agent Workspace](../orchestration/agent-workspace.md)
- [Workspace Config](../configuration/workspace-config.md)
- [Observability & Tracing](../core/observability-replay.md)
- [Approvals](../tools/approvals.md)
- [Examples & Cookbook: Orchestration](../examples-cookbook/orchestration.md)
