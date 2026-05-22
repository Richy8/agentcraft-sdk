# Skill Activation

Skill activation controls which attached skills contribute their prompt guidance to a given run. Skills are never executed as code — they inject structured text into the system prompt. Activation decides *which* skills inject *when*.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { WritingSkill, ResearchSkill, CodeReviewSkill } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  // "auto" — skills activate when the prompt signals intent
  skillActivation: "auto",
})
  .use(WritingSkill.create())
  .use(ResearchSkill.create())
  .use(CodeReviewSkill.create());

// WritingSkill and ResearchSkill activate — CodeReview does not
const response = await agent.run({
  prompt: "Research recent TypeScript 5.x features and write a clear summary.",
});

console.log(response.selection?.activeSkills);
// → ["writing", "research"]

console.log(response.selection?.activationReasons);
// → [{ skill: "writing", reason: "keyword", confidence: 0.9, matched: "write" },
//     { skill: "research", reason: "keyword", confidence: 0.85, matched: "research" }]
```

## Activation Modes

Set `skillActivation` on `Agent.create()` to control the default behavior for all runs:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "always",    // "always" | "auto" | "directive-only"
});
```

| Mode | Default | Behavior |
| --- | --- | --- |
| `"always"` | Yes | All attached skills are active on every run |
| `"auto"` | No | Skills activate based on prompt keywords, directives, and metadata signals |
| `"directive-only"` | No | Only skills explicitly invoked with `/directive` activate |

### `"always"` — All Skills Active

Every attached skill contributes its prompt guidance on every run. Use this when you have a small number of focused skills and always want them applied:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { WritingSkill, SummarizeSkill } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "always", // default — no need to specify explicitly
})
  .use(WritingSkill.create())
  .use(SummarizeSkill.create());

// Both skills inject guidance for every run
const response = await agent.run({ prompt: "Summarize this document." });
```

### `"auto"` — Keyword and Signal-Based Activation

The activation engine scans the prompt for keywords, domain aliases, and directives, then selects skills whose domains match. Use this when attaching a large pack or multiple domain skills:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
}).use(createSkillPackByName("engineering")); // attaches ~6 engineering skills

// Only "code-review" activates — not all 6 skills
const response = await agent.run({
  prompt: "Review this TypeScript function for type safety issues.",
});
console.log(response.selection?.activeSkills); // → ["code-review"]
```

Auto activation is capped per run to prevent large packs from silently injecting every skill's prompt guidance.

### `"directive-only"` — Explicit Activation

Skills only activate when explicitly invoked with their `/directive`. No keyword matching or implicit activation occurs:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { WritingSkill, ResearchSkill } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "directive-only",
})
  .use(WritingSkill.create())  // directive: "write"
  .use(ResearchSkill.create()); // directive: "research"

// Without /write — no skills activate
const silent = await agent.run({ prompt: "Explain caching." });
console.log(silent.selection?.activeSkills); // → []

// With /write — WritingSkill activates
const directed = await agent.run({ prompt: "/write Explain caching." });
console.log(directed.selection?.activeSkills); // → ["writing"]
```

## Per-Run Activation Override

Override `skillActivation` for a single run without changing the agent config:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { WritingSkill, CodeReviewSkill } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto", // default for most runs
})
  .use(WritingSkill.create())
  .use(CodeReviewSkill.create());

// Override to "always" for this specific run
const response = await agent.run({
  prompt: "Review this code and then write a summary.",
  skillActivation: "always", // both skills active regardless of prompt content
});
```

## Activation Reasons

Every run reports exactly which skills activated and why. Use this to debug unexpected behavior or audit prompt bloat:

```ts
const response = await agent.run({
  prompt: "/write Draft a product update about the new caching feature.",
});

console.log(response.selection?.activeSkills);
// → ["writing"]

console.log(response.selection?.activationReasons);
// → [{
//     skill: "writing",
//     reason: "directive",
//     confidence: 1.0,
//     matched: "/write"
//   }]
```

### Reason Codes

| Code | Meaning |
| --- | --- |
| `"always"` | `skillActivation: "always"` mode — all skills active |
| `"directive"` | A `/directive` in the prompt matched this skill |
| `"exact-alias"` | The skill name or alias matched the prompt exactly |
| `"keyword"` | Auto activation matched a domain keyword or alias |
| `"creator-artifact"` | A creator artifact dependency triggered activation |
| `"capability"` | A required or optional capability matched the prompt context |
| `"semantic"` | Reserved for future semantic routing |
| `"not-activated"` | Skill was checked but did not activate |

### Prompt Safety — Injection Prevention

The activation engine ignores skill directives found in:

