# Prompt Assembly Config

Prompt assembly lets you compose prompts from inline text, files, directories, partials, variables, and runtime config values. This is the right place for reusable prompt systems and product-specific prompt templates.

## Prompt Sources

| Field        | Purpose                    | How it changes the result                                                                                                                                                | Use case                                                                                         |
| ------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `prompt`     | Inline prompt text         | Fastest path. It can inject `&#123;&#123;variable&#125;&#125;` from `vars` and `&#123;&#123;config.path&#125;&#125;` from `assembly.config`, but it cannot use includes. | [Basic chat](../../examples.md#basic-chat), [Prompt assembly](../../examples.md#prompt-assembly) |
| `promptFile` | Explicit prompt entry file | Loads one entry file, resolves every `&#123;&#123;include path&#125;&#125;` from that file, then injects config values and variables.                                    | [Prompt assembly](../../examples.md#prompt-assembly)                                             |

Use exactly one active source style per run: `prompt` for simple inline text, or `promptFile` for reusable/composed prompt systems.

## Deprecated Directory Source

`promptDir` is rejected at runtime because a directory alone has no explicit entry point or ordering contract. Point `promptFile` at an entry file such as `prompts/release/main.prompt`, then let that file decide composition through `&#123;&#123;include path&#125;&#125;`.

## Injection Channels

| Field                                            | Placeholder syntax                                                                                          | Best for                  | Difference from alternatives                                                                                                                       |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vars`                                           | `&#123;&#123;product&#125;&#125;`, `&#123;&#123;audience&#125;&#125;`, `&#123;&#123;nested.key&#125;&#125;` | Task/user/request values  | Use for values that change per run, such as topic, audience, selected documents, or user intent.                                                   |
| `assembly.config`                                | `&#123;&#123;config.brand.voice&#125;&#125;`, `&#123;&#123;config.release.channel&#125;&#125;`              | App/runtime configuration | Use for durable app settings, brand voice, release channel, policy labels, tenant display settings, or environment-specific prompt knobs.          |
| `&#123;&#123;include path&#125;&#125;` directive | `&#123;&#123;include ./partials/rules.prompt&#125;&#125;`                                                   | Prompt reuse              | Use only inside `promptFile` templates. Root sandboxing controls where includes can read from, and missing include files fail before the LLM call. |

## Assembly Options

| Field              | Default          | How it changes the result                                                     | Use case                                                   |
| ------------------ | ---------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `strict`           | `false`          | Throws when variables are missing instead of leaving placeholders unresolved. | Production templates where missing data should fail fast.  |
| `minify`           | `true`           | Trims prompt whitespace before provider calls.                                | Cost-sensitive or long prompt flows.                       |
| `maxPartialDepth`  | `10`             | Caps nested partial includes.                                                 | Prevent recursive or overly deep prompt composition.       |
| `rootDir`          | Source directory | Sets the file boundary for includes.                                          | Tenant/project sandboxing.                                 |
| `allowOutsideRoot` | `false`          | Allows includes outside `rootDir`.                                            | Avoid unless the app owns and validates the path boundary. |
| `loader`           | `FileLoader`     | Replaces file loading with a custom loader.                                   | Database-backed, virtual, remote, or test prompt sources.  |

## Benefits

Use prompt assembly when prompt text is versioned, shared, audited, or environment-aware. Use inline `prompt` when the task is short and does not need reuse.
