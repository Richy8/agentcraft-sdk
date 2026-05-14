# External Skills

External skills load into the same `AgentSkill` shape as built-in skills.

```ts
import { Agent, Provider } from "agentcraft";
import { GitHubSkillLoader } from "agentcraft/skills";

const skill = await GitHubSkillLoader.loadLocal("./skills/medium");

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(skill);

const response = await agent.run({
  prompt: "/medium Draft a post about AI caching.",
});
console.log(response.content);
```

An external skill folder must include:

- `skill.json`
- `SKILL.md`

The manifest must declare creator metadata such as name, directive, stage, capabilities, artifacts, side-effect risk, and prompt version.

Trust levels are `untrusted`, `reviewed`, `workspace`, and `official`. Untrusted write-capable skills are blocked by default.
