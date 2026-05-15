# Agents

An `Agent` is the main runtime object. It owns provider config, model defaults, attached adapters/skills/MCPs, tool policy, cache, retry behavior, and tracing. You create one with `Agent.create()` and call `agent.run()` or `agent.stream()` to execute prompts.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

// Minimal agent — only model and API key are required
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Explain tool guardrails in one paragraph.",
});

console.log(response.content);
// → "Tool guardrails are policies that..."
```

## Configuration

All fields passed to `Agent.create()` belong to `AgentCreateConfig`. Only `model` is required.

### Core Fields

| Field              | Required          | Default                 | Purpose                                                        |
| ------------------ | ----------------- | ----------------------- | -------------------------------------------------------------- |
| `model`            | Yes               | None                    | Provider-prefixed model ID or `Provider` catalog value.        |
| `apiKey`           | Provider-specific | Env / provider behavior | Authenticates cloud providers (OpenAI, Anthropic, Google, ...) |
| `name`             | No                | None                    | Optional label for the agent, surfaced in traces.              |
| `system`           | No                | None                    | Default system prompt prepended to every run.                  |
| `temperature`      | No                | `0.7`                   | Sampling temperature (0–2).                                    |
| `maxTokens`        | No                | Model max output        | Hard cap on completion tokens.                                 |
| `topP`             | No                | None                    | Nucleus sampling probability (0–1).                            |
| `frequencyPenalty` | No                | None                    | Penalizes repeated tokens (-2–2).                              |
| `presencePenalty`  | No                | None                    | Penalizes token presence (-2–2).                               |
| `stopSequences`    | No                | None                    | Up to 4 strings where generation stops.                        |
| `responseFormat`   | No                | `{ type: "text" }`      | `"text"` or `"json_object"` mode.                              |
| `timeout`          | No                | `120000` (ms)           | Request timeout in milliseconds.                               |

### Tool and Skill Fields

| Field             | Required | Default    | Purpose                                                                                                                                    |
| ----------------- | -------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `tools`           | No       | `[]`       | Static tool definitions attached to every run.                                                                                             |
| `toolPolicy`      | No       | Permissive | Controls approval, read-only mode, guardrails, redaction, and result size limits.                                                          |
| `skillActivation` | No       | `"always"` | `"always"` — all attached skills run. `"auto"` — activated by prompt keywords. `"directive-only"` — activated by `/skill-name` directives. |
| `toolSelection`   | No       | `"all"`    | `"all"` — all attached adapters expose tools. `"auto"` — only adapters relevant to active skills.                                          |

### Retry Fields

| Field   | Required | Default                                                                       | Purpose                                |
| ------- | -------- | ----------------------------------------------------------------------------- | -------------------------------------- |
| `retry` | No       | `{ maxAttempts:3, backoff:"exponential", initialDelay:1000, maxDelay:60000 }` | Retry strategy for transient failures. |

### Provider-specific Fields

| Field             | Required           | Purpose                                            |
| ----------------- | ------------------ | -------------------------------------------------- |
| `baseUrl`         | Local / compatible | Base URL for local or OpenAI-compatible providers. |
| `endpoint`        | Azure              | Azure OpenAI endpoint URL.                         |
| `deployment`      | Azure              | Azure deployment name.                             |
| `apiVersion`      | Azure              | Azure API version string.                          |
| `organizationId`  | OpenAI             | OpenAI organization ID.                            |
| `region`          | Bedrock / Vertex   | AWS/GCP region.                                    |
| `accessKeyId`     | Bedrock            | AWS access key.                                    |
| `secretAccessKey` | Bedrock            | AWS secret key.                                    |
| `project`         | Vertex             | GCP project ID.                                    |
| `location`        | Vertex             | GCP location (e.g. `"us-central1"`).               |

### Cache and Logger

| Field    | Required | Default  | Purpose                                              |
| -------- | -------- | -------- | ---------------------------------------------------- |
| `cache`  | No       | Disabled | `AgentCacheController` from `AgentCache.file()` etc. |
| `logger` | No       | Console  | Custom logger implementing the `Logger` interface.   |

## Patterns

### Minimal Agent

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

// Simplest setup — uses all defaults (temperature 0.7, 3 retries, etc.)
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({ prompt: "What is 2 + 2?" });
console.log(response.content); // → "4"
```

### Agent With System Prompt and Low Temperature

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

// Deterministic coding agent — low temp + enforced system prompt on every run
const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  name: "code-reviewer",
  system: "You are a senior TypeScript engineer. Be concise and precise.",
  temperature: 0.1,
  maxTokens: 2_000,
});

const response = await agent.run({
  prompt: "Review this function and flag any type safety issues.",
});
console.log(response.content);
```

### Local / OpenAI-Compatible Agent

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

// Ollama running locally — no API key needed, just baseUrl
const agent = Agent.create({
  model: Provider.ollama["llama3.2"],
  baseUrl: "http://localhost:11434/v1",
});

const response = await agent.run({ prompt: "Summarize in two sentences." });
console.log(response.content);
```

### Agent With Tool Policy (Read-Only)

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

// Guardrails: tools can only read, results capped, secrets redacted
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    readOnly: true, // blocks any write side-effect tools
    maxResultBytes: 100_000, // truncates large tool results
    redactSecrets: true, // strips tokens/keys from tool output
  },
});

