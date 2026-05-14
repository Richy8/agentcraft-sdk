# Structured Output Guide

Pass `responseSchema` to request validated JSON output.

Supported schemas:

- JSON Schema subset
- Zod-like schemas with `safeParse`

Runtime behavior:

- native JSON mode is requested when available
- strict JSON instructions are added
- invalid JSON or schema mismatch raises `ToolExecutionError`
- `structuredOutput.retries` can repair invalid output
- tool-capable models can use `structuredOutput.toolFallback`

Successful responses include `structuredResponse`.

## Config Fields

| Field                           | Required                  | Values                                            | Purpose                                                                                           |
| ------------------------------- | ------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `responseSchema`                | Yes for structured output | JSON Schema subset or Zod-like `safeParse` object | Defines the exact value expected from the model.                                                  |
| `responseFormat.type`           | No                        | `'json_object'` or `'text'`                       | Requests provider-native JSON mode where available. Validation still comes from `responseSchema`. |
| `structuredOutput.retries`      | No                        | Integer                                           | Number of repair attempts after invalid JSON or schema mismatch.                                  |
| `structuredOutput.toolFallback` | No                        | `true`, `false`, or `'auto'`                      | Uses a synthetic schema-emission tool when the selected model supports tool calling.              |

## Supported JSON Schema Subset

| Schema field | Purpose                                                             |
| ------------ | ------------------------------------------------------------------- |
| `type`       | One of `object`, `array`, `string`, `number`, `boolean`, or `null`. |
| `properties` | Object field definitions.                                           |
| `required`   | Required object keys.                                               |
| `items`      | Array item schema.                                                  |
| `enum`       | Fixed set of allowed values.                                        |

Keep schemas narrow and explicit. A field named `riskLevel` with `enum: ['low', 'medium', 'high']` is easier to validate and repair than a free-form paragraph asking the model to infer severity.

## Fallback Selection

| `toolFallback` | Behavior                                                                                                                                      |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `auto`         | Uses tool fallback only when the model supports tools and the runtime decides it is useful. This is the safest default for portable examples. |
| `true`         | Forces tool fallback when possible. Use for providers where tool calls are more reliable than free-form JSON.                                 |
| `false`        | Disables tool fallback. Use when a provider has strong native JSON mode or when tool calling is unavailable by policy.                        |

Structured output validates model output; it does not validate whether the content is factually correct or authorized. Pair it with retrieval checks, guardrails, and application review for high-risk workflows.
