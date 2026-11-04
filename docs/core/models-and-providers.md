# Models & Providers

AgentCraft routes across 15+ LLM providers through a single portable API. Switch providers by changing one string — everything else stays the same.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

// OpenAI — the most common starting point
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Explain LLM provider portability in two sentences.",
});
console.log(response.content);
// → "Provider portability means your application code..."
console.log(response.provider); // → "openai"
console.log(response.model);    // → "gpt-4o-mini"
```

## Provider Catalog

The `Provider` object gives you a typed, autocomplete-friendly catalog of every known model string. Use it instead of raw strings to get compile-time safety.

```ts
// All model strings are typed — typos are caught at compile time
Provider.openai["gpt-4o"]
Provider.anthropic["claude-sonnet-4-6"]
Provider.gemini["gemini-2.5-pro"]
Provider.groq["llama-3.3-70b-versatile"]
Provider.ollama["llama3.2"]
```

## Configuration

| Field | Required | Default | Purpose |
| --- | --- | --- | --- |
| `model` | Yes | — | Provider-prefixed model ID or `Provider` catalog value |
| `apiKey` | Cloud providers | Env var | API key for authentication |
| `baseUrl` | Local / custom | Provider default | Base URL for local or OpenAI-compatible servers |
| `timeout` | No | `120000` ms | Per-request timeout |

Provider-specific fields (Azure, Bedrock, Vertex) are covered in the [Provider Config](../configuration/provider-config.md) reference.

## Provider Patterns

### OpenAI

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

// GPT-4o for highest quality
const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  temperature: 0.2,
});

// GPT-4o-mini for cost efficiency
const mini = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// o3 for advanced reasoning
const reasoning = Agent.create({
  model: Provider.openai["o3"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({ prompt: "Write a TypeScript type utility." });
console.log(response.content);
```

**Available OpenAI models:**

- `gpt-5.5`, `gpt-5.4`, `gpt-5.4-mini`
- `gpt-4o`, `gpt-4o-mini`
- `o1`, `o3`, `o4-mini`
- `o3-deep-research`, `o4-mini-deep-research`

### Anthropic

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

// Claude Sonnet for balanced quality/cost
const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Claude Haiku for fastest responses
const fast = Agent.create({
  model: Provider.anthropic["claude-haiku-4-5"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Claude Opus for maximum capability
const powerful = Agent.create({
  model: Provider.anthropic["claude-opus-4-7"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const response = await agent.run({
  prompt: "Review this API design for consistency.",
});
console.log(response.content);
```

**Available Anthropic models:**

- `claude-opus-4-7`, `claude-opus-4-6`
- `claude-sonnet-4-6`, `claude-sonnet-4-5`
- `claude-haiku-4-5`

### Google Gemini

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.gemini["gemini-2.5-pro"],
  apiKey: process.env.GOOGLE_API_KEY!,
});

const response = await agent.run({
  prompt: "Analyze this dataset and identify the top three trends.",
});
console.log(response.content);
```

**Available Gemini models:**

- `gemini-3.1-pro-preview`, `gemini-3-flash-preview`, `gemini-3.1-flash-lite-preview`
- `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite`

### Groq (Ultra-fast inference)

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

// Groq provides extremely fast inference for open-weight models
const agent = Agent.create({
  model: Provider.groq["llama-3.3-70b-versatile"],
  apiKey: process.env.GROQ_API_KEY!,
});

const response = await agent.run({
  prompt: "Classify this support ticket as urgent, normal, or low priority.",
  maxTokens: 200,
});
console.log(response.content); // response arrives in ~500ms
```

**Available Groq models:**

- `llama-4-scout-17b`, `qwen3-32b`
- `gpt-oss-20b`, `gpt-oss-120b`
- `llama-3.3-70b-versatile`, `llama-3.1-8b-instant`

### DeepSeek

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.deepseek["deepseek-v4"],
  apiKey: process.env.DEEPSEEK_API_KEY!,
});

// DeepSeek R1 for chain-of-thought reasoning
const r1 = Agent.create({
  model: Provider.deepseek["deepseek-r1"],
  apiKey: process.env.DEEPSEEK_API_KEY!,
});
```

### xAI (Grok)

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.xai["grok-4"],
  apiKey: process.env.XAI_API_KEY!,
});
```

### Mistral

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.mistral["mistral-large-latest"],
  apiKey: process.env.MISTRAL_API_KEY!,
});

// Codestral for code-focused tasks
const coder = Agent.create({
  model: Provider.mistral["codestral-latest"],
  apiKey: process.env.MISTRAL_API_KEY!,
});
```

### Cohere

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.cohere["command-r-plus-08-2024"],
  apiKey: process.env.COHERE_API_KEY!,
});
```

### AWS Bedrock

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.bedrock["anthropic.claude-3-7-sonnet"],
  // AWS credentials — set via env or pass explicitly
  accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  region: "us-east-1",
});

const response = await agent.run({
  prompt: "Summarize this enterprise report.",
});
console.log(response.content);
```

### Google Vertex AI

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.vertexai["gemini-2.5-pro"],
  apiKey: process.env.GOOGLE_API_KEY!,
  project: process.env.GOOGLE_PROJECT_ID!,
  location: "us-central1",
});
```

### Azure OpenAI

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.azure.deployment,
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT!,  // "https://your-resource.openai.azure.com"
  deployment: "gpt-4o-prod",                     // your Azure deployment name
  apiVersion: "2024-02-01",
});

const response = await agent.run({
  prompt: "Draft a compliance summary.",
});
```

