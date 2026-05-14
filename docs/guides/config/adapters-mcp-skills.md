# Adapters, MCP, And Skills Config

Adapters expose tools. MCP connects external tool servers. Skills package prompt behavior and capability metadata.

Use the full built-in references when you need complete catalog coverage:

- [Built-In Adapters](../../reference/built-in-adapters.md)
- [Built-In MCP Wrappers](../../reference/built-in-mcps.md)
- [Built-In Skills](../../reference/built-in-skills.md)
- [Creator Packs](../../creator/packs.md)

## Adapter Metadata

| Field         | Values                                                           | Purpose                                         | Use case                                                           |
| ------------- | ---------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------ |
| `kind`        | `placeholder`, `mcp-backed`, `native-sdk`, `custom`              | Communicates implementation path and maturity.  | [Custom adapter](../../examples.md#custom-adapter)                 |
| `auth`        | `none`, `api-key`, `oauth`, `aws`, `connection-string`, `custom` | Documents credential handling.                  | [GitHub review agent](../../examples.md#github-review-agent)       |
| `trustLevel`  | `trusted`, `review-required`, `untrusted`                        | Sets review expectations before production use. | [Custom MCP connection](../../examples.md#custom-mcp-connection)   |
| `sideEffects` | `none`, `read`, `write`, `external`                              | Declares maximum adapter behavior.              | [Filesystem safe agent](../../examples.md#filesystem-safe-agent)   |
| `scopes`      | Strings                                                          | Labels permission domains.                      | [Adapter skill workflow](../../examples.md#adapter-skill-workflow) |
| `readOnly`    | Boolean                                                          | Signals non-mutating adapters.                  | [Database readonly](../../examples.md#database-readonly)           |

## MCP Config

| Field                   | Values                          | How it changes behavior                                        |
| ----------------------- | ------------------------------- | -------------------------------------------------------------- |
| `transport`             | `stdio`, `http`, `sse`          | Chooses process, HTTP JSON-RPC, or streaming event connection. |
| `allowedTools`          | Tool names                      | Exposes only approved server tools.                            |
| `allowedResources`      | Resource URIs                   | Restricts resource access.                                     |
| `roots`                 | Paths/URIs                      | Limits server filesystem or resource boundaries.               |
| `metadata`              | Trust/package/security metadata | Makes MCP risk reviewable.                                     |
| `allowedCommands`       | Commands                        | Restricts stdio process execution.                             |
| `rejectUnpinnedPackage` | Boolean                         | Blocks unpinned stdio package specs.                           |

Use [MCP GitHub Agent](../../examples.md#mcp-github-agent) for a built-in wrapper pattern and [Custom MCP Connection](../../examples.md#custom-mcp-connection) for direct `MCPAdapter.connect()` with stdio, HTTP, or SSE.

## Skill Config

| Field                     | Purpose                                      | Use case                                                           |
| ------------------------- | -------------------------------------------- | ------------------------------------------------------------------ |
| `name`, `description`     | Identifies and explains the skill.           | [Custom skills](../../examples.md#custom-skills)                   |
| `directive`               | Lets users target the skill with slash text. | [Skill directives](../../examples.md#skill-directives)             |
| `requires`                | Declares needed model/runtime capabilities.  | [Custom skills](../../examples.md#custom-skills)                   |
| `dependsOn`               | Declares adapter/skill dependencies.         | [Adapter skill workflow](../../examples.md#adapter-skill-workflow) |
| `metadata.sideEffectRisk` | Communicates risk level.                     | [Custom skills](../../examples.md#custom-skills)                   |
| `prompt`                  | Structured skill prompt sections.            | [Custom skills](../../examples.md#custom-skills)                   |
| `tools`                   | Adds skill-local tools.                      | [Custom skills](../../examples.md#custom-skills)                   |
| Lifecycle hooks           | Adjust params/results around the model run.  | [Custom skills](../../examples.md#custom-skills)                   |

Use adapters and MCP for capability. Use skills for behavior. Keep product authorization above both.

## Creator-Specific Config

| Surface           | Config                                             | Required | Default                                     |
| ----------------- | -------------------------------------------------- | -------- | ------------------------------------------- |
| Creator packs     | `CreatorPacks.blog(config)` and siblings           | No       | Zero-config pack manifest and skill bundle. |
| Skill activation  | `Agent.create({ skillActivation })`                | No       | `always`                                    |
| Tool selection    | `Agent.create({ toolSelection })`                  | No       | `all`                                       |
| Creator cache     | `Agent.create({ cache: AgentCache.file(...) })`    | No       | Disabled unless supplied.                   |
| Creator memory    | `CreatorResourcesAdapter.connect({ memoryStore })` | No       | Fixture-only config or empty values.        |
| Analytics history | `AnalyticsAdapter.connect({ historyStore })`       | No       | Fixture-only metrics or empty values.       |

Use `skillActivation: 'auto'` and `toolSelection: 'auto'` when attaching broad creator packs. Use explicit directives when the prompt must force a specific skill.
