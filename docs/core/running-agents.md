# Running Agents

`agent.run(params)` executes a single prompt and returns an `AgentResponse` with content, token usage, cost, tool calls, traces, cache stats, and selection metadata.

## Quick Start

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
// → "Read-only tools reduce side-effect risk by..."
```

## Run Parameters

All fields passed to `agent.run()` belong to `AgentRunParams`.

### Prompt Fields

| Field        | Required           | Default | Purpose                                                                                                               |
| ------------ | ------------------ | ------- | --------------------------------------------------------------------------------------------------------------------- |
| `prompt`     | Usually            | None    | Inline task text. Supports `&#123;&#123;variable&#125;&#125;` and `&#123;&#123;config.path&#125;&#125;` placeholders. |
| `promptFile` | One of prompt/file | None    | Path to a `.prompt` (or any ext) file. Supports `&#123;&#123;include path&#125;&#125;` composition.                   |
| `vars`       | No                 | `{}`    | Values injected into `&#123;&#123;variable&#125;&#125;` placeholders in prompt or prompt file.                        |
| `assembly`   | No                 | `{}`    | Prompt assembly options: config injection, strict mode, include depth, root dir.                                      |
| `system`     | No                 | None    | Additional system instruction (appended to agent-level system prompt if set).                                         |

### Generation Overrides

Per-run overrides for any generation parameter set on the agent. If not provided, the agent-level value is used.

| Field              | Default       | Purpose                             |
| ------------------ | ------------- | ----------------------------------- |
| `temperature`      | Agent default | Sampling temperature (0–2).         |
| `maxTokens`        | Agent default | Maximum completion tokens.          |
| `topP`             | Agent default | Nucleus sampling probability (0–1). |
| `frequencyPenalty` | Agent default | Repeated-token penalty (-2–2).      |
| `presencePenalty`  | Agent default | Token-presence penalty (-2–2).      |
| `stopSequences`    | Agent default | Up to 4 stop strings.               |
| `responseFormat`   | Agent default | `"text"` or `"json_object"`.        |

### Multimodal Inputs

| Field    | Required | Type           | Purpose                              |
| -------- | -------- | -------------- | ------------------------------------ |
| `images` | No       | `AgentImage[]` | Images passed as base64 or URL.      |
| `audio`  | No       | `AgentAudio[]` | Audio clips passed as base64 or URL. |
| `video`  | No       | `AgentVideo[]` | Video clips passed as base64 or URL. |
| `files`  | No       | `AgentFile[]`  | Documents passed as base64 or URL.   |

**`AgentFile` shape:**

```ts
interface AgentFile {
  type: "base64" | "url"; // how data is delivered
  filename: string; // original file name (e.g. "report.pdf")
  mediaType: string; // MIME type (e.g. "application/pdf", "text/plain")
  data: string; // base64-encoded content or a URL
}
```

**`AgentImage` shape:**

```ts
interface AgentImage {
  type: "base64" | "url";
  mediaType?: "image/png" | "image/jpeg" | "image/webp" | "image/gif";
  data: string;
}
```

### Tools

| Field        | Default              | Purpose                                                                        |
| ------------ | -------------------- | ------------------------------------------------------------------------------ |
| `tools`      | Agent attached tools | Run-specific tool definitions (merged with agent-level tools).                 |
| `use`        | None                 | Attach adapters, skills, or creator packs for this run only. Cleaned up after. |
| `toolPolicy` | Agent policy         | Per-run override or merge of tool approval, guardrails, and limits.            |

### Structured Output

| Field              | Default | Purpose                                                                           |
| ------------------ | ------- | --------------------------------------------------------------------------------- |
| `responseSchema`   | None    | JSON schema or Zod schema. Forces structured output and validates the response.   |
| `structuredOutput` | None    | Options: `retries` (parse retry count), `toolFallback` (use tool for extraction). |

### Budget and Control

| Field    | Default | Purpose                                                                                                  |
| -------- | ------- | -------------------------------------------------------------------------------------------------------- |
| `budget` | None    | `RunBudget`: `maxTokens`, `maxInputTokens`, `maxOutputTokens`, `maxCost`, `maxToolCalls`, `cachePolicy`. |
| `signal` | None    | `AbortSignal` for cancellation.                                                                          |
| `trace`  | None    | `true` to enable tracing, or a `TraceSink` to receive trace spans.                                       |
| `cache`  | None    | `false` to disable cache for this run, or `{ bypass: true }` to skip cache reads/writes.                 |
| `replay` | None    | Replay a previous `AgentResponse` or a list of responses without calling the LLM.                        |

