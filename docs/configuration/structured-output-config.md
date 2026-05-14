# Structured Output Config

Structured output asks the model to return JSON that matches a schema and then validates that response.

## Usage

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Extract action items from these notes.",
  responseSchema: {
    type: "object",
    properties: {
      actions: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["actions"],
  },
});
console.log(response.structuredResponse);
// { actions: ["Follow up with team", "Update roadmap"] }
```

## Options

| Option            | Required | Default         | Purpose                                 |
| ----------------- | -------- | --------------- | --------------------------------------- |
| `type`            | Yes      | None            | Structured output mode.                 |
| `schema`          | Yes      | None            | JSON schema or supported schema object. |
| Validation helper | No       | Runtime parser  | Validates returned JSON.                |
| Repair prompt     | No       | Runtime default | Helps retry malformed output.           |

More variants: [Structured Output](../core/structured-output.md) and [structured output guide](../guides/config/structured-output.md).
