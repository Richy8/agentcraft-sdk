# Security Model

AgentCraft treats prompts, files, browser pages, MCP servers, adapter responses, and tool inputs as untrusted. Security is enforced through scoped adapters, tool metadata, guardrails, approvals, and testable defaults.

## Layers

| Layer         | Purpose                         | Default posture         | Deep dive                                |
| ------------- | ------------------------------- | ----------------------- | ---------------------------------------- |
| Adapter scope | Limit domains, paths, channels  | Adapter-specific        | [Adapters Safety](../adapters/safety.md) |
| Tool policy   | Cap calls and require approval  | Runtime default         | [Tool Policy](../tools/tool-policy.md)   |
| Guardrails    | Block unsafe inputs             | Opt-in/built-in helpers | [Guardrails](../tools/guardrails.md)     |
| MCP review    | Pin packages and inspect scopes | Review-required         | [MCP Security](../mcp/security.md)       |

## Production Baseline

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  toolPolicy: {
    readOnly: true,
    maxResultBytes: 20_000,
  },
});

const response = await agent.run({
  prompt: "Research this topic using read-only tools.",
  budget: { maxToolCalls: 6 },
});
console.log(response.content);
```

## Checklist

- [ ] Scope every adapter by domain, path, channel, database, or project.
- [ ] Pin every stdio MCP package.
- [ ] Keep write-capable tools approval-bound.
- [ ] Add regression tests for prompt injection, unsafe URL, path traversal, and destructive actions.

More detail: [Security guide](../guides/security-model.md) and [MCP security checklist](../guides/mcp-security-checklist.md).