const response = await agent.run({
  prompt: "Search for recent TypeScript release notes.",
});
console.log(response.content);
```

### Agent With File Cache

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";

// Cache safe read-tool results to disk — avoids repeated fetches
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache: AgentCache.file(".agentcraft/cache", {
    strategy: "auto",
    defaultTtlMs: 5 * 60 * 1000, // 5 minutes
  }),
});

const response = await agent.run({
  prompt: "Fetch and summarize the TypeScript 5.5 release notes.",
});
console.log(response.cache?.hits, response.cache?.toolCallsAvoided);
```

### Agent With Custom Retry

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

// More aggressive retry for flaky external tools
const agent = Agent.create({
  model: Provider.anthropic["claude-3-5-haiku-20241022"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  retry: {
    maxAttempts: 5,
    backoff: "exponential",
    initialDelay: 500,
    maxDelay: 30_000,
  },
});

const response = await agent.run({ prompt: "Classify this support ticket." });
console.log(response.content);
```

### Skill Activation Modes

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { SomeSkill } from "./skills/some-skill.js";

// "always" — skills are always active regardless of prompt content (default)
const always = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "always",
}).use(SomeSkill.create());

// "auto" — skills activate only when the prompt mentions relevant keywords
const auto = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
  toolSelection: "auto", // pair with auto so only relevant tools are exposed
}).use(SomeSkill.create());

// "directive-only" — skills activate only when the prompt contains /skill-name
const directive = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "directive-only",
}).use(SomeSkill.create());
```

## Attaching Adapters and Skills

Use `.use()` to attach adapters, skills, or creator packs to an agent. Adapters must be attached before the first `run()`.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";
import { SomeSkill } from "./skills/some-skill.js";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }))
  .use(SomeSkill.create());

// Now agent.run() can invoke Tavily search and SomeSkill tools
const response = await agent.run({
  prompt: "Research and summarize AgentCraft.",
});
console.log(response.content);
```

## Cloning an Agent

`agent.cloneWithSystem()` produces a new agent with a different system prompt and optional name. All adapters, cache, and config are inherited.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const base = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// Create two specialized clones from the same base — no double-provisioning
const concise = base.cloneWithSystem(
  "Respond in one sentence.",
  "concise-agent",
);
const verbose = base.cloneWithSystem(
  "Respond with detailed explanations.",
  "verbose-agent",
);

const [short, long] = await Promise.all([
  concise.run({ prompt: "What is TypeScript?" }),
  verbose.run({ prompt: "What is TypeScript?" }),
]);

console.log(short.content);
console.log(long.content);
```

## Static Methods

### `Agent.inspect(model)`

Returns capabilities and pricing for a model string without creating an agent.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const info = Agent.inspect(Provider.openai["gpt-4o"]);

console.log(info.capabilities.vision); // → true
console.log(info.capabilities.streaming); // → true
console.log(info.pricing.inputPerM); // → cost per 1M input tokens
console.log(info.scores.quality); // → 0–100 quality score
console.log(info.optimizedFor); // → ["reasoning", "coding", ...]
```

### `Agent.supports(model, capability)`

Quick boolean check for a single capability.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

// Check before attaching vision-dependent adapters
if (Agent.supports(Provider.openai["gpt-4o-mini"], "vision")) {
  console.log("Vision supported — can pass images.");
}

if (!Agent.supports(Provider.ollama["llama3.2"], "tools")) {
  console.log("No tool support — adapter will be skipped.");
}
```

### `Agent.catalog(filter?)`

Returns all non-deprecated models in the registry. Accepts an optional filter.

```ts
import { Agent } from "@deskcreate/agentcraft";

// All available models
const all = Agent.catalog();
console.log(all.map((m) => `${m.provider}/${m.model}`));

// Only vision-capable models from OpenAI
const visionModels = Agent.catalog({ provider: "openai", vision: true });
console.log(visionModels.map((m) => m.model));

// High-quality models (quality score ≥ 80) with streaming support
const highQuality = Agent.catalog({ minQuality: 80, streaming: true });
console.log(highQuality.map((m) => `${m.model} — quality:${m.scores.quality}`));
```

### `Agent.estimateCost(model, params)` / `agent.estimateCost(params)`

Estimates cost before running. Useful for budget enforcement or user-facing cost previews.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

// Static: estimate for a model you haven't instantiated yet
const estimate = Agent.estimateCost(Provider.openai["gpt-4o"], {
  prompt: "Write a blog post about TypeScript generics.",
  maxTokens: 1_000,
});
console.log(`Estimated cost: $${estimate.estimatedCost.toFixed(4)}`);
console.log(`Input tokens: ~${estimate.tokens.prompt}`);
console.log(`Output tokens: ~${estimate.tokens.completion}`);

// Instance method: same but uses the agent's already-configured model
const agent = Agent.create({
  model: Provider.anthropic["claude-3-5-haiku-20241022"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});
const instanceEstimate = agent.estimateCost({
  prompt: "Classify this ticket.",
});
console.log(`Estimated cost: $${instanceEstimate.estimatedCost.toFixed(4)}`);
```

## Cleanup

Call `agent.dispose()` when an agent with MCP or stateful adapters is no longer needed. It runs adapter cleanup in reverse attachment order.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

try {
  const response = await agent.run({ prompt: "One-off task." });
  console.log(response.content);
} finally {
  // Closes MCP connections, flushes adapters — safe to call multiple times
  await agent.dispose();
}
```

## Related

- [Running Agents](./running-agents.md)
- [Streaming](./streaming.md)
- [Agent Config](../configuration/agent-config.md)
- [Tool Policy](../tools/tool-policy.md)
- [AgentCache](../persistence/agent-cache.md)
- [Models and Providers](./models-and-providers.md)
