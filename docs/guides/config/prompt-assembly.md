# Prompt Assembly Config

Prompt assembly lets you compose prompts from inline text or files, inject variables, inject runtime config values, and resolve file includes — all before the LLM call. This is the right place for reusable prompt systems and product-specific prompt templates.

## Prompt Sources

| Field        | Purpose                    | How it changes the result                                                                                                                                                | Use case                                                                                         |
| ------------ | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------ |
| `prompt`     | Inline prompt text         | Fastest path. It can inject `&#123;&#123;variable&#125;&#125;` from `vars` and `&#123;&#123;config.path&#125;&#125;` from `assembly.config`, but it cannot use includes. | [Basic chat](../../examples.md#basic-chat), [Prompt assembly](../../examples.md#prompt-assembly) |
| `promptFile` | Explicit prompt entry file | Loads one file, resolves every `&#123;&#123;include path&#125;&#125;` from that file recursively, then injects config values and variables.                              | [Prompt assembly](../../examples.md#prompt-assembly)                                             |

Use exactly one source per run: `prompt` for simple inline text, or `promptFile` for file-backed or composed prompt systems.

## `promptFile` and Includes

`promptFile` accepts any file path. The file may contain `&#123;&#123;include relative/path&#125;&#125;` directives to pull in other files. Included files can themselves include further files, up to `maxPartialDepth` levels deep (default: 10). All includes are resolved before variables and config are injected.

A single-file prompt with all three placeholder types:

```handlebars
Write a concise release note for
{{product}}. Audience:
{{audience}}
Brand voice:
{{config.brand.voice}}
Release channel:
{{config.release.channel}}

Include: - one headline - three value bullets - one migration note
```

A bundled entry file that composes others with includes:

```handlebars
{{include 00-context.prompt}}
{{include 10-audience.prompt}}
{{include partials/release-rules.prompt}}
{{include 20-output.prompt}}
```

The root boundary for includes defaults to the directory of the entry `promptFile`. Attempts to include files outside that boundary throw before the LLM call, unless `allowOutsideRoot` is set.

Inline `prompt` values cannot use `&#123;&#123;include ...&#125;&#125;`. If an inline prompt contains an include directive, assembly throws immediately.

## Removed: `promptDir`

`promptDir` is no longer supported and throws at runtime. Use `promptFile` pointing at an explicit entry file and compose additional files with `&#123;&#123;include path&#125;&#125;` directives instead.

## Injection Channels

All three injection channels are resolved before the prompt reaches the provider. Processing order is: includes → config → variables → minify.

| Field                                            | Placeholder syntax                                                                                          | Best for                  | Notes                                                                                                                                              |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vars`                                           | `&#123;&#123;product&#125;&#125;`, `&#123;&#123;audience&#125;&#125;`, `&#123;&#123;nested.key&#125;&#125;` | Task/user/request values  | Use for values that change per run: topic, audience, selected documents, user intent. Arrays are formatted as markdown bullet lists.               |
| `assembly.config`                                | `&#123;&#123;config.brand.voice&#125;&#125;`, `&#123;&#123;config.release.channel&#125;&#125;`              | App/runtime configuration | Use for durable app settings: brand voice, release channel, tenant display settings, environment-specific prompt knobs.                            |
| `&#123;&#123;include path&#125;&#125;` directive | `&#123;&#123;include ./partials/rules.prompt&#125;&#125;`                                                   | Prompt composition        | Use only inside `promptFile` templates. Root sandboxing controls where includes can read from, and missing include files fail before the LLM call. |

Missing variables leave the placeholder unresolved by default. Set `strict: true` to throw instead.

## Assembly Options

These fields are passed inside `assembly` in `agent.run()`.

| Field              | Default          | How it changes the result                                                     | Use case                                                   |
| ------------------ | ---------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `config`           | `{}`             | Provides values for `&#123;&#123;config.path&#125;&#125;` placeholders.       | App settings, brand voice, release channel, tenant config. |
| `strict`           | `false`          | Throws when variables are missing instead of leaving placeholders unresolved. | Production templates where missing data should fail fast.  |
| `minify`           | `true`           | Trims prompt whitespace before provider calls.                                | Cost-sensitive or long prompt flows.                       |
| `maxPartialDepth`  | `10`             | Caps nested partial includes.                                                 | Prevent recursive or overly deep prompt composition.       |
| `rootDir`          | Entry file's dir | Sets the file boundary for includes.                                          | Tenant/project sandboxing when the default dir is wrong.   |
| `allowOutsideRoot` | `false`          | Allows includes outside `rootDir`.                                            | Avoid unless the app owns and validates the path boundary. |

## When to Use Each Source

Use `promptFile` when prompt text is versioned, shared, audited, composed across files, or environment-aware.

Use inline `prompt` when the task is short, one-off, and does not need reuse or include composition.
