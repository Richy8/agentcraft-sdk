# Skills Examples

Skills add reusable prompt behavior, dependency metadata, and optional directives.

## Automatic Skill Use

```ts
import { Agent, Provider } from "agentcraft";
import { ResearchSkill, WritingSkill } from "agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
})
  .use(ResearchSkill.create())
  .use(WritingSkill.create());

const response = await agent.run({
  prompt: "Research this topic and write a clear executive summary.",
});
console.log(response.content);
```

## Directive Use

```ts
import { Agent, Provider } from "agentcraft";
import { HumanizerSkill } from "agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(HumanizerSkill.create());

const response = await agent.run({
  prompt:
    "/humanizer Rewrite this announcement so it sounds natural but still precise.",
});
console.log(response.content);
```

## External GitHub Skill

```ts
import { Agent, Provider } from "agentcraft";
import { GitHubSkillLoader } from "agentcraft/skills";

const loader = new GitHubSkillLoader({
  token: process.env.GITHUB_PERSONAL_ACCESS_TOKEN,
});

const skill = await loader.loadFromGitHub({
  repo: "org/agentcraft-skills",
  ref: "main",
  path: "skills/medium-editor",
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(skill);

const response = await agent.run({ prompt: "Edit this Medium draft." });
console.log(response.content);
```

More detail: [Skills](../skills/overview.md), [External Skills](../skills/external-skills.md), [Directives](../skills/directives.md).
