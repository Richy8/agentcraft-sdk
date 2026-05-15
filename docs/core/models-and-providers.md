# Models And Providers

AgentCraft uses provider-prefixed model ids so a single runtime can route across OpenAI, Anthropic, Gemini, Cohere, DeepSeek, Groq, local providers, and OpenAI-compatible endpoints.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Describe yourself in one sentence.",
});
console.log(response.content);
```

## Configuration

| Field                     | Required               | Default               | Purpose                       |
| ------------------------- | ---------------------- | --------------------- | ----------------------------- |
| `model`                   | Yes                    | None                  | Provider-prefixed model id.   |
| `apiKey`                  | Cloud providers        | Env/provider behavior | Auth for provider calls.      |
| `baseUrl`                 | Local/custom providers | Provider default      | OpenAI-compatible server URL. |
| `organization`, `project` | Provider-specific      | Undefined             | Provider account scoping.     |
| `costOptions`             | No                     | None                  | Cost estimator modifiers.     |

## Provider Patterns

### OpenAI

```ts
Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY,
});
```

### Local Ollama

```ts
Agent.create({
  model: Provider.ollama["llama3.2"],
  baseUrl: "http://localhost:11434/v1",
});
```

### OpenAI-Compatible Cloud

```ts
Agent.create({
  model: "openai-compatible:my-model",
  apiKey: process.env.CUSTOM_PROVIDER_API_KEY,
  baseUrl: "https://api.example.com/v1",
});
```

## More Examples

- [Provider routing](../examples.md#provider-routing)
- [Model catalog and cost](../examples.md#model-catalog-and-cost)
- [Local/private agent](../examples.md#local-ollama-private)
