# Observability And Replay

Observability makes agent runs reviewable. Replay makes tests and demos deterministic.

## Quick Start

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Summarize this task.",
  trace: {
    sink: {
      onSpan: (span) => console.log(span.name, span.status),
    },
  },
});

console.log(response.trace?.spans.length);
```

## Configuration

| Field                          | Required  | Default                  | Purpose                                              |
| ------------------------------ | --------- | ------------------------ | ---------------------------------------------------- |
| `trace`                        | No        | In-memory trace          | Captures model/tool/adapter spans.                   |
| `createOpenTelemetryTraceSink` | No        | None                     | Bridges to OpenTelemetry-like tracers.               |
| `replay`                       | No        | None                     | Returns fixture response without live provider call. |
| `promptProvenance`             | Automatic | Included where available | Shows prompt source and assembly info.               |

## Replay Pattern

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Demo without provider calls.",
  replay: {
    content: "This is a replayed response.",
    model: "test",
    provider: "replay",
  },
});

console.log(response.content); // "This is a replayed response."
```

## More Examples

- [Observability tracing](../examples.md#observability-tracing)
- [Replay mode](../examples.md#replay-mode)
