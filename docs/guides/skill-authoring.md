# Skill Authoring Guide

Skills are adapters with prompt behavior and dependency metadata.

A production skill should define:

- role and goal
- constraints
- tool-use policy
- output format
- quality checklist
- failure behavior
- safety notes
- required capabilities
- required and optional adapters
- side-effect risk

Keep skill prompts specific enough to guide behavior, but avoid hiding product policy inside a skill. Product policy should remain application-owned.

## Skill Config Fields

| Field                   | Required    | Purpose                                                                                                         |
| ----------------------- | ----------- | --------------------------------------------------------------------------------------------------------------- |
| `name`                  | Yes         | Stable identifier used for dependency checks, traces, and docs.                                                 |
| `description`           | Yes         | Explains when the skill is useful. Keep it user-facing and concrete.                                            |
| `directive`             | No          | Short behavior instruction. Use for small nudges, not full policy.                                              |
| `requires`              | No          | Runtime/model capabilities such as `tools`, `vision`, `audio`, `video`, or `files`.                             |
| `dependsOn`             | No          | Required adapters or skills. Use to make missing capability errors explicit.                                    |
| `metadata`              | Recommended | Declares capabilities, required/optional adapters, statefulness, side-effect risk, and prompt version.          |
| `prompt`                | Recommended | Structured prompt sections for role, goal, constraints, tool use, output format, quality, failures, and safety. |
| `systemPromptExtension` | No          | Direct string or function for advanced cases. Prefer `prompt` for consistency.                                  |
| `tools`                 | No          | Skill-local tools. They still pass through normal tool policy.                                                  |
| Lifecycle hooks         | No          | `init`, `cleanup`, `onBeforeRun`, `onAfterRun`, `onAfterStream`.                                                |

## Prompt Template Sections

| Section            | Purpose                                                                             |
| ------------------ | ----------------------------------------------------------------------------------- |
| `role`             | Defines the specialist perspective without pretending to own product policy.        |
| `goal`             | States the durable outcome the skill should optimize for.                           |
| `constraints`      | Lists hard behavioral boundaries and quality limits.                                |
| `toolUsePolicy`    | Explains when to use, avoid, or ask before using tools.                             |
| `outputFormat`     | Describes the expected response shape and content.                                  |
| `qualityChecklist` | Gives the model a final self-review checklist.                                      |
| `failureBehavior`  | Tells the model how to respond when information, tools, or permissions are missing. |
| `safetyNotes`      | Captures domain-specific caution without replacing app-level authorization.         |

## Metadata Fields

| Field                  | Values                                      | Purpose                                                             |
| ---------------------- | ------------------------------------------- | ------------------------------------------------------------------- |
| `requiredCapabilities` | Capability array                            | Capabilities the model/runtime must support.                        |
| `requiredAdapters`     | Adapter names                               | Hard dependencies that must be present.                             |
| `optionalAdapters`     | Adapter names                               | Enhancements the skill can use when available.                      |
| `stateful`             | Boolean                                     | Signals whether the skill may rely on memory or persistent context. |
| `sideEffectRisk`       | `'none'`, `'read'`, `'write'`, `'external'` | Highest realistic risk the skill can trigger.                       |
| `promptVersion`        | String                                      | Version marker for prompt review, regression tests, and changelogs. |

All built-in skills should follow the same structure so teams can compare capabilities quickly and audit prompt changes over time.

## Example Patterns

| Pattern                    | Example                                                         | When to use it                                                                   |
| -------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Built-in skill composition | [Skill Composition](../examples.md#skill-composition)           | Use packaged skills such as writing, research, analysis, translation, or review. |
| Directive targeting        | [Skill Directives](../examples.md#skill-directives)             | Let users target a skill with `/directive` syntax inside a prompt.               |
| Custom tool-bearing skill  | [Custom Skills](../examples.md#custom-skills)                   | Package domain behavior plus one or more app-owned tools.                        |
| Custom hook-based skill    | [Custom Skills](../examples.md#custom-skills)                   | Add review behavior, prompt shaping, or result cleanup without adding tools.     |
| Adapter-backed skill       | [Adapter Skill Workflow](../examples.md#adapter-skill-workflow) | Attach required adapters before a skill that depends on external context.        |
