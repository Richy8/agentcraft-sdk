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

Use `auto` when attaching packs with many skills. Use directives when the user must force a specific skill. Auto activation is intentionally capped for creator-pack runs so a broad pack does not silently inject every skill into the prompt.

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

## Inspect Activation Reasons

Every run reports the active skills and why they activated. This is useful for prompt-bloat audits and for comparing flat prompts against skill-enhanced prompts.

```ts
const response = await agent.run({
  prompt: "Write a practical blog draft about cache strategy.",
});

console.log(response.selection?.activeSkills);
console.log(response.selection?.activationReasons);
```

Reason codes:

| Reason             | Meaning                                            |
| ------------------ | -------------------------------------------------- |
| `always`           | Skill activated because the agent mode is always.  |
| `directive`        | A slash directive such as `/blog` matched a skill. |
| `exact-alias`      | The skill name or directive matched directly.      |
| `keyword`          | Auto activation matched a domain alias.            |
| `creator-artifact` | A creator artifact dependency matched.             |
| `capability`       | A required or optional capability matched.         |
| `semantic`         | Reserved for future semantic routing.              |

Each reason includes `skill`, `reason`, `confidence`, and an optional `matched` value.

Activation ignores fenced code blocks and lines that look like retrieved pages, external content, source text, or tool output. That prevents a scraped page from smuggling `/publish-qa` or another unrelated directive into the run.
