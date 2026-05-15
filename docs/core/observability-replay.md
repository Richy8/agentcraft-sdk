# Observability and Replay

Tracing makes agent runs inspectable — every model call, tool invocation, and adapter hook is captured as a span. Replay makes tests and demos deterministic by returning a fixture response without calling the provider.

## Tracing

Pass `trace: true` to collect spans into `response.trace`, or pass a `TraceSink` to stream spans in real time.

### Quick Start — Collect Spans

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// trace: true collects all spans into response.trace
const response = await agent.run({
  prompt: "Summarize this task.",
  trace: true,
});

// response.trace is a TraceSpan[]
const spans = response.trace as import("agentcraft").TraceSpan[];
console.log(`Spans captured: ${spans.length}`);
for (const span of spans) {
  console.log(`${span.kind}: ${span.name} — ${span.status}`);
}
```

## TraceSink

A `TraceSink` receives spans as they open and close — useful for live logging, forwarding to external systems, or custom dashboards.

```ts
export interface TraceSink {
  onSpanStart?: (span: TraceSpan) => void;
  onSpanEnd?: (span: TraceSpan) => void;
}
```

## TraceSpan Fields

| Field          | Type                                                                                     | Purpose                                 |
| -------------- | ---------------------------------------------------------------------------------------- | --------------------------------------- |
| `runId`        | `string`                                                                                 | Unique run identifier.                  |
| `spanId`       | `string`                                                                                 | Unique span identifier.                 |
| `parentSpanId` | `string`                                                                                 | Parent span (for nested spans).         |
| `name`         | `string`                                                                                 | Span name (e.g. `"tool.web_search"`).   |
| `kind`         | `"agent" \| "model" \| "tool" \| "mcp" \| "adapter" \| "team" \| "retry" \| "guardrail"` | Span category.                          |
| `startedAt`    | `string`                                                                                 | ISO timestamp when the span started.    |
| `endedAt`      | `string`                                                                                 | ISO timestamp when the span ended.      |
| `status`       | `"ok" \| "error"`                                                                        | Outcome of the span.                    |
| `attributes`   | `Record<string, unknown>`                                                                | Span-specific metadata.                 |
| `error`        | `string`                                                                                 | Error message if `status` is `"error"`. |

## Patterns

### Stream Spans in Real Time

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import type { TraceSpan } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// Pass a TraceSink directly — spans fire as they open and close
const response = await agent.run({
  prompt: "Research the top TypeScript frameworks.",
  trace: {
    onSpanStart: (span: TraceSpan) => {
      console.log(`[start] ${span.kind}: ${span.name}`);
    },
    onSpanEnd: (span: TraceSpan) => {
      const ms = span.endedAt
        ? new Date(span.endedAt).getTime() - new Date(span.startedAt).getTime()
        : 0;
      console.log(
        `[end]   ${span.kind}: ${span.name} — ${span.status} (${ms}ms)`,
      );
    },
  },
});

console.log(response.content);
```

### Filter Spans by Kind

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import type { TraceSpan } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Research and summarize.",
  trace: true,
});

const spans = response.trace as TraceSpan[];

// Inspect only tool spans
const toolSpans = spans.filter((s) => s.kind === "tool");
for (const span of toolSpans) {
  console.log(`Tool: ${span.name}, status: ${span.status}`);
  if (span.attributes) console.log("  attrs:", span.attributes);
}

// Check for any errors
const errorSpans = spans.filter((s) => s.status === "error");
if (errorSpans.length > 0) {
  console.error(
    "Errors during run:",
    errorSpans.map((s) => s.error),
  );
}
```

### Measure Latency Per Span

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import type { TraceSpan } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Run a tool and summarize.",
  trace: true,
});

const spans = response.trace as TraceSpan[];

for (const span of spans) {
  if (!span.endedAt) continue;
  const ms =
    new Date(span.endedAt).getTime() - new Date(span.startedAt).getTime();
  console.log(`${span.name.padEnd(30)} ${ms}ms`);
}
```

### OpenTelemetry Integration

`createOpenTelemetryTraceSink` bridges AgentCraft spans to any OpenTelemetry-compatible tracer.

