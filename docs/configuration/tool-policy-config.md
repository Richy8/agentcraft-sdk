# Tool Policy Config

Tool policy defines how tools are approved, retried, redacted, guarded, and size-limited. Use run `budget.maxToolCalls` for the hard per-run tool execution limit.

## Fields

| Option            | Required | Default   | Purpose                                             |
| ----------------- | -------- | --------- | --------------------------------------------------- |
| `approvedTools`   | No       | None      | Allows named confirmation-required tools for a run. |
| `readOnly`        | No       | `false`   | Blocks write/confirmation-required tools.           |
| `maxResultBytes`  | No       | Unlimited | Limits tool result size.                            |
| `inputGuardrails` | No       | None      | Blocks unsafe tool inputs before execution.         |

## Usage

```ts
import { Agent, Provider } from "agentcraft";
import { FileSystemAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    readOnly: true,
    maxResultBytes: 20_000,
  },
}).use(FileSystemAdapter.connect({ rootPath: "./docs", readOnly: true }));

const response = await agent.run({
  prompt: "Inspect these docs and summarize the key API options.",
  budget: { maxToolCalls: 5 },
});
console.log(response.content);
```

## Local Examples

Allow read tools freely but gate writes through tool metadata:

```ts
import { Agent, Provider } from "agentcraft";
import { FetchAdapter, FileSystemAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(FetchAdapter.connect({ allowedDomains: ["docs.example.com"] }))
  .use(FileSystemAdapter.connect({ rootPath: "./content", readOnly: false }));
```

More variants: [Tool Policy](../tools/tool-policy.md), [Guardrails](../tools/guardrails.md), and [Approvals](../tools/approvals.md).
