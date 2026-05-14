# Guardrails

Guardrails inspect tool inputs or outputs and decide whether execution should continue.

## Built-In Guardrails

| Guardrail                         | Purpose                                                  | Common use             |
| --------------------------------- | -------------------------------------------------------- | ---------------------- |
| `blockPromptInjectionGuardrail`   | Blocks tool content that tries to override instructions. | Web/fetch/MCP content. |
| `blockSecretsGuardrail`           | Blocks secret-like values.                               | Logs, external sends.  |
| `blockPiiGuardrail`               | Blocks likely personal data.                             | Customer workflows.    |
| `blockUnsafeUrlGuardrail`         | Blocks unsafe URLs.                                      | Browser/fetch tools.   |
| `blockDestructiveActionGuardrail` | Blocks destructive operations.                           | Admin tools.           |

## Usage

```ts
import { Agent, blockPromptInjectionGuardrail, Provider } from "agentcraft";
import { FetchAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(FetchAdapter.connect({ allowedDomains: ["developer.mozilla.org"] }));

const response = await agent.run({
  prompt: "Read this page and summarize it.",
  toolPolicy: {
    outputGuardrails: [blockPromptInjectionGuardrail],
    guardrailMode: "enforce",
  },
});

console.log(response.content);
```

## Configuration

| Field              | Required | Default   | Purpose                        |
| ------------------ | -------- | --------- | ------------------------------ |
| `inputGuardrails`  | No       | `[]`      | Check args before execution.   |
| `outputGuardrails` | No       | `[]`      | Check result after execution.  |
| `guardrailMode`    | No       | `enforce` | Block or warn.                 |
| `onAuditEvent`     | No       | No-op     | Records blocked/warned events. |

## More Examples

- [Guardrails and approvals](../examples.md#guardrails-and-approvals)
- [Security Model](../production/security-model.md)
