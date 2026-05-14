# Agent Config

Agent config controls the provider, model, defaults, cache, logger, tracing, and capability environment for all runs on that agent.

## Fields

| Option       | Required | Default         | Purpose                                                                               |
| ------------ | -------- | --------------- | ------------------------------------------------------------------------------------- |
| `provider`   | Yes      | None            | Provider key such as `openai`, `anthropic`, `google`, or local-compatible providers.  |
| `model`      | Yes      | None            | Model identifier from the provider/catalog.                                           |
| `toolPolicy` | No       | Runtime default | Controls approval, read-only mode, retries, guardrails, redaction, and result limits. |
| `cache`      | No       | Disabled        | Adds `AgentCache` for reusable context and tool output.                               |

## Usage

```ts
import { Agent, AgentCache, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  temperature: 0.3,
  maxTokens: 1_000,
  toolPolicy: { readOnly: true, maxResultBytes: 20_000 },
  cache: AgentCache.file(".agentcraft/cache", { strategy: "auto" }),
});

const response = await agent.run({
  prompt: "Summarize the latest docs page.",
  budget: { maxToolCalls: 6 },
});

console.log(response.content);
```

## Related Config

| Topic            | Page                                        | Why it matters        | Example                                               |
| ---------------- | ------------------------------------------- | --------------------- | ----------------------------------------------------- |
| Provider routing | [Models](../core/models-and-providers.md)   | Pick the right model  | [Provider cookbook](../examples-cookbook/provider.md) |
| Cache            | [AgentCache](../persistence/agent-cache.md) | Reduce repeated spend | [Cache config](./cache-config.md)                     |
| Tools            | [Tool Policy](../tools/tool-policy.md)      | Bound side effects    | [Tool policy config](./tool-policy-config.md)         |
| Runs             | [Run Config](./run-config.md)               | Override per prompt   | [Beginner examples](../examples-cookbook/beginner.md) |
