# Prompt Assembly

Prompt assembly loads reusable prompt files, resolves includes, injects variables, and records provenance.

## Quick Start

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  promptFile: "prompts/release-note.prompt",
  vars: {
    product: "AgentCraft",
    release: "0.2.0",
  },
  assembly: {
    strict: true,
    config: {
      brand: { voice: "clear and practical" },
    },
  },
});

console.log(response.content);
```

## Configuration

| Field             | Required            | Default         | Purpose                              |
| ----------------- | ------------------- | --------------- | ------------------------------------ |
| `prompt`          | One source required | None            | Inline prompt.                       |
| `promptFile`      | One source required | None            | Entry prompt file.                   |
| `vars`            | No                  | `{}`            | User/task variable injection.        |
| `assembly.config` | No                  | `{}`            | App/tenant config injection.         |
| `assembly.strict` | No                  | Runtime default | Fails unresolved includes/variables. |

## Pattern: Prompt Bundle

```txt
main.prompt
  -> 00-context.prompt
  -> 10-audience.prompt
  -> partials/release-rules.prompt
```

Use bundles when prompt content has owners, review history, or reusable partials.

## More Examples

- [Prompt assembly example](../examples.md#prompt-assembly)
- [Prompt Assembly Config](../configuration/prompt-assembly-config.md)