### Local Providers

Run models locally with no API keys, no cost, and full privacy.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

// Ollama — start with: ollama run llama3.2
const ollama = Agent.create({
  model: Provider.ollama["llama3.2"],
  baseUrl: "http://localhost:11434/v1",
});

// LM Studio — start with: lms server start
const lmStudio = Agent.create({
  model: Provider.lmstudio.default,
  baseUrl: "http://localhost:1234/v1",
});

// vLLM — for GPU-accelerated serving
const vllm = Agent.create({
  model: Provider.vllm.default,
  baseUrl: "http://localhost:8000/v1",
});

// LocalAI — OpenAI-compatible local inference
const localai = Agent.create({
  model: Provider.localai.default,
  baseUrl: "http://localhost:8080/v1",
});

const response = await ollama.run({
  prompt: "What is the capital of France?",
});
console.log(response.content); // → "Paris"
```

**Available Ollama models:** `llama3.2`, `deepseek-r1`, `mistral`, `phi4`

### OpenAI-Compatible Cloud Providers

Any API that matches the OpenAI Chat Completions format works:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

// Together AI
const together = Agent.create({
  model: Provider.together["meta-llama/Llama-3.3-70B-Instruct-Turbo"],
  apiKey: process.env.TOGETHER_API_KEY!,
});

// Fireworks AI
const fireworks = Agent.create({
  model: Provider.fireworks["llama-v3p1-70b-instruct"],
  apiKey: process.env.FIREWORKS_API_KEY!,
});

// OpenRouter (access any model through one API)
const openrouter = Agent.create({
  model: Provider.openrouter["anthropic/claude-sonnet-4.5"],
  apiKey: process.env.OPENROUTER_API_KEY!,
});

// Custom OpenAI-compatible endpoint
const custom = Agent.create({
  model: "openai-compatible:my-fine-tuned-model",
  apiKey: process.env.CUSTOM_API_KEY!,
  baseUrl: "https://your-inference-endpoint.com/v1",
});
```

## Inspecting Models

### `Agent.inspect(model)` — Capabilities and Pricing

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const info = Agent.inspect(Provider.openai["gpt-4o"]);

// Capabilities
console.log(info.capabilities.vision);     // → true
console.log(info.capabilities.streaming);  // → true
console.log(info.capabilities.tools);      // → true
console.log(info.capabilities.jsonMode);   // → true

