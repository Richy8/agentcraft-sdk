# Provider Config

Per-provider configuration reference.

## Model String Format

Model strings follow the format `provider:model-id`:

```ts
"openai:gpt-4o"
"anthropic:claude-sonnet-4-6"
"google:gemini-1.5-pro"
"bedrock:us.anthropic.claude-3-5-sonnet-20241022-v2:0"
"cohere:command-r-plus"
```

Or use the `Provider` catalog to avoid typos:

```ts
import { Provider } from "@deskcreate/agentcraft";

Provider.openai["gpt-4o"]
Provider.anthropic["claude-sonnet-4-6"]
Provider.google["gemini-1.5-pro"]
```

## OpenAI

```ts
Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  // Optional:
  // organization: process.env.OPENAI_ORG_ID,
  // baseURL: "https://api.openai.com/v1",  // default
});
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `apiKey` | `string` | Yes | OpenAI API key. Also read from `OPENAI_API_KEY` env var. |
| `organization` | `string` | No | OpenAI organization ID. |
| `baseURL` | `string` | No | Override the API base URL (for proxies or Azure). |

## Anthropic

```ts
Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  // Optional:
  // anthropicVersion: "2023-06-01",
});
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `apiKey` | `string` | Yes | Anthropic API key. Also read from `ANTHROPIC_API_KEY`. |
| `anthropicVersion` | `string` | No | API version header. Defaults to latest stable. |

## Google Gemini

```ts
Agent.create({
  model: Provider.google["gemini-1.5-pro"],
  apiKey: process.env.GEMINI_API_KEY!,
  // Optional:
  // projectId: process.env.GOOGLE_CLOUD_PROJECT,
});
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `apiKey` | `string` | Yes | Google AI Studio API key. Also read from `GEMINI_API_KEY`. |
| `projectId` | `string` | No | Google Cloud project ID (for Vertex AI). |

## AWS Bedrock

```ts
Agent.create({
  model: "bedrock:us.anthropic.claude-3-5-sonnet-20241022-v2:0",
  region: process.env.AWS_REGION ?? "us-east-1",
  // Credentials resolved from environment, ~/.aws/credentials, or IAM role
});
```

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `region` | `string` | Yes | AWS region where Bedrock is available. |
| `credentials` | `AwsCredentials` | No | Explicit credentials object. Defaults to SDK credential chain. |

## Cohere

```ts
Agent.create({
  model: Provider.cohere["command-r-plus"],
  apiKey: process.env.COHERE_API_KEY!,
});
```

## OpenAI-Compatible Endpoints

For Azure OpenAI, Groq, Together AI, Ollama, and other OpenAI-compatible providers:

```ts
// Azure OpenAI
Agent.create({
  model: "openai:gpt-4o",
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  baseURL: `https://${process.env.AZURE_OPENAI_RESOURCE}.openai.azure.com/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}`,
});

// Groq
Agent.create({
  model: "openai:llama-3.3-70b-versatile",
  apiKey: process.env.GROQ_API_KEY!,
  baseURL: "https://api.groq.com/openai/v1",
});

// Together AI
Agent.create({
  model: "openai:meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
  apiKey: process.env.TOGETHER_API_KEY!,
  baseURL: "https://api.together.xyz/v1",
});

// Local Ollama
Agent.create({
  model: "openai:llama3.2",
  apiKey: "ollama", // dummy key required
  baseURL: "http://localhost:11434/v1",
});
```

## Switching Providers at Runtime

```ts
import { ProviderFactory } from "@deskcreate/agentcraft";

const provider = ProviderFactory.create({
  model: process.env.MODEL ?? "openai:gpt-4o-mini",
  apiKey: process.env.API_KEY!,
});

const agent = Agent.create({ provider });
```

## Related

- [Models & Providers](../core/models-and-providers.md)
- [Agent Config](./agent-config.md)
- [`BestFitResolver`](../core/models-and-providers.md#bestfitresolver)
