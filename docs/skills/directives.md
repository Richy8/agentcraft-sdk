# Skill Directives

Directives let users force skill behavior for part of a prompt.

## Example

```ts
import { Agent, Provider } from "agentcraft";
import { WritingSkill, HumanizerSkill } from "agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(WritingSkill.create())
  .use(HumanizerSkill.create());

const response = await agent.run({
  prompt: `
/write Draft a product update.

/humanizer Make the final paragraph warmer.
`,
});
console.log(response.content);
```

## Behavior

| Case                     | Result                                |
| ------------------------ | ------------------------------------- |
| Known directive attached | Prompt region is scoped to the skill. |
| Unknown directive        | Fails fast.                           |
| No directive             | Depends on `skillActivation`.         |

## Related

- [Skill Activation](./activation.md)
- [Skill directives example](../examples.md#skill-directives)
