# Local And Private Agents

Use this path when the main requirement is privacy, local development, offline experimentation, or cost control.

## Start With

- Example: [Local Ollama Private](../../examples.md#local-ollama-private)
- Config: [Agent Creation](../config/agent-creation.md), [Run Parameters](../config/run-parameters.md)
- API: [Agent](/api/classes/index.Agent.html), [Provider](/api/variables/index.Provider.html)

## Required Choices

| Config       | Required   | Purpose                                                                              |
| ------------ | ---------- | ------------------------------------------------------------------------------------ |
| `model`      | Yes        | Selects the local provider and model id, such as `Provider.ollama['llama3.2']`.      |
| `baseUrl`    | Sometimes  | Required for local OpenAI-compatible gateways that do not use the default local URL. |
| `apiKey`     | Usually no | Omit for local runtimes unless your gateway enforces authentication.                 |
| `budget`     | Optional   | Still useful for token ceilings even when model cost is zero.                        |
| `toolPolicy` | Optional   | Needed when local agents receive file, browser, or network tools.                    |

## Tradeoffs

Local models improve privacy and cost control, but they may have smaller context windows, weaker tool calling, and slower inference than hosted models. Keep examples deterministic by using replay or fake providers when testing local flows.

## Next Steps

Add [Prompt Assembly](../config/prompt-assembly.md) for reusable local prompts, then add [Tools And Guardrails](../config/tools-and-guardrails.md) when local agents can touch files or external services.
