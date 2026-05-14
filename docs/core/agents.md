# Agents

An `Agent` is the main runtime object. It owns provider config, model defaults, attached skills/adapters/MCPs, tool policy, cache, tracing, and retry behavior.

## Quick Start

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  temperature: 0.2,
  maxTokens: 800,
});

const response = await agent.run({
  prompt: "Explain tool guardrails in one paragraph.",
});

console.log(response.content);
```

## Configuration

| Field                      | Required          | Default                                         | Purpose                                                 |
| -------------------------- | ----------------- | ----------------------------------------------- | ------------------------------------------------------- |
| `model`                    | Yes               | None                                            | Provider-prefixed model id or `Provider` catalog value. |
| `apiKey`                   | Provider-specific | Env/provider behavior                           | Authenticates cloud providers.                          |
| `baseUrl`                  | Provider-specific | Provider default                                | Used by local/OpenAI-compatible providers.              |
| `temperature`, `maxTokens` | No                | Model defaults                                  | Generation behavior.                                    |
| `toolPolicy`               | No                | Permissive for reads, guarded for confirmations | Tool approval, redaction, timeouts.                     |
| `cache`                    | No                | Disabled                                        | Safe read-tool caching.                                 |
| `skillActivation`          | No                | `always`                                        | Skill activation mode.                                  |
| `toolSelection`            | No                | `all`                                           | Tool exposure mode.                                     |

## Patterns

### Local Agent

```ts
import { Agent, Provider } from "agentcraft";

const local = Agent.create({
  model: Provider.ollama["llama3.2"],
  baseUrl: "http://localhost:11434/v1",
});
```

### Safer Tool Agent

```ts
import { Agent, Provider } from "agentcraft";

const safer = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    readOnly: true,
    maxResultBytes: 100_000,
    redactSecrets: true,
  },
});
```

### Creator Agent

```ts
import { Agent, Provider } from "agentcraft";

const creator = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
  toolSelection: "auto",
});
```

## Related

- [Agent.create Config](../configuration/agent-config.md)
- [Running Agents](./running-agents.md)
- [Tool Policy](../tools/tool-policy.md)
- [AgentCache](../persistence/agent-cache.md)
