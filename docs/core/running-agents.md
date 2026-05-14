# Running Agents

`agent.run(...)` executes a prompt once and returns content, model metadata, cost, token usage, traces, selection metadata, and cache metadata.

## Minimal Run

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Summarize the benefits of read-only tools.",
});

console.log(response.content);
```

## Configuration

| Field                               | Required | Default              | Purpose                             |
| ----------------------------------- | -------- | -------------------- | ----------------------------------- |
| `prompt`                            | Usually  | None                 | Inline task text.                   |
| `system`                            | No       | Agent/skill prompts  | Additional system instruction.      |
| `images`, `files`, `audio`, `video` | No       | Empty                | Multimodal inputs.                  |
| `tools`                             | No       | Agent attached tools | Run-specific tools.                 |
| `toolPolicy`                        | No       | Agent policy         | Per-run tool policy override/merge. |
| `budget`                            | No       | None                 | Max tokens, cost, or tool calls.    |
| `responseSchema`                    | No       | None                 | Structured output validation.       |
| `cache`                             | No       | Agent cache config   | Per-run cache bypass.               |

## Patterns

### Run With Budget

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Research and draft an outline.",
  budget: {
    maxToolCalls: 3,
    maxTokens: 2_000,
    maxCost: 0.05,
  },
});

console.log(response.content);
```

### Run With Cache Bypass

```ts
import { Agent, AgentCache, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache: AgentCache.file("./.agentcraft/cache"),
});

const response = await agent.run({
  prompt: "Refresh this page summary from source.",
  cache: { bypass: true },
});

console.log(response.content);
```

### Run With Files

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Review this document for unclear sections.",
  files: [{ type: "text", name: "draft.md", content: "# Draft..." }],
});

console.log(response.content);
```

## Related

- [Run Config](../configuration/run-config.md)
- [Structured Output](./structured-output.md)
- [Budgets And Cost](./budgets-cost.md)
