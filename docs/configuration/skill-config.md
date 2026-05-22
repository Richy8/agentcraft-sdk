# Skill Config

Skills add reusable prompt behavior, directives, metadata, and optional tool dependencies. A skill does not replace an adapter — adapters provide capability (tools), skills provide behavior (how the model uses them). Skills can be built-in, custom-defined with `defineSkill`, or loaded from domain packs.

## Attach Pattern

| Step          | Action                                                              | Required?   | Related page                               |
| ------------- | ------------------------------------------------------------------- | ----------- | ------------------------------------------ |
| Import        | `import { WritingSkill } from '@deskcreate/agentcraft/skills'`      | Yes         | [Built-In Skills](../reference/built-in-skills.md) |
| Create/define | `WritingSkill.create()` or `defineSkill({...})`                    | Yes         | [Skills Overview](../skills/overview.md)   |
| Attach        | `agent.use(skill)`                                                  | Yes         | [Agents](../core/agents.md)                |
| Direct        | `/directive-name` in prompt                                         | For directive-only | [Directives](../skills/directives.md) |

## Skill Activation Modes

The `skillActivation` option at the agent level controls when attached skills contribute their prompt fragment.

| Mode              | Config value          | Behavior                                                                    | Best for                              |
| ----------------- | --------------------- | --------------------------------------------------------------------------- | ------------------------------------- |
| Always            | `'always'`            | All attached skills always contribute prompt context.                       | Single-skill agents, simple workflows |
| Auto              | `'auto'`              | Runtime selects relevant skills from prompt content, metadata, directives.  | Multi-skill agents, packs             |
| Directive-only    | `'directive-only'`    | Skills activate only when a matching `/directive` appears in the prompt.    | Precise pipelines, predictable output |

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { ResearchSkill, WritingSkill } from "@deskcreate/agentcraft/skills";

// Auto mode — runtime selects relevant skills
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
// → WritingSkill activates; ResearchSkill may not
console.log(response.selection?.activeSkills);
```

```ts
// Directive-only mode — explicit control
const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "directive-only",
})
  .use(ResearchSkill.create())
  .use(WritingSkill.create());

const response = await agent.run({
  prompt: `/investigate Research the top agent frameworks.
  
/write Write a comparison summary.`,
});
// → Both skills activate via directives
```

## Built-In Skill Config

Most built-in skills use `.create()` with no required options. Pass options to override defaults.

| Skill             | Import                  | Directive           | Config options                                                              |
| ----------------- | ----------------------- | ------------------- | --------------------------------------------------------------------------- |
| Research          | `ResearchSkill`         | `/investigate`      | None                                                                        |
| Deep Research     | `DeepResearchSkill`     | `/investigate-deep` | None                                                                        |
| Writing           | `WritingSkill`          | `/write`            | None                                                                        |
| Summarize         | `SummarizeSkill`        | `/distill`          | None                                                                        |
| Humanizer         | `HumanizerSkill`        | `/humanize`         | None                                                                        |
| Code Review       | `CodeReviewSkill`       | `/audit`            | None                                                                        |
| Data Analysis     | `DataAnalysisSkill`     | `/analyze`          | None                                                                        |
| Document Analysis | `DocumentAnalysisSkill` | `/extract`          | None                                                                        |
| Memory            | `MemorySkill`           | `/remember`         | None                                                                        |
| Conversation      | `ConversationSkill`     | `/continue`         | `{ maxTurns?, systemAppend?, rememberUser? }`                               |
| Email Draft       | `EmailDraftSkill`       | `/draft-email`      | None                                                                        |
| Translation       | `TranslationSkill`      | `/translate`        | None                                                                        |
| Vision            | `VisionSkill`           | `/observe`          | None                                                                        |
| Transcription     | `TranscriptionSkill`    | `/transcribe`       | None                                                                        |
| Scheduler         | `SchedulerSkill`        | `/schedule`         | None                                                                        |
| Meeting           | `MeetingSkill`          | `/extract-actions`  | None                                                                        |

## Custom Skill — defineSkill

Define project-specific skills with a custom directive and prompt.

```ts
import { defineSkill } from "@deskcreate/agentcraft/skills";

