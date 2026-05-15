# Streaming

`agent.stream(params)` returns an `AsyncGenerator<StreamChunk>`. It accepts the same parameters as `agent.run()`. When tools are attached, tool call and result events are included in the stream automatically.

## Quick Start

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// Stream text deltas to stdout as they arrive
for await (const chunk of agent.stream({
  prompt: "Draft a short release note for AgentCraft v0.2.0.",
})) {
  if (chunk.type === "model_delta") {
    process.stdout.write(chunk.delta); // incremental text token
  }
}
```

## StreamChunk Fields

Each yielded chunk has the following shape:

| Field          | Type                                                       | Present when                         |
| -------------- | ---------------------------------------------------------- | ------------------------------------ |
| `type`         | `"model_delta" \| "tool_call" \| "tool_result" \| "final"` | Always                               |
| `delta`        | `string`                                                   | `"model_delta"` — incremental text   |
| `toolCall`     | `ToolCall`                                                 | `"tool_call"` — model invoked a tool |
| `toolResult`   | `ToolCallResult`                                           | `"tool_result"` — tool finished      |
| `finishReason` | `FinishReason`                                             | `"final"` — stream is complete       |
| `usage`        | `{ prompt, completion, total }`                            | `"final"` — token counts             |
| `runId`        | `string`                                                   | Always (for correlation)             |
| `spanId`       | `string`                                                   | Always (trace span reference)        |

## Patterns

### Stream Text to the Terminal

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

process.stdout.write("Response: ");

for await (const chunk of agent.stream({
  prompt: "Explain streaming in one paragraph.",
})) {
  if (chunk.type === "model_delta") {
    process.stdout.write(chunk.delta); // print each token as it arrives
  }
}

process.stdout.write("\n");
```

### Stream With Tools

When adapters are attached, the stream automatically includes `"tool_call"` and `"tool_result"` events. No extra flag is needed.

```ts
import { Agent, Provider } from "agentcraft";
import { TavilySearchAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

for await (const chunk of agent.stream({
  prompt: "Find the latest TypeScript release and summarize it.",
})) {
  switch (chunk.type) {
    case "model_delta":
      // incremental text from the model
      process.stdout.write(chunk.delta);
      break;
    case "tool_call":
      // model decided to call a tool
      console.log(`\n[tool] calling: ${chunk.toolCall?.name}`);
      break;
    case "tool_result":
      // tool finished executing
      console.log(`[tool] result received`);
      break;
    case "final":
      // stream complete — usage available
      console.log(`\n[done] finish: ${chunk.finishReason}`);
      console.log(`[done] tokens: ${chunk.usage?.total}`);
      break;
  }
}
```

### Collect Full Response After Streaming

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// Stream to stdout AND accumulate the full text
let fullText = "";

for await (const chunk of agent.stream({
  prompt: "Write a haiku about TypeScript.",
})) {
  if (chunk.type === "model_delta") {
    process.stdout.write(chunk.delta);
    fullText += chunk.delta;
  }
  if (chunk.type === "final") {
    console.log(`\nTotal tokens: ${chunk.usage?.total}`);
  }
}

console.log("\nFull response:", fullText);
```

### Stream With Cancellation

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const controller = new AbortController();

// Cancel streaming after 3 seconds
const timeout = setTimeout(() => {
  controller.abort();
  console.log("\n[cancelled]");
}, 3_000);

try {
  for await (const chunk of agent.stream({
    prompt: "Tell me a very long story.",
    signal: controller.signal, // abort signal is respected
  })) {
    if (chunk.type === "model_delta") {
      process.stdout.write(chunk.delta);
    }
  }
} finally {
  clearTimeout(timeout);
}
```

### Stream With Budget

```ts
import { Agent, Provider } from "agentcraft";
import { TavilySearchAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

// Budget is enforced as a pre-flight check before streaming begins
for await (const chunk of agent.stream({
  prompt: "Research and summarize the top 3 AI frameworks.",
  budget: {
    maxToolCalls: 5, // model may call at most 5 tools
    maxCost: 0.1, // abort if estimated cost exceeds $0.10
  },
})) {
  if (chunk.type === "model_delta") {
    process.stdout.write(chunk.delta);
  }
}
```

### Stream With Run-Scoped Adapter

```ts
import { Agent, Provider } from "agentcraft";
import { TavilySearchAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const search = TavilySearchAdapter.connect({
  apiKey: process.env.TAVILY_API_KEY!,
});

// Attach the adapter only for this stream — cleaned up after the generator completes
for await (const chunk of agent.stream({
  prompt: "Search for AgentCraft and summarize.",
  use: search, // run-scoped, not permanently attached to the agent
})) {
  if (chunk.type === "model_delta") {
    process.stdout.write(chunk.delta);
  }
}
```

### Stream With Trace

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const spans: unknown[] = [];

for await (const chunk of agent.stream({
  prompt: "Summarize something.",
  trace: {
    // Custom TraceSink — called as spans open and close
    onSpanStart: (span) => spans.push({ event: "start", ...span }),
    onSpanEnd: (span) => spans.push({ event: "end", ...span }),
  },
})) {
  if (chunk.type === "model_delta") {
    process.stdout.write(chunk.delta);
  }
}

console.log(`Captured ${spans.length} trace events`);
```

## Checking Streaming Support

Not all models support streaming. Check before using `agent.stream()`:

```ts
import { Agent, Provider } from "agentcraft";

const model = Provider.openai["gpt-4o-mini"];

if (!Agent.supports(model, "streaming")) {
  throw new Error(
    `${model} does not support streaming — use agent.run() instead`,
  );
}

const agent = Agent.create({
  model,
  apiKey: process.env.OPENAI_API_KEY!,
});

for await (const chunk of agent.stream({ prompt: "Hello." })) {
  if (chunk.type === "model_delta") process.stdout.write(chunk.delta);
}
```

## Related

- [Agents](./agents.md)
- [Running Agents](./running-agents.md)
- [Tool Policy](../tools/tool-policy.md)
- [Observability and Replay](./observability-replay.md)
