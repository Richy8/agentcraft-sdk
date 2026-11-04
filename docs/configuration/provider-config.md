# Provider Config

Per-provider configuration reference.

## Model String Format

Model strings follow the format `provider:model-id`:

```ts
"openai:gpt-4o";
"anthropic:claude-sonnet-4-6";
"gemini:gemini-2.5-pro";
"bedrock:anthropic.claude-3-7-sonnet-20250219-v1:0";
"cohere:command-r-plus-08-2024";
```

Or use the `Provider` catalog to avoid typos:

```ts
import { Provider } from "@deskcreate/agentcraft";

Provider.openai["gpt-4o"];
Provider.anthropic["claude-sonnet-4-6"];
Provider.gemini["gemini-2.5-pro"];
```

## OpenAI

```ts
Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  // Optional:
  // organizationId: process.env.OPENAI_ORG_ID,
  // baseUrl: "https://api.openai.com/v1",  // default
});
```

| Field            | Type     | Required | Description                                              |
| ---------------- | -------- | -------- | -------------------------------------------------------- |
| `apiKey`         | `string` | Yes      | OpenAI API key. Also read from `OPENAI_API_KEY` env var. |
| `organizationId` | `string` | No       | OpenAI organization ID.                                  |
| `baseUrl`        | `string` | No       | Override the API base URL for compatible endpoints.      |

## Anthropic

```ts
Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  // Optional:
  // anthropicVersion: "2023-06-01",
});
```

| Field              | Type     | Required | Description                                            |
| ------------------ | -------- | -------- | ------------------------------------------------------ |
| `apiKey`           | `string` | Yes      | Anthropic API key. Also read from `ANTHROPIC_API_KEY`. |
| `anthropicVersion` | `string` | No       | API version header. Defaults to latest stable.         |

## Google Gemini

```ts
Agent.create({
  model: Provider.gemini["gemini-2.5-pro"],
  apiKey: process.env.GOOGLE_API_KEY!,
  // Optional:
  // projectId: process.env.GOOGLE_CLOUD_PROJECT,
});
```

| Field       | Type     | Required | Description                                                                                                                                             |
| ----------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apiKey`    | `string` | Yes      | Google AI Studio API key. `GOOGLE_API_KEY` is used in this repo's live-test setup; `GEMINI_API_KEY` is also accepted by some examples and integrations. |
| `projectId` | `string` | No       | Google Cloud project ID (for Vertex AI).                                                                                                                |

## AWS Bedrock

```ts
Agent.create({
  model: Provider.bedrock["anthropic.claude-3-7-sonnet"],
  region: process.env.AWS_REGION ?? "us-east-1",
  // Credentials resolved from environment, ~/.aws/credentials, or IAM role
});
```

| Field         | Type             | Required | Description                                                    |
| ------------- | ---------------- | -------- | -------------------------------------------------------------- |
| `region`      | `string`         | Yes      | AWS region where Bedrock is available.                         |
| `credentials` | `AwsCredentials` | No       | Explicit credentials object. Defaults to SDK credential chain. |

## Cohere

```ts
Agent.create({
  model: Provider.cohere["command-r-plus-08-2024"],
  apiKey: process.env.COHERE_API_KEY!,
});
```

## OpenAI-Compatible Endpoints

For Azure OpenAI, Groq, Together AI, Ollama, and other OpenAI-compatible providers:

```ts
// Azure OpenAI
Agent.create({
  model: Provider.azure.deployment,
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  endpoint: process.env.AZURE_OPENAI_ENDPOINT!,
  deployment: process.env.AZURE_OPENAI_DEPLOYMENT!,
  apiVersion: "2024-02-01",
});

// Groq
Agent.create({
  model: Provider.groq["llama-3.3-70b-versatile"],
  apiKey: process.env.GROQ_API_KEY!,
});

// Together AI
Agent.create({
  model: Provider.together["meta-llama/Llama-3.3-70B-Instruct-Turbo"],
  apiKey: process.env.TOGETHER_API_KEY!,
});

// Local Ollama
Agent.create({
  model: Provider.ollama["llama3.2"],
  baseUrl: "http://localhost:11434/v1",
});
```

## Switching Providers at Runtime

```ts
import { Agent } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: process.env.MODEL ?? "openai:gpt-4o-mini",
  apiKey: process.env.API_KEY,
});
```

## Related

- [Models & Providers](../core/models-and-providers.md)
- [Agent Config](./agent-config.md)
- [`BestFitResolver`](../core/models-and-providers.md#bestfitresolver)
