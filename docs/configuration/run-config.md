# Run Config

Run config (`AgentRunParams`) is the request-specific layer passed to `agent.run()` or `agent.stream()`. It carries the prompt, multimodal inputs, structured output, sampling parameters, per-run tools, and budget.

## All Fields

| Field              | Required | Default       | Purpose                                                            |
| ------------------ | -------- | ------------- | ------------------------------------------------------------------ |
| `prompt`           | Usually  | None          | User task string.                                                  |
| `promptFile`       | No       | None          | Path to a `.md` or `.txt` file used as the prompt.                 |
| `vars`             | No       | `{}`          | Variables injected into `{{varName}}` placeholders in the prompt.  |
| `system`           | No       | Agent default | Per-run system prompt override.                                    |
| `files`            | No       | `[]`          | Array of `AgentFile` (base64 or URL file inputs).                  |
| `images`           | No       | `[]`          | Array of `AgentImage` for vision inputs.                           |
| `audio`            | No       | `[]`          | Array of `AgentAudio` for audio inputs.                            |
| `video`            | No       | `[]`          | Array of `AgentVideo` for video inputs.                            |
| `responseSchema`   | No       | None          | Zod schema or JSON Schema for structured output.                   |
| `structuredOutput` | No       | None          | `{ retries?, toolFallback? }` — structured output retry settings.  |
| `responseFormat`   | No       | None          | Low-level response format hint passed to the provider.             |
| `tools`            | No       | `[]`          | Per-run tool definitions added on top of adapter tools.            |
| `use`              | No       | None          | Skills, adapters, or creator packs attached for this run only.     |
| `toolPolicy`       | No       | Agent default | Per-run `ToolPolicy` override merged with agent-level policy.      |
| `budget`           | No       | Agent default | `RunBudget` — caps tokens, cost, tool calls, and duration.         |
| `cache`            | No       | Agent default | `false` to bypass cache, or `{ bypass: true }` to disable for run. |
| `trace`            | No       | Agent default | `TraceSink` or `true` to enable tracing for this run.              |
| `signal`           | No       | None          | `AbortSignal` to cancel the run.                                   |
| `replay`           | No       | None          | Replay a previous `AgentResponse` instead of calling the provider. |
| `temperature`      | No       | Agent default | Sampling temperature (0–2).                                        |
| `maxTokens`        | No       | Agent default | Max output tokens.                                                 |
| `topP`             | No       | Agent default | Nucleus sampling probability.                                      |
| `frequencyPenalty` | No       | Agent default | Penalize repeated tokens.                                          |
| `presencePenalty`  | No       | Agent default | Penalize tokens already in the output.                             |
| `stopSequences`    | No       | `[]`          | Stop generation when any of these strings appear.                  |

## Patterns

### Basic Prompt

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Summarize the benefits of TypeScript in three bullet points.",
});

console.log(response.content);
```

### Structured Output

```ts
import { Agent, Provider } from "agentcraft";
import { z } from "zod";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const ArticleSchema = z.object({
  title: z.string(),
  claims: z.array(z.string()),
  summary: z.string(),
});

const response = await agent.run({
  prompt: "Extract the title, key claims, and summary from this article.",
  responseSchema: ArticleSchema,
  structuredOutput: { retries: 2 }, // retry extraction up to 2 times
});

console.log(response.structuredResponse);
```

### Per-Run System Prompt

```ts
const response = await agent.run({
  prompt: "Translate the following text to French.",
  system:
    "You are a professional French translator. Output only the translation.",
});
```

### Sampling Parameters

```ts
const response = await agent.run({
  prompt: "Write a creative opening for a fantasy novel.",
  temperature: 1.2, // more creative
  maxTokens: 300,
  stopSequences: ["\n\n"],
});
```

### Per-Run Tools

```ts
import { tool } from "agentcraft/adapters";

const lookupInventory = tool({
  name: "lookup_inventory",
  description: "Check inventory for a product SKU.",
  security: { sideEffect: "read" },
  params: { sku: { type: "string", description: "Product SKU." } },
  run: async ({ sku }) => ({ sku, inStock: true, quantity: 42 }),
});

const response = await agent.run({
  prompt: "Check if SKU-1234 is in stock.",
  tools: [lookupInventory], // added only for this run
});
```

### Per-Run Adapter Attachment

```ts
import { FirecrawlAdapter } from "agentcraft/adapters";
import { CreatorPacks } from "agentcraft/packs";

const response = await agent.run({
  prompt: "Research this topic and draft a blog post.",
  use: [
    FirecrawlAdapter.connect({ apiKey: process.env.FIRECRAWL_API_KEY! }),
    CreatorPacks.blog({ cache: "auto" }),
  ],
  budget: { maxToolCalls: 5, maxCost: 0.1 },
});
```

### Multimodal Inputs

```ts
import { readFileSync } from "node:fs";

const response = await agent.run({
  prompt: "What is shown in this image?",
  images: [
    {
      type: "base64",
      mediaType: "image/png",
      data: readFileSync("./screenshot.png").toString("base64"),
    },
  ],
});
```

### File Inputs

```ts
import { readFileSync } from "node:fs";

const response = await agent.run({
  prompt: "Summarize the contents of this PDF.",
  files: [
    {
      type: "base64",
      filename: "report.pdf",
      mediaType: "application/pdf",
      data: readFileSync("./report.pdf").toString("base64"),
    },
  ],
});
```

### Per-Run Budget

```ts
const response = await agent.run({
  prompt: "Research and write an article.",
  budget: {
    maxTokens: 2000,
    maxCost: 0.05,
    maxToolCalls: 8,
    maxDurationMs: 30_000,
  },
});
```

### Per-Run Cache Bypass

```ts
// Bypass cache for a single run (always calls the provider/tools live)
const response = await agent.run({
  prompt: "Get the current stock price for AAPL.",
  cache: { bypass: true },
});
```

### Per-Run Tool Policy

```ts
const response = await agent.run({
  prompt: "Delete the old draft.",
  tools: [deleteDraftTool],
  toolPolicy: {
    readOnly: false,
    approvedTools: ["delete_draft"], // approve only this run
  },
});
```

### Cancellation with AbortSignal

```ts
const controller = new AbortController();

setTimeout(() => controller.abort(), 10_000); // cancel after 10 seconds

const response = await agent.run({
  prompt: "Perform a long research task.",
  signal: controller.signal,
});
```

### Replay a Previous Response

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// Capture a real response
const real = await agent.run({ prompt: "Summarize TypeScript generics." });

// Replay it deterministically — no provider call
const replayed = await agent.run({
  prompt: "Summarize TypeScript generics.",
  replay: real,
});

console.log(replayed.content === real.content); // true
```

## Related

- [Agent Config](./agent-config.md)
- [Structured Output Config](./structured-output-config.md)
- [Tool Policy Config](./tool-policy-config.md)
- [Budgets & Cost](../core/budgets-cost.md)
- [Running Agents](../core/running-agents.md)
