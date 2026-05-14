# Custom Skills

Custom skills are app-owned reusable behavior.

## Quick Start

```ts
import { Agent, Provider } from "agentcraft";
import { defineSkill } from "agentcraft/skills";

const LaunchReviewSkill = defineSkill({
  name: "launch-review",
  description: "Review launch readiness.",
  directive: "launch-review",
  metadata: {
    sideEffectRisk: "none",
    promptVersion: "2026-05-12",
  },
  prompt: {
    role: "You are a launch readiness reviewer.",
    goal: "Find launch blockers and missing owner decisions.",
    constraints: ["Prioritize actionable findings."],
    toolUsePolicy: ["Use tools only when attached and needed."],
    outputFormat: ["Return findings, severity, and owner."],
    qualityChecklist: ["Every blocker has a next step."],
  },
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(LaunchReviewSkill);

const response = await agent.run({
  prompt: "/launch-review Review our Q3 launch readiness.",
});
console.log(response.content);
```

## Config

| Field                    | Required    | Default | Purpose                    |
| ------------------------ | ----------- | ------- | -------------------------- |
| `name`                   | Yes         | None    | Skill id.                  |
| `description`            | Yes         | None    | User/developer clarity.    |
| `directive`              | Recommended | None    | Slash targeting.           |
| `prompt`                 | Usually     | None    | Structured skill behavior. |
| `metadata.promptVersion` | Recommended | None    | Version prompt changes.    |

## More

- [Custom skills example](../examples.md#custom-skills)
- [Skill Authoring](../guides/skill-authoring.md)
