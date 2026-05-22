# Observability Config

Tracing and sink configuration.

## `AgentReports.traceCollector()` Options

Creates a `TraceCollector` that captures all spans during a run:

```ts
import { AgentReports } from "@deskcreate/agentcraft";

const collector = AgentReports.traceCollector({
  maxSpans: 1000,       // optional: cap span count
  includeKinds: ["llm", "tool", "cache"],  // optional: filter span types
});

const response = await agent.run({
  prompt: "Hello",
  trace: collector,
});

const spans = collector.spans();
const fixture = collector.replayFixture();
```

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `maxSpans` | `number` | Unlimited | Maximum spans to store before dropping older ones. |
| `includeKinds` | `string[]` | All kinds | Only collect spans of these kinds. |

## `RunTracer` Interface

Any object implementing `RunTracer` can be passed to `agent.run({ trace })`:

```ts
interface RunTracer {
  startSpan(name: string, options?: SpanOptions): Span;
  endSpan(span: Span, status: 'ok' | 'error', error?: Error): void;
}
```

## `createOpenTelemetryTraceSink()` Options

Connect AgentCraft traces to any OpenTelemetry-compatible backend:

```ts
import { createOpenTelemetryTraceSink } from "@deskcreate/agentcraft";

const otelSink = createOpenTelemetryTraceSink({
  serviceName: "my-agent-service",
  exporterUrl: "https://api.honeycomb.io",
  headers: {
    "x-honeycomb-team": process.env.HONEYCOMB_API_KEY!,
  },
  // Optional:
  // resource: { "deployment.environment": "production" },
  // samplingRate: 1.0,
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

| Option | Type | Required | Description |
| --- | --- | --- | --- |
| `serviceName` | `string` | Yes | Service name attached to all spans. |
| `exporterUrl` | `string` | Yes | OTel-compatible exporter endpoint. |
| `headers` | `Record<string, string>` | No | Auth and routing headers. |
| `resource` | `Record<string, string>` | No | Resource attributes added to all spans. |
| `samplingRate` | `number` | `1.0` | Fraction of traces to export (0–1). |

## Span Kinds

| Kind | What it represents |
| --- | --- |
| `run` | The full `agent.run()` call |
| `llm` | A single LLM API request |
| `tool` | A single tool execution |
| `cache` | A cache lookup (hit or miss) |
| `skill` | Skill prompt assembly |
| `workflow-step` | A single workflow step execution |

## Span Attributes

All spans include:

| Attribute | Description |
| --- | --- |
| `agentcraft.run.id` | Unique run ID |
| `agentcraft.model` | Model string used |
| `agentcraft.provider` | Provider name |
| `agentcraft.cost.usd` | Cost for this span's operation |
| `agentcraft.tokens.total` | Total tokens for this span |

## Connecting to OTel Collectors

```ts
// Jaeger
const sink = createOpenTelemetryTraceSink({
  serviceName: "agent",
  exporterUrl: "http://localhost:4318/v1/traces", // OTLP HTTP
});

// Datadog
const sink = createOpenTelemetryTraceSink({
  serviceName: "agent",
  exporterUrl: "https://trace.agent.datadoghq.com/api/v0.2/traces",
  headers: { "DD-API-KEY": process.env.DD_API_KEY! },
});
```

## Related

- [Observability & Tracing](../core/observability-replay.md)
- [Production Observability](../production/observability-reports.md)
- [AgentReports](../production/agent-reports.md)