## Response Fields

`agent.run()` returns `AgentResponse`:

| Field                | Type           | Purpose                                                                                          |
| -------------------- | -------------- | ------------------------------------------------------------------------------------------------ |
| `content`            | `string`       | The model's text response.                                                                       |
| `structuredResponse` | `unknown`      | Parsed structured value when `responseSchema` is set.                                            |
| `tokensUsed`         | `TokenUsage`   | `{ prompt, completion, total }` token counts.                                                    |
| `cost`               | `number`       | Estimated run cost in USD.                                                                       |
| `finishReason`       | `FinishReason` | `"stop"`, `"length"`, `"tool_calls"`, `"content_filter"`, etc.                                   |
| `toolCalls`          | `ToolCall[]`   | Tool invocations made during the run (if any).                                                   |
| `model`              | `string`       | Model that handled the run.                                                                      |
| `provider`           | `string`       | Provider that handled the run.                                                                   |
| `runId`              | `string`       | Unique run identifier for correlation.                                                           |
| `trace`              | `unknown[]`    | Trace spans (only populated if `trace` was enabled).                                             |
| `promptProvenance`   | `object`       | `{ source, promptFile?, assembled }` — how the prompt was resolved.                              |
| `selection`          | `object`       | Which skills/tools were active: `activeSkills`, `exposedTools`, `executedToolCalls`.             |
| `cache`              | `object`       | Cache stats: `hits`, `misses`, `writes`, `bypassed`, `toolCallsAvoided`, `estimatedSavedTokens`. |

## Patterns

### Basic Inline Prompt

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "List three benefits of TypeScript in bullet form.",
});

// Access content directly
console.log(response.content);

// Check what it cost and how many tokens were used
console.log(`Cost: $${response.cost.toFixed(4)}`);
console.log(`Tokens: ${response.tokensUsed.total}`);
```

### Prompt With Variable Injection

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// {{topic}} and {{audience}} are injected before the LLM call
const response = await agent.run({
  prompt: "Write a one-paragraph intro to {{topic}} for {{audience}}.",
  vars: {
    topic: "TypeScript generics",
    audience: "junior developers",
  },
});

console.log(response.content);
```

### Prompt From File

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// Loads prompts/release-note.prompt, resolves {{include}} directives,
// injects config and vars — all before the LLM call
const response = await agent.run({
  promptFile: "prompts/release-note.prompt",
  vars: {
    product: "AgentCraft",
    audience: "engineering managers",
  },
  assembly: {
    config: {
      brand: { voice: "clear and practical" },
      release: { channel: "public-beta" },
    },
    strict: true, // throw if any placeholder is unresolved
    minify: true, // trim whitespace before sending
  },
});

console.log(response.content);
console.log(response.promptProvenance); // → { source: "file", promptFile: "...", assembled: true }
```

### Per-Run System Prompt Override

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  system: "You are a helpful assistant.", // agent-level default
});

// The run-level system is appended to the agent-level system
const response = await agent.run({
  prompt: "Review this code.",
  system: "Focus only on type safety and null handling.", // appended to agent system
  temperature: 0.1, // override agent temperature for this run
});

console.log(response.content);
```

### Run With Budget

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// Pre-flight checks run before the LLM call — throws if limits would be exceeded
const response = await agent.run({
  prompt: "Research and draft an outline.",
  budget: {
    maxToolCalls: 5, // model may invoke at most 5 tools
    maxTokens: 3_000, // total token budget (input + output)
    maxCost: 0.05, // abort if estimated cost exceeds $0.05
  },
});

console.log(response.content);
console.log(`Actual cost: $${response.cost.toFixed(4)}`);
```

### Run With Cancellation (AbortSignal)

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const controller = new AbortController();

// Cancel after 5 seconds if the model hasn't responded
const timeout = setTimeout(() => controller.abort(), 5_000);

try {
  const response = await agent.run({
    prompt: "Summarize a very long document.",
    signal: controller.signal, // passed through to the provider fetch
  });
  console.log(response.content);
} catch (error) {
  console.error("Run was cancelled:", error);
} finally {
  clearTimeout(timeout);
}
```

### Run With Cache Bypass

```ts
import { Agent, AgentCache, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache: AgentCache.file(".agentcraft/cache", { strategy: "auto" }),
});

// Normal run — cache is active, tool results may be served from cache
const cached = await agent.run({ prompt: "Fetch the TypeScript changelog." });
console.log(cached.cache?.hits); // → 1 (if previously cached)

// Force a fresh fetch — bypass reads and writes for this run only
const fresh = await agent.run({
  prompt: "Fetch the TypeScript changelog.",
  cache: { bypass: true },
});
console.log(fresh.cache?.bypassed); // → true
```

