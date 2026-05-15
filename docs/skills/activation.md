# Skill Activation

Skill activation controls which attached skills contribute behavior during a run.

## Config

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
  toolSelection: "auto",
});
```

## Modes

| Mode             | Default? | Purpose                                                  |
| ---------------- | -------- | -------------------------------------------------------- |
| `always`         | Yes      | Backward-compatible: attached skills apply.              |
| `auto`           | No       | Selects relevant skills from prompt/directives/metadata. |
| `directive-only` | No       | Only slash-targeted skills activate.                     |

## Pattern: Large Creator Pack

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
  toolSelection: "auto",
}).use(CreatorPacks.blog());
```

Use `auto` when attaching packs with many skills. Use directives when the user must force a specific skill.

## Pattern: Per-Run Skill Scope

Use run-level `use` when a skill or pack should be available to one prompt without becoming global agent context.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const response = await agent.run({
  prompt: "Draft a concise Medium post about cache-aware agents.",
  use: CreatorPacks.blog({ cache: "auto" }),
  budget: { maxToolCalls: 4 },
});
console.log(response.content);
```

This keeps the default agent lean, then activates creator skills only for the run that needs them.