```ts
import {
  Agent,
  Provider,
  createOpenTelemetryTraceSink,
} from "@deskcreate/agentcraft";
import { trace } from "@opentelemetry/api";

// Get a tracer from your OTel provider
const otelTracer = trace.getTracer("agentcraft");

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// createOpenTelemetryTraceSink returns a TraceSink that forwards spans to OTel
const response = await agent.run({
  prompt: "Do something traceable.",
  trace: createOpenTelemetryTraceSink(otelTracer),
});

console.log(response.content);
// Spans appear in your OTel backend (Jaeger, Datadog, Honeycomb, etc.)
```

### Forward to a Custom Backend

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import type { TraceSpan } from "@deskcreate/agentcraft";

const completedSpans: TraceSpan[] = [];

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Complete this task.",
  trace: {
    // Only collect completed spans — ignore open spans
    onSpanEnd: (span: TraceSpan) => completedSpans.push(span),
  },
});

// Send to your own observability backend
await fetch("https://your-backend.example.com/traces", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ runId: response.runId, spans: completedSpans }),
});
```

## Replay

Replay returns a pre-recorded `AgentResponse` without making any provider calls. Useful for tests, demos, and golden-path assertions.

### Single Response Replay

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import type { AgentResponse } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// A pre-recorded fixture — this is the full AgentResponse shape
const fixture: AgentResponse = {
  content: "TypeScript is a typed superset of JavaScript.",
  tokensUsed: { prompt: 12, completion: 18, total: 30 },
  cost: 0.000003,
  finishReason: "stop",
  model: "gpt-4o-mini",
  provider: "openai",
};

// No LLM call is made — the fixture is returned directly
const response = await agent.run({
  prompt: "What is TypeScript?",
  replay: fixture,
});

console.log(response.content); // → "TypeScript is a typed superset of JavaScript."
```

### Replay From a List (Round-Robin)

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import type { AgentResponse } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const responses: AgentResponse[] = [
  {
    content: "First response.",
    tokensUsed: { prompt: 5, completion: 5, total: 10 },
    cost: 0.000001,
    finishReason: "stop",
    model: "gpt-4o-mini",
    provider: "openai",
  },
  {
    content: "Second response.",
    tokensUsed: { prompt: 5, completion: 5, total: 10 },
    cost: 0.000001,
    finishReason: "stop",
    model: "gpt-4o-mini",
    provider: "openai",
  },
];

// index: 0 returns responses[0], index: 1 returns responses[1], etc.
const first = await agent.run({
  prompt: "First prompt.",
  replay: { responses, index: 0 },
});
console.log(first.content); // → "First response."

const second = await agent.run({
  prompt: "Second prompt.",
  replay: { responses, index: 1 },
});
console.log(second.content); // → "Second response."
```

### Replay in Tests

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import type { AgentResponse } from "@deskcreate/agentcraft";
import { describe, it, expect } from "vitest";

describe("my agent pipeline", () => {
  it("processes the response correctly", async () => {
    const agent = Agent.create({
      model: Provider.openai["gpt-4o-mini"],
      apiKey: "test-key", // not used in replay mode
    });

    const fixture: AgentResponse = {
      content: JSON.stringify({ priority: "p0", category: "bug" }),
      tokensUsed: { prompt: 20, completion: 15, total: 35 },
      cost: 0.000005,
      finishReason: "stop",
      model: "gpt-4o-mini",
      provider: "openai",
    };

    // Use replay so tests never call the real API
    const response = await agent.run({
      prompt: "Classify this ticket.",
      replay: fixture,
    });

    expect(response.content).toContain("p0");
    expect(response.cost).toBeLessThan(0.01);
  });
});
```

## Prompt Provenance

Every response includes `promptProvenance` — metadata about how the prompt was assembled.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// Inline prompt
const inlineResponse = await agent.run({ prompt: "Hello." });
console.log(inlineResponse.promptProvenance);
// → { source: "inline", assembled: false }

// File-based prompt with variable injection
const fileResponse = await agent.run({
  promptFile: "prompts/release-note.prompt",
  vars: { product: "AgentCraft" },
});
console.log(fileResponse.promptProvenance);
// → { source: "file", promptFile: "prompts/release-note.prompt", assembled: true }
```

## Related

- [Running Agents](./running-agents.md)
- [Streaming](./streaming.md)
- [Budgets and Cost](./budgets-cost.md)