### Run With Structured Output

```ts
import { Agent, Provider } from "agentcraft";
import { z } from "zod";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// Define the expected shape as a Zod schema
const SentimentSchema = z.object({
  sentiment: z.enum(["positive", "neutral", "negative"]),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
});

const response = await agent.run({
  prompt:
    "Analyze the sentiment of: 'AgentCraft makes AI agents delightful to build.'",
  responseSchema: SentimentSchema,
  structuredOutput: {
    retries: 2, // retry parsing up to 2 times if validation fails
  },
});

// structuredResponse is typed as the Zod inferred type
const result = response.structuredResponse as z.infer<typeof SentimentSchema>;
console.log(result.sentiment); // → "positive"
console.log(result.confidence); // → 0.95
console.log(result.summary); // → "..."
```

### Run With Files (Document Input)

```ts
import { Agent, Provider } from "agentcraft";
import { readFileSync } from "fs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const pdfBytes = readFileSync("./report.pdf");

const response = await agent.run({
  prompt: "Summarize the key findings from this PDF report.",
  files: [
    {
      type: "base64", // how the data is encoded
      filename: "report.pdf", // original filename
      mediaType: "application/pdf", // MIME type
      data: pdfBytes.toString("base64"), // base64-encoded bytes
    },
  ],
});

console.log(response.content);
```

### Run With Images (Vision)

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o"], // must support vision
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Describe what you see in this screenshot.",
  images: [
    {
      type: "url",
      data: "https://example.com/screenshot.png",
      // mediaType is optional for URL images
    },
  ],
});

console.log(response.content);

// Check that the model actually supports vision before sending
if (!Agent.supports(Provider.openai["gpt-4o"], "vision")) {
  throw new Error("Model does not support vision inputs");
}
```

### Run-Scoped Adapter Attachment

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

// Attach Tavily only for this run — it is cleaned up automatically after
const response = await agent.run({
  prompt: "Find the latest AgentCraft release.",
  use: search,
});

console.log(response.content);
console.log(response.selection?.exposedTools); // → ["tavily_search", ...]
```

### Replay (Offline Testing)

```ts
import { Agent, Provider } from "agentcraft";
import type { AgentResponse } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// A pre-recorded response — no LLM call is made
const recorded: AgentResponse = {
  content: "TypeScript is a typed superset of JavaScript.",
  tokensUsed: { prompt: 10, completion: 20, total: 30 },
  cost: 0.0001,
  finishReason: "stop",
  model: "gpt-4o-mini",
  provider: "openai",
};

const response = await agent.run({
  prompt: "What is TypeScript?",
  replay: recorded, // returned as-is, model is never called
});

console.log(response.content); // → "TypeScript is a typed superset of JavaScript."
```

### Reading the Full Response

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  name: "my-agent",
});

const response = await agent.run({
  prompt: "What is agentcraft?",
  trace: true,
});

// Core output
console.log(response.content); // model text
console.log(response.finishReason); // "stop" | "length" | "tool_calls" | ...

// Cost and tokens
console.log(response.cost); // USD
console.log(response.tokensUsed.total); // prompt + completion

// Metadata
console.log(response.model); // "gpt-4o-mini"
console.log(response.provider); // "openai"
console.log(response.runId); // unique ID for this run

// Prompt assembly provenance
console.log(response.promptProvenance?.source); // "inline" | "file"
console.log(response.promptProvenance?.assembled); // true if vars/config were injected

// Skill and tool selection metadata
console.log(response.selection?.activeSkills); // which skills were active
console.log(response.selection?.exposedTools); // which tools were exposed
console.log(response.selection?.executedToolCalls); // how many tool calls were made

// Cache stats (only populated if cache is configured)
console.log(response.cache?.hits); // tool result cache hits
console.log(response.cache?.toolCallsAvoided); // calls skipped due to cache
console.log(response.cache?.estimatedSavedTokens); // estimated token savings

// Trace (only populated if trace: true)
console.log(response.trace);
```

## Related

- [Agents](./agents.md)
- [Streaming](./streaming.md)
- [Structured Output](./structured-output.md)
- [Budgets and Cost](./budgets-cost.md)
- [Prompt Assembly](./prompt-assembly.md)
- [Run Config](../configuration/run-config.md)
