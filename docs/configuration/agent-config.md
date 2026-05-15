# Agent Config

`Agent.create(config)` accepts `AgentCreateConfig`. Only `model` is required. All other fields are optional with sensible defaults.

## Full Config Reference

### Core

| Field             | Required          | Default                  | Purpose                                              |
| ----------------- | ----------------- | ------------------------ | ---------------------------------------------------- |
| `model`           | Yes               | None                     | Provider-prefixed model string or `Provider` catalog value. |
| `apiKey`          | Provider-specific | Env / provider behavior  | Authenticates cloud providers.                       |
| `name`            | No                | None                     | Agent label surfaced in traces and pool routing.     |
| `system`          | No                | None                     | Default system prompt for every run on this agent.   |

### Generation

| Field              | Default                  | Purpose                                    |
| ------------------ | ------------------------ | ------------------------------------------ |
| `temperature`      | `0.7`                    | Sampling temperature (0–2).                |
| `maxTokens`        | Model max output         | Hard cap on completion tokens.             |
| `topP`             | None                     | Nucleus sampling (0–1).                    |
| `frequencyPenalty` | None                     | Repeated-token penalty (-2–2).             |
| `presencePenalty`  | None                     | Token-presence penalty (-2–2).             |
| `stopSequences`    | None                     | Up to 4 strings that stop generation.      |
| `responseFormat`   | `{ type: "text" }`       | `"text"` or `"json_object"` output format. |
| `timeout`          | `120000` ms              | Per-request timeout in milliseconds.       |

### Tools and Skills

| Field             | Default    | Purpose                                                                                              |
| ----------------- | ---------- | ---------------------------------------------------------------------------------------------------- |
| `tools`           | `[]`       | Static tool definitions available on every run.                                                      |
| `toolPolicy`      | Permissive | Controls approval, read-only mode, guardrails, result truncation, and secret redaction.              |
| `skillActivation` | `"always"` | `"always"` — all skills active. `"auto"` — keyword-activated. `"directive-only"` — `/name` trigger. |
| `toolSelection`   | `"all"`    | `"all"` — all adapters expose tools. `"auto"` — only adapters relevant to active skills.             |

### Retry

| Field   | Default                                                                             | Purpose                    |
| ------- | ----------------------------------------------------------------------------------- | -------------------------- |
| `retry` | `{ maxAttempts:3, backoff:"exponential", initialDelay:1000, maxDelay:60000 }` | Retry strategy for transient failures. |

Backoff options: `"exponential"` (doubles delay), `"linear"` (adds delay linearly), `"fixed"` (constant delay).

### Provider-Specific

| Field             | Provider          | Purpose                                        |
| ----------------- | ----------------- | ---------------------------------------------- |
| `baseUrl`         | Local / compatible | Override base URL for local or compatible providers. |
| `endpoint`        | Azure             | Azure OpenAI endpoint URL.                     |
| `deployment`      | Azure             | Azure deployment name.                         |
| `apiVersion`      | Azure             | Azure API version string.                      |
| `organizationId`  | OpenAI            | OpenAI organization ID.                        |
| `region`          | Bedrock / Vertex  | AWS/GCP region.                                |
| `accessKeyId`     | Bedrock           | AWS access key.                                |
| `secretAccessKey` | Bedrock           | AWS secret key.                                |
| `project`         | Vertex            | GCP project ID.                                |
| `location`        | Vertex            | GCP location (e.g. `"us-central1"`).           |

### Cache and Logging

| Field    | Default  | Purpose                                             |
| -------- | -------- | --------------------------------------------------- |
| `cache`  | Disabled | `AgentCacheController` from `AgentCache.file()` etc. |
| `logger` | Console  | Custom logger implementing the `Logger` interface.  |

## Examples

### Minimal — Defaults Only

```ts
import { Agent, Provider } from "agentcraft";

// Only model + apiKey. All generation params use defaults (temp=0.7, 3 retries, etc.)
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({ prompt: "Hello!" });
console.log(response.content);
```

### With Generation Defaults

```ts
import { Agent, Provider } from "agentcraft";

// Pin temperature and token cap for deterministic, concise responses
const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  temperature: 0.2,        // lower = more deterministic
  maxTokens: 1_000,        // cap responses to ~750 words
  topP: 0.9,               // nucleus sampling
  frequencyPenalty: 0.2,   // discourage repetition
});

const response = await agent.run({ prompt: "Summarize the key points." });
console.log(response.content);
```

