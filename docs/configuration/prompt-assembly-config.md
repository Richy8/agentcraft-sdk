# Prompt Assembly Config

Prompt assembly composes large prompts from files, partials, variables, and skill extensions.

## Usage

```ts
import { Agent, FileLoader, Provider } from "agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: await FileLoader.load(
    "./examples/prompts/release-note-bundle/main.prompt",
    {
      variables: { audience: "engineering managers" },
    },
  ),
});
console.log(response.content);
```

## Options

| Option       | Required | Default         | Purpose                                |
| ------------ | -------- | --------------- | -------------------------------------- |
| Prompt files | No       | Inline prompt   | Keeps long prompts maintainable.       |
| Partials     | No       | `[]`            | Reuses shared instruction blocks.      |
| Variables    | No       | `{}`            | Injects runtime values.                |
| Skills       | No       | Attached skills | Adds capability-specific instructions. |

More variants: [Prompt Assembly](../core/prompt-assembly.md) and [prompt assembly guide](../guides/config/prompt-assembly.md).
