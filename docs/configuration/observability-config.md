# Observability Config

Tracing and sink configuration.

## `AgentReports.traceCollector()`

Creates a `TraceCollector` that captures all spans during a run:

```ts
import { AgentReports } from "@deskcreate/agentcraft";

const collector = AgentReports.traceCollector();

const response = await agent.run({
  prompt: "Hello",
  trace: collector,
});

const spans = collector.spans();
const fixture = collector.replayFixture();
```

## `TraceSink` Interface

Any object implementing `TraceSink` can be passed to `agent.run({ trace })`:

```ts
import type { TraceSink } from "@deskcreate/agentcraft";

const sink: TraceSink = {
  onSpanStart(span) {
    console.log("started", span.name);
  },
  onSpanEnd(span) {
    console.log("ended", span.name, span.status);
  },
};

await agent.run({
  prompt: "Hello",
  trace: sink,
});
```

```ts
interface TraceSink {
  onSpanStart?: (span: TraceSpan) => void;
  onSpanEnd?: (span: TraceSpan) => void;
}
```

## `createOpenTelemetryTraceSink()` Options

Connect AgentCraft traces to any OpenTelemetry-compatible backend:

```ts
import { createOpenTelemetryTraceSink } from "@deskcreate/agentcraft";

const otelSink = createOpenTelemetryTraceSink({
  startSpan(name, options) {
    return tracer.startSpan(name, options);
  },
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Hello",
  trace: otelSink,
});
```

`createOpenTelemetryTraceSink()` accepts any tracer-like object with `startSpan(name, options)`.

## Span Kinds

| Kind        | What it represents          |
| ----------- | --------------------------- |
| `agent`     | The full `agent.run()` call |
| `model`     | A single LLM API request    |
| `tool`      | A single tool execution     |
| `mcp`       | An MCP server interaction   |
| `adapter`   | Adapter setup or execution  |
| `team`      | A multi-agent team span     |
| `retry`     | A retry attempt             |
| `guardrail` | A guardrail check           |

## Span Attributes

Spans include a stable envelope plus operation-specific attributes:

| Attribute               | Description                                                |
| ----------------------- | ---------------------------------------------------------- |
| `runId`                 | Unique run ID                                              |
| `spanId`                | Unique span ID                                             |
| `parentSpanId`          | Parent span ID when nested                                 |
| `name`                  | Span name                                                  |
| `kind`                  | Span kind such as `agent`, `model`, `tool`, or `guardrail` |
| `startedAt` / `endedAt` | ISO timestamps                                             |
| `status`                | `ok` or `error`                                            |
| `attributes`            | Optional operation-specific metadata                       |

## Connecting to OTel Collectors

```ts
import { trace } from "@opentelemetry/api";
import { createOpenTelemetryTraceSink } from "@deskcreate/agentcraft";

const sink = createOpenTelemetryTraceSink(trace.getTracer("agentcraft"));
```

Configure Jaeger, Datadog, Honeycomb, or another collector through your OpenTelemetry SDK setup; AgentCraft only needs the tracer-like object.

## Related

- [Observability & Tracing](../core/observability-replay.md)
- [Production Observability](../production/observability-reports.md)
- [AgentReports](../production/agent-reports.md)