### With System Prompt

```ts
import { Agent, Provider } from "agentcraft";

// System prompt is prepended to every run — good for role/persona
const agent = Agent.create({
  model: Provider.anthropic["claude-3-5-haiku-20241022"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  name: "support-bot",
  system: [
    "You are a helpful customer support agent for AgentCraft.",
    "Keep responses concise and always offer a next step.",
  ].join("\n"),
  temperature: 0.3,
});

const response = await agent.run({
  prompt: "How do I attach a tool to an agent?",
});
console.log(response.content);
```

### With Tool Policy

```ts
import { Agent, Provider } from "agentcraft";
import { TavilySearchAdapter } from "agentcraft/adapters";

// Read-only policy: tools can only fetch/read, never write
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    readOnly: true,           // blocks tools with write side effects
    maxResultBytes: 100_000,  // truncates large tool results
    redactSecrets: true,      // strips API keys/tokens from results
  },
}).use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

const response = await agent.run({ prompt: "Research the latest TypeScript features." });
console.log(response.content);
```

### With Custom Retry

```ts
import { Agent, Provider } from "agentcraft";

// More retries with faster initial delay — good for high-volume pipelines
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  retry: {
    maxAttempts: 5,
    backoff: "exponential",   // 500ms → 1s → 2s → 4s → 8s (capped at maxDelay)
    initialDelay: 500,
    maxDelay: 10_000,
  },
});

const response = await agent.run({ prompt: "Classify this ticket." });
console.log(response.content);
```

### With File Cache

```ts
import { Agent, AgentCache, Provider } from "agentcraft";

// File-backed cache: safe read-tool results persist across restarts
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache: AgentCache.file(".agentcraft/cache", {
    strategy: "auto",
    namespace: "docs-production",
    version: "v1",
    defaultTtlMs: 60 * 60 * 1000,  // 1 hour
    maxEntryBytes: 250_000,
  }),
});

const response = await agent.run({ prompt: "Fetch the latest changelog." });
console.log(response.cache?.hits);          // cache hits this run
console.log(response.cache?.toolCallsAvoided); // avoided tool calls
```

### With Skill Activation Modes

```ts
import { Agent, Provider } from "agentcraft";
import { SomeSkill } from "./skills/some-skill.js";

// "always": skill is always active (default) — good for single-purpose agents
const always = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "always",
}).use(SomeSkill.create());

// "auto": skill activates when prompt keywords match — good for multi-skill agents
const auto = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
  toolSelection: "auto", // pair with "auto" so only relevant tools are exposed
}).use(SomeSkill.create());

// "directive-only": skill activates only when prompt contains /skill-name
const directive = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "directive-only",
}).use(SomeSkill.create());

const r1 = await always.run({ prompt: "Do the thing." });
const r2 = await auto.run({ prompt: "Do something related to some-skill." });
const r3 = await directive.run({ prompt: "/some-skill do the thing." });
```

### Azure OpenAI Provider

```ts
import { Agent } from "agentcraft";

// Azure requires endpoint, deployment, and apiVersion instead of a base URL
const agent = Agent.create({
  model: "azure:gpt-4o",
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT!,   // e.g. "https://my-resource.openai.azure.com"
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT!, // e.g. "my-gpt4o-deployment"
  apiVersion: "2024-02-01",
});

const response = await agent.run({ prompt: "Hello from Azure." });
console.log(response.content);
```

### Local Ollama

```ts
import { Agent, Provider } from "agentcraft";

// Local model via Ollama — no API key, just point at the local server
const agent = Agent.create({
  model: Provider.ollama["llama3.2"],
  baseUrl: "http://localhost:11434/v1",
});

const response = await agent.run({ prompt: "Explain async/await in TypeScript." });
console.log(response.content);
```

## Related

- [Agents](../core/agents.md)
- [Running Agents](../core/running-agents.md)
- [Cache Config](./cache-config.md)
- [Run Config](./run-config.md)
- [Tool Policy](../tools/tool-policy.md)
- [Models and Providers](../core/models-and-providers.md)
