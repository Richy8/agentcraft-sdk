# Structured Output Config

Structured output turns model text into validated data. Use it when application code needs to branch on fields, store results, or render predictable UI.

| Field                           | Purpose                              | How variants differ                                                                  | Use case                                                 |
| ------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------- |
| `responseSchema`                | Validates parsed JSON                | JSON Schema subset is portable; Zod-like schemas let app code own richer validation. | [Structured output](../../examples.md#structured-output) |
| `responseFormat.type`           | Requests provider-native output mode | `text` is default; `json_object` asks supported providers for native JSON behavior.  | [Structured output](../../examples.md#structured-output) |
| `structuredOutput.retries`      | Repair attempts                      | More retries improve resilience but can add latency and cost.                        | [Structured output](../../examples.md#structured-output) |
| `structuredOutput.toolFallback` | Schema-emission tool fallback        | `auto` uses fallback when useful; `true` forces when possible; `false` disables it.  | [Structured output](../../examples.md#structured-output) |

## Schema Choices

Use `enum` for controlled categories, `required` for fields the app cannot operate without, and arrays for repeatable findings. Keep schemas narrow so repair can succeed.

Structured output validates shape, not truth. Pair it with retrieval checks and guardrails for high-risk domains.
