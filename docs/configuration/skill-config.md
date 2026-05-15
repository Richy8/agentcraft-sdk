# Skill Config

Skill config controls prompt behavior, dependencies, directives, and optional tools. Skills can be built in, custom-defined, or loaded from an external GitHub repository.

## Pattern

| Step   | Action                                                         | Required? | Related page                             |
| ------ | -------------------------------------------------------------- | --------- | ---------------------------------------- |
| Import | `import { WritingSkill } from '@deskcreate/agentcraft/skills'` | Yes       | [Built-In Skills](../skills/built-in.md) |
| Create | `WritingSkill.create()`                                        | Yes       | [Skill Overview](../skills/overview.md)  |
| Attach | `agent.use(skill)`                                             | Yes       | [Agents](../core/agents.md)              |
| Direct | Optional `/skill-name` directive                               | No        | [Directives](../skills/directives.md)    |

## Usage

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { ResearchSkill, WritingSkill } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
})
  .use(ResearchSkill.create())
  .use(WritingSkill.create());

const response = await agent.run({
  prompt: "Write a clear explainer from these research notes.",
});
console.log(response.content);
```

## Configuration

| Option            | Required                | Default       | Purpose                                   |
| ----------------- | ----------------------- | ------------- | ----------------------------------------- |
| Skill metadata    | Built in                | Skill default | Declares capabilities and risk.           |
| Prompt template   | For custom skills       | None          | Adds reusable expert instructions.        |
| Required adapters | Skill-specific          | None          | Enforced capability dependencies.         |
| Activation        | Pack-level or directive | `auto`        | Determines when skill instructions apply. |

More variants: [skill cookbook](../examples-cookbook/skills.md) and [external skills](../skills/external-skills.md).
