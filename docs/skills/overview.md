# Skills Overview

Skills package reusable behavior: role, goal, output expectations, directives, dependency metadata, and optional tools.

## Quick Start

```ts
import { Agent, Provider } from "agentcraft";
import { WritingSkill } from "agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(WritingSkill.create());

const response = await agent.run({
  prompt: "/write Draft a concise customer update.",
});
console.log(response.content);
```

## Skill Surfaces

| Surface         | Purpose                              | More                                    |
| --------------- | ------------------------------------ | --------------------------------------- |
| Built-in skills | Ready-made behavior.                 | [Built-In Skills](./built-in.md)        |
| Directives      | Target skill behavior in prompt.     | [Skill Directives](./directives.md)     |
| Activation      | Controls when attached skills apply. | [Skill Activation](./activation.md)     |
| External skills | Load local/GitHub skills.            | [External Skills](./external-skills.md) |
| Custom skills   | App-owned behavior.                  | [Custom Skills](./custom.md)            |

## Config

| Field       | Required    | Default | Purpose                       |
| ----------- | ----------- | ------- | ----------------------------- |
| `name`      | Yes         | None    | Skill id.                     |
| `directive` | Recommended | None    | Slash command target.         |
| `prompt`    | Usually     | None    | Structured prompt behavior.   |
| `metadata`  | Recommended | `{}`    | Dependencies, risk, versions. |
| `tools`     | No          | `[]`    | Skill-local tools.            |

## Examples

- [Skill composition](../examples.md#skill-composition)
- [Skill directives](../examples.md#skill-directives)
- [Custom skills](../examples.md#custom-skills)
