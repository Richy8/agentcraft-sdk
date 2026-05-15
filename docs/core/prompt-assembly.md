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
    audience: "senior TypeScript engineers",
  },
  assembly: {
    strict: true,
    config: {
      brand: { voice: "clear and practical" },
      release: { channel: "public-beta" },
    },
  },
});

console.log(response.content);
```

## Prompt File Syntax

A prompt file is plain text with any extension. It supports three placeholder types:

```handlebars
Write a concise release note for {{product}}.

Audience: {{audience}}
Brand voice: {{config.brand.voice}}
Release channel: {{config.release.channel}}

Include:
- one headline
- three value bullets
- one migration note
```

- `&#123;&#123;variable&#125;&#125;` — injected from `vars`
- `&#123;&#123;config.path&#125;&#125;` — injected from `assembly.config`
- `&#123;&#123;include relative/path&#125;&#125;` — pulls in another file (file mode only)

## Pattern: Prompt Bundle

An entry file can compose other files using includes:

```handlebars
{{include 00-context.prompt}}
{{include 10-audience.prompt}}
{{include partials/release-rules.prompt}}
{{include 20-output.prompt}}
```

Use bundles when prompt content has owners, review history, or reusable partials.

## Configuration

| Field             | Required            | Default | Purpose                                                                          |
| ----------------- | ------------------- | ------- | -------------------------------------------------------------------------------- |
| `prompt`          | One source required | None    | Inline prompt.                                                                   |
| `promptFile`      | One source required | None    | Entry prompt file.                                                               |
| `vars`            | No                  | `{}`    | User/task variable injection.                                                    |
| `assembly.config` | No                  | `{}`    | App/tenant config injection.                                                     |
| `assembly.strict` | No                  | `false` | Throws when a variable placeholder is unresolved. Missing includes always throw. |

## More Examples

- [Prompt assembly example](../examples.md#prompt-assembly)
- [Prompt Assembly Config](../configuration/prompt-assembly-config.md)