// Pricing (per 1M tokens)
console.log(`Input: $${info.pricing.inputPerM}`);
console.log(`Output: $${info.pricing.outputPerM}`);

// Quality and speed scores (1–10)
console.log(`Quality: ${info.scores.quality}`);
console.log(`Speed: ${info.scores.speed}`);

// What this model is optimized for
console.log(info.optimizedFor); // → ["quality"]
```

### `Agent.supports(model, capability)` — Quick Capability Check

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

// Check before attaching vision-dependent adapters
if (Agent.supports(Provider.openai["gpt-4o-mini"], "vision")) {
  console.log("Can accept image inputs.");
}

// Check tool support before attaching adapters
if (!Agent.supports(Provider.ollama["llama3.2"], "tools")) {
  console.log("This model cannot call tools — adapters will be skipped.");
}

// Check streaming support before using agent.stream()
if (Agent.supports(Provider.anthropic["claude-haiku-4-5"], "streaming")) {
  const stream = agent.stream({ prompt: "..." });
}
```

### `Agent.catalog(filter?)` — Browse All Models

```ts
import { Agent } from "@deskcreate/agentcraft";

// All non-deprecated models
const all = Agent.catalog();
console.log(`${all.length} models available`);

// Filter to vision-capable OpenAI models only
const visionModels = Agent.catalog({ provider: "openai", vision: true });
visionModels.forEach((m) => console.log(`${m.model} — $${m.pricing.inputPerM}/M input`));

// High-quality streaming models, sorted by quality score
const highQuality = Agent.catalog({ minQuality: 8, streaming: true });
highQuality.forEach((m) => console.log(`${m.provider}/${m.model} — quality: ${m.scores.quality}`));

// Local-only models (no API key required)
const local = Agent.catalog({ provider: "ollama" });
console.log("Local models:", local.map((m) => m.model));
```

## Switching Providers at Runtime

Because the interface is identical across providers, switching is a one-line change:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

// Swap model string to switch provider — no other change needed
const providers = [
  { model: Provider.openai["gpt-4o-mini"],          apiKey: process.env.OPENAI_API_KEY! },
  { model: Provider.anthropic["claude-haiku-4-5"],  apiKey: process.env.ANTHROPIC_API_KEY! },
  { model: Provider.groq["llama-3.1-8b-instant"],   apiKey: process.env.GROQ_API_KEY! },
];

for (const config of providers) {
  const agent = Agent.create(config);
  const response = await agent.run({ prompt: "What is 2 + 2?" });
  console.log(`${response.provider}/${response.model}: ${response.content}`);
}
```

## Environment Variable Reference

| Provider | Variable | Notes |
| --- | --- | --- |
| OpenAI | `OPENAI_API_KEY` | Required for all OpenAI models |
| Anthropic | `ANTHROPIC_API_KEY` | Required for all Claude models |
| Google Gemini | `GOOGLE_API_KEY` | `GEMINI_API_KEY` is also accepted by some integrations |
| Groq | `GROQ_API_KEY` | |
| DeepSeek | `DEEPSEEK_API_KEY` | |
| xAI | `XAI_API_KEY` | |
| Mistral | `MISTRAL_API_KEY` | |
| Cohere | `COHERE_API_KEY` | |
| Together | `TOGETHER_API_KEY` | |
| Fireworks | `FIREWORKS_API_KEY` | |
| OpenRouter | `OPENROUTER_API_KEY` | |
| AWS Bedrock | `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` | Plus `region` in config |
| Azure OpenAI | `AZURE_OPENAI_API_KEY` | Plus `endpoint` + `deployment` in config |
| Google Vertex | `GOOGLE_API_KEY` | Plus `project` + `location` in config |
| Ollama / LM Studio / vLLM | No key needed | Set `baseUrl` to local server |

## Related

- [Agent Config](../configuration/agent-config.md)
- [Provider Config](../configuration/provider-config.md)
- [Providers Cookbook](../examples-cookbook/provider.md)
- [Budgets & Cost](./budgets-cost.md)