- Fenced code blocks (` ```...``` `)
- Lines that appear to be retrieved content, external data, or tool output

This prevents a scraped web page or tool result containing `/code-review` or `/write` from silently activating skills.

## Skill Registry — Browsing and Inspecting Skills

`SkillRegistry` is the programmatic API for listing and inspecting available skills:

```ts
import {
  defaultSkillRegistry,
  listSkillSpecs,
  listSkillInspections,
  inspectSkillByName,
} from "@deskcreate/agentcraft/skills";

// List all registered skill specs (17 primitive + domain skills)
const all = listSkillSpecs();
console.log(all.map((s) => s.name));
// → ["writing", "research", "summarize", "code-review", ...]

// Filter by domain
const engineeringSkills = listSkillSpecs({ domain: "engineering" });
console.log(engineeringSkills.map((s) => s.name));
// → ["code-review", "architecture", "debug", ...]

// Inspect a specific skill — full metadata
const info = inspectSkillByName("writing");
if (info) {
  console.log(info.directive);          // → "write"
  console.log(info.description);        // → "Applies structured writing..."
  console.log(info.domain);             // → "general"
  console.log(info.sideEffectRisk);     // → "none"
  console.log(info.producesArtifacts);  // → ["document"]
  console.log(info.hasPrompt);          // → true
  console.log(info.hasExamples);        // → true
}
```

### `SkillInspection` Fields

| Field | Type | Description |
| --- | --- | --- |
| `name` | `string` | Skill identifier |
| `directive` | `string \| undefined` | Slash command name (e.g. `"write"`) |
| `description` | `string` | What this skill does |
| `domain` | `string \| undefined` | Domain (e.g. `"engineering"`, `"general"`) |
| `category` | `string \| undefined` | Sub-category within domain |
| `sideEffectRisk` | `"none" \| "low" \| "medium" \| "high"` | Risk level |
| `requiredAdapters` | `string[]` | Adapters the skill requires |
| `optionalAdapters` | `string[]` | Adapters the skill benefits from |
| `consumesArtifacts` | `string[]` | Artifact types the skill reads |
| `producesArtifacts` | `string[]` | Artifact types the skill creates |
| `hasPrompt` | `boolean` | Whether the skill has a prompt template |
| `hasLifecycleHooks` | `boolean` | Whether the skill has `onBeforeRun`/`onAfterRun` |

### Building a Custom Registry

Isolate skills in your own registry for testing or multi-tenant scenarios:

```ts
import { SkillRegistry } from "@deskcreate/agentcraft/skills";
import { myCustomSkillSpec } from "./skills/my-skill.js";

const registry = new SkillRegistry();
registry.register(myCustomSkillSpec);

// Create a skill instance from the registry
const skill = registry.create("my-custom-skill");

// Attach it to an agent
const agent = Agent.create({ ... }).use(skill);
```

## Patterns

### Large Pack With Auto Activation

Use `"auto"` when attaching a domain pack to avoid injecting all skills on every run:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
  toolSelection: "auto", // only expose adapters for active skills
}).use(createSkillPackByName("engineering")); // ~6 skills attached

// Only relevant skills activate per run
const review = await agent.run({ prompt: "Review this code for performance issues." });
const debug = await agent.run({ prompt: "Debug why this function returns undefined." });
```

### Per-Run Skill Scope

Attach skills for a single run to keep the default agent lean:

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { WritingSkill } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

// WritingSkill only active for this one run
const response = await agent.run({
  prompt: "/write Draft a concise product update.",
  use: [WritingSkill.create()],
});
```

### Verifying Active Skills in Tests

Use `response.selection?.activeSkills` to assert which skills activated in tests:

```ts
import { expect, test } from "vitest";
import { Agent, Provider } from "@deskcreate/agentcraft";
import { DeterministicFakeProvider } from "@deskcreate/agentcraft";
import { WritingSkill, CodeReviewSkill } from "@deskcreate/agentcraft/skills";

test("writing skill activates on /write directive", async () => {
  const agent = Agent.create({
    model: "fake:model",
    provider: new DeterministicFakeProvider([{ content: "Draft output" }]),
    skillActivation: "directive-only",
  })
    .use(WritingSkill.create())
    .use(CodeReviewSkill.create());

  const response = await agent.run({ prompt: "/write Draft a summary." });

  expect(response.selection?.activeSkills).toContain("writing");
  expect(response.selection?.activeSkills).not.toContain("code-review");
});
```

## Related

- [Skills Overview](./overview.md)
- [Directives](./directives.md)
- [Primitive Skills](./built-in.md)
- [Custom Skills](./custom.md)
- [Skill Config](../configuration/skill-config.md)
