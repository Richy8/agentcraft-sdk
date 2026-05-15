# Prompt Assembly Config

Prompt assembly composes prompts from files, partials, variables, and runtime config values — all resolved before the LLM call.

## Usage

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  promptFile: "./prompts/release-note-bundle/main.prompt",
  vars: {
    product: "AgentCraft",
    audience: "engineering managers",
  },
  assembly: {
    config: {
      brand: { voice: "clear, pragmatic, senior-engineer friendly" },
      release: { channel: "public-beta" },
    },
    strict: true,
    minify: true,
  },
});
console.log(response.content);
```

## Prompt File Syntax

A prompt file is plain text. Any file extension works — `.prompt`, `.txt`, `.md`. It can use three types of placeholders and compose other files:

```handlebars
{{include 00-context.prompt}}
{{include partials/release-rules.prompt}}

Write a concise release note for {{product}}.

Audience: {{audience}}
Brand voice: {{config.brand.voice}}
Release channel: {{config.release.channel}}

Include:
- one headline
- three value bullets
- one migration note
```

- `&#123;&#123;variable&#125;&#125;` — filled from `vars` in `agent.run()`. Arrays become markdown bullet lists.
- `&#123;&#123;config.path.to.value&#125;&#125;` — filled from `assembly.config`. Supports nested paths.
- `&#123;&#123;include relative/path&#125;&#125;` — pulls in another file at that position. Resolved first, before variables and config.

Inline `prompt` strings support variable and config injection but not includes. Use `promptFile` when you need includes.

## Composing Files

A `promptFile` can pull in as many files as needed. Includes can nest up to `maxPartialDepth` levels (default: 10):

```sh
main.prompt          # entry file passed to promptFile
  00-context.prompt
  10-audience.prompt
  partials/
    release-rules.prompt
  20-output.prompt
```

All includes are resolved relative to the entry file's directory and sandboxed there by default.

## Options

| Option                      | Required            | Default          | Purpose                                                               |
| --------------------------- | ------------------- | ---------------- | --------------------------------------------------------------------- |
| `promptFile`                | One source required | None             | Entry prompt file. Resolves includes, then injects config and vars.   |
| `prompt`                    | One source required | None             | Inline text. Supports variable and config injection, not includes.    |
| `vars`                      | No                  | `{}`             | Variable values injected into the prompt. Arrays become bullet lists. |
| `assembly.config`           | No                  | `{}`             | App/runtime config values for `config.path` placeholder injection.    |
| `assembly.strict`           | No                  | `false`          | Throws when a variable placeholder is unresolved.                     |
| `assembly.minify`           | No                  | `true`           | Trims prompt whitespace before the provider call.                     |
| `assembly.maxPartialDepth`  | No                  | `10`             | Maximum include nesting depth.                                        |
| `assembly.rootDir`          | No                  | Entry file's dir | File boundary for include resolution.                                 |
| `assembly.allowOutsideRoot` | No                  | `false`          | Allows includes outside `rootDir`. Keep false for untrusted sources.  |

More variants: [Prompt Assembly](../core/prompt-assembly.md) and [prompt assembly guide](../guides/config/prompt-assembly.md).
