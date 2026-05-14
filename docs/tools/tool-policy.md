# ToolPolicy

`ToolPolicy` controls whether tools can execute, how results are bounded, and what gets redacted or audited.

## Quick Start

```ts
import { Agent, Provider } from "agentcraft";
import { FileSystemAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    readOnly: true,
    maxResultBytes: 100_000,
    redactSecrets: true,
  },
}).use(FileSystemAdapter.connect({ rootPath: "./docs", readOnly: true }));

const response = await agent.run({ prompt: "List the markdown files." });
console.log(response.content);
```

## Configuration

| Field                | Required | Default              | Purpose                                          |
| -------------------- | -------- | -------------------- | ------------------------------------------------ |
| `approvedTools`      | No       | `[]`                 | Allows specific confirmation-gated tools.        |
| `allowSideEffects`   | No       | `false`              | Allows confirmation-gated side effects globally. |
| `dryRun`             | No       | `false`              | Returns planned tool call without executing.     |
| `readOnly`           | No       | `false`              | Blocks writes and confirmation-gated tools.      |
| `timeoutMs`          | No       | Tool/runtime default | Bounds execution time.                           |
| `maxResultBytes`     | No       | No policy cap        | Prevents huge tool outputs.                      |
| `redactSecrets`      | No       | `true`               | Redacts likely secrets in results/errors.        |
| `guardrailMode`      | No       | `enforce`            | `enforce` blocks, `warn` records.                |
| `onApprovalRequired` | No       | Deny by default      | Runtime approval callback.                       |

## Approval Pattern

```ts
import { Agent, Provider } from "agentcraft";
import { PublishingAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(PublishingAdapter.connect({ token: process.env.PUBLISH_TOKEN! }));

const response = await agent.run({
  prompt: "Create a draft, but do not publish it.",
  toolPolicy: {
    approvedTools: ["create_publish_draft"],
    onApprovalRequired: async ({ tool }) =>
      tool.name === "create_publish_draft",
  },
});

console.log(response.content);
```

## Related

- [Approvals](./approvals.md)
- [Guardrails](./guardrails.md)
- [Production examples](../examples-cookbook/production.md)
