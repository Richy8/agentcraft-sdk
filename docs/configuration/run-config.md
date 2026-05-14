# Run Config

Run config is the request-specific layer. It carries the prompt, files, media, structured output, budget, per-run attachments, and per-run tool behavior.

## Fields

| Option                              | Required | Default       | Purpose                                       |
| ----------------------------------- | -------- | ------------- | --------------------------------------------- |
| `prompt`                            | Yes      | None          | User task.                                    |
| `files`, `images`, `audio`, `video` | No       | `[]`          | Multimodal or file inputs.                    |
| `responseSchema`                    | No       | None          | Structured output schema.                     |
| `use`                               | No       | None          | Skills, adapters, or packs for this run only. |
| `budget`                            | No       | Agent default | Caps tokens, cost, and tool calls.            |

## Usage

```ts
import { Agent, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Extract title, author, and claims from this article.",
  responseSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      claims: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["title", "claims"],
  },
  budget: { maxToolCalls: 4, maxCost: 0.2 },
});
console.log(response.structuredResponse);
```

Attach expensive skills or tools only when one prompt needs them:

```ts
import { CreatorPacks } from "agentcraft/packs";
import { FirecrawlAdapter } from "agentcraft/adapters";

await agent.run({
  prompt: "Research this topic and draft a Medium-style article.",
  use: [
    FirecrawlAdapter.connect({ apiKey: process.env.FIRECRAWL_API_KEY! }),
    CreatorPacks.blog({ cache: "auto" }),
  ],
  budget: { maxToolCalls: 5, maxTokens: 1200 },
});
```

## Related Config

| Topic             | Page                                                      | Why it matters  | Example                                                   |
| ----------------- | --------------------------------------------------------- | --------------- | --------------------------------------------------------- |
| Structured output | [Structured Output Config](./structured-output-config.md) | Typed results   | [Structured output](../core/structured-output.md)         |
| Prompt assembly   | [Prompt Assembly Config](./prompt-assembly-config.md)     | Complex prompts | [Prompt assembly](../core/prompt-assembly.md)             |
| Tool limits       | [Tool Policy Config](./tool-policy-config.md)             | Bound tool use  | [Tools](../tools/tools.md)                                |
| Budgets           | [Budgets](../core/budgets-cost.md)                        | Control spend   | [Production cookbook](../examples-cookbook/production.md) |