const contractReviewSkill = defineSkill({
  name: "contract-reviewer",
  directive: "review-contract",              // must be a verb/action phrase, not the name
  description: "Review contracts for clause risks and plain-language gaps.",
  prompt: {
    sections: [
      {
        title: "Contract Review Mode",
        body: `Review the contract provided. Identify:
1. Ambiguous or one-sided clauses
2. Missing standard provisions (indemnification, limitation of liability)
3. Auto-renewal provisions and notice periods
4. Any clauses that conflict with applicable jurisdiction

Flag each issue with its clause location and a plain-language summary.`,
      },
    ],
  },
});
```

| `defineSkill` field | Required | Default  | Purpose                                                              |
| ------------------- | -------- | -------- | -------------------------------------------------------------------- |
| `name`              | Yes      | None     | Unique skill identifier. Used for registry lookup and logging.       |
| `directive`         | Yes      | None     | Slash directive (without `/`). Must be an action verb or verb phrase.|
| `description`       | Yes      | None     | One-line description. Used in activation metadata.                  |
| `prompt.sections`   | Yes      | None     | Array of `{ title, body }` blocks injected into the prompt.          |
| `metadata`          | No       | `{}`     | Tags, required adapters, side-effect risk level.                     |
| `requires`          | No       | `[]`     | Model capabilities required: `'vision'`, `'files'`, `'tools'`, etc. |

## Domain Skill Packs

Domain packs load many related skills at once for an industry domain. Use `createSkillPackByName(domain)` to attach all skills in a domain, or `createSkillByName(id)` to attach a single skill by ID.

```ts
import { createSkillPackByName, createSkillByName } from "@deskcreate/agentcraft/skills";

// Load all marketing domain skills (20+ skills)
agent.use(createSkillPackByName("marketing"));

// Load a single skill by ID
agent.use(createSkillByName("blog-writer"));
```

Available domain names: `"brand"`, `"business"`, `"creator"`, `"data-analytics"`, `"engineering"`, `"finance"`, `"healthcare"`, `"legal"`, `"marketing"`, `"personal-productivity"`, `"product"`, `"sales"`, `"support"`.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";
import { GitHubMcp } from "@deskcreate/agentcraft/mcp";

// Engineering domain pack
const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "directive-only",
})
  .use(createSkillPackByName("engineering"))
  .use(GitHubMcp.connect({
    token: process.env.GITHUB_TOKEN!,
    allowedTools: ["get_pull_request", "get_file_contents"],
  }));

const review = await agent.run({
  prompt: `/review-code Review PR #88 for type safety.
  
/review-security Flag any auth-related security issues.`,
});
```

## Inspect Activation Results

After a run, inspect which skills were activated and why:

```ts
const response = await agent.run({
  prompt: "/write-blog Write about TypeScript agent caching.",
});

const reasons = response.selection?.activationReasons ?? [];
for (const { skill, reason, confidence, matched } of reasons) {
  console.log(`${skill}: ${reason} (confidence: ${confidence}${matched ? `, matched: "${matched}"` : ""})`);
}
// → blog-writer: directive (confidence: 1.0, matched: "/write-blog")
```

## Skill Config Summary Table

| Option             | Scope         | Required        | Default                | Purpose                                           |
| ------------------ | ------------- | --------------- | ---------------------- | ------------------------------------------------- |
| `skillActivation`  | Agent create  | No              | `'always'`             | Controls when skills contribute prompt context.   |
| `name`             | defineSkill   | Yes             | None                   | Unique ID for the skill.                          |
| `directive`        | defineSkill   | Yes             | None                   | Slash directive (action verb, no leading `/`).    |
| `description`      | defineSkill   | Yes             | None                   | Used in activation metadata and logging.          |
| `prompt.sections`  | defineSkill   | Yes             | None                   | Prompt fragments injected on activation.          |
| `metadata`         | defineSkill   | No              | `{}`                   | Tags, required adapters, side-effect risk.        |
| `requires`         | defineSkill   | No              | `[]`                   | Model capability requirements.                   |

More patterns: [skill cookbook](../examples-cookbook/skills.md), [built-in skills](../reference/built-in-skills.md), [domain skills](../skills/built-in.md).
