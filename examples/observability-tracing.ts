import {
  Agent,
  Provider,
  createOpenTelemetryTraceSink,
} from "@deskcreate/agentcraft";

// Any tracing backend with a startSpan-compatible API can be bridged.
// This tiny tracer logs span starts/ends instead of sending to a collector.
const consoleTracer = {
  startSpan(name: string, options?: { attributes?: Record<string, unknown> }) {
    console.log("span:start", name, options?.attributes ?? {});
    return {
      end: () => console.log("span:end", name),
      recordException: (error: unknown) => console.log("span:error", error),
      setStatus: (status: { code: number; message?: string }) =>
        console.log("span:status", status),
    };
  },
};

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Explain why trace IDs help production AI systems.",
  // This sink receives model/tool/adapter/MCP/guardrail/retry spans.
  // trace alternatives:
  // - true: return trace spans in the response
  // - false/omitted: no tracing
  // - TraceSink object: send spans to your telemetry pipeline
  trace: createOpenTelemetryTraceSink(consoleTracer),
});

console.log(response.content);
