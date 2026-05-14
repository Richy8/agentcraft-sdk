# Streaming

Streaming lets your UI receive model deltas and tool events while a run is still in progress.

## Quick Start

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

for await (const event of agent.stream({
  prompt: "Draft a short release note.",
  streamWithTools: true,
})) {
  if (event.type === "model_delta") process.stdout.write(event.content);
}
```

## Configuration

| Field             | Required | Default                  | Purpose                                    |
| ----------------- | -------- | ------------------------ | ------------------------------------------ |
| `streamWithTools` | No       | Provider/runtime default | Includes tool-call events where supported. |
| `toolPolicy`      | No       | Agent policy             | Applies to streamed tool execution too.    |
| `budget`          | No       | None                     | Caps work before/during stream.            |
| `trace`           | No       | None                     | Captures stream spans.                     |

## Pattern: Tool-Aware Stream

```ts
import { Agent, Provider } from "agentcraft";
import { FetchAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(FetchAdapter.connect({ allowedDomains: ["developer.mozilla.org"] }));

for await (const chunk of agent.stream({
  prompt: "Check this link and explain the result.",
  streamWithTools: true,
  toolPolicy: { maxResultBytes: 20_000 },
})) {
  if (chunk.type === "model_delta") process.stdout.write(chunk.content);
  if (chunk.type === "tool_call") console.log("calling:", chunk.toolName);
  if (chunk.type === "tool_result") console.log("result ready");
}
```

## More Examples

- [Streaming with tools](../examples.md#streaming-with-tools)
- [Tool Policy](../tools/tool-policy.md)
