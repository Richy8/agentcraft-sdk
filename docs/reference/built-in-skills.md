# Built-In Skills Reference

Skills add reusable prompt behavior, directives, and metadata. They are attached with `.use(...)` and do not replace adapters or MCPs — adapters provide capability (tools), skills provide behavior (how the model uses them). Skills activate based on the agent's `skillActivation` mode.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { ResearchSkill, WritingSkill } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "directive-only",
})
  .use(ResearchSkill.create())
  .use(WritingSkill.create());

const response = await agent.run({
  prompt: `/investigate Research TypeScript agent frameworks.
  
/write Write an executive summary.`,
});
console.log(response.content);
console.log(response.selection?.activeSkills);
// → ["research", "writing"]
```

## Activation Modes

| Mode           | Config                              | Behavior                                                                   |
| -------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| Always         | `skillActivation: 'always'`         | All attached skills always contribute their prompt fragment.               |
| Auto           | `skillActivation: 'auto'`           | Runtime selects relevant skills from prompt content and metadata.          |
| Directive-only | `skillActivation: 'directive-only'` | Skills activate only when a matching `/directive` appears in the prompt.   |

## General Skills

| Skill              | Import name             | Directive            | Purpose                                           | Key adapters                                   |
| ------------------ | ----------------------- | -------------------- | ------------------------------------------------- | ---------------------------------------------- |
| Research           | `ResearchSkill`         | `/investigate`       | Gather and synthesize evidence from sources.      | TavilySearch, Fetch, FirecrawlAdapter          |
| Deep Research      | `DeepResearchSkill`     | `/investigate-deep`  | Multi-source, multi-pass research with citations. | TavilySearch, Fetch, CitationManagerAdapter    |
| Writing            | `WritingSkill`          | `/write`             | General writing, drafting, and editing.           | Optional FileSystem/ArtifactStore              |
| Summarize          | `SummarizeSkill`        | `/distill`           | Summarize long input or retrieved content.        | Files, Fetch, MCP resources                    |
| Translation        | `TranslationSkill`      | `/translate`         | Translate while preserving meaning and register.  | Optional glossary/memory tools                 |
| Humanizer          | `HumanizerSkill`        | `/humanize`          | Improve clarity, warmth, and naturalness.         | Optional brand voice/creator memory tools      |
| Code Review        | `CodeReviewSkill`       | `/audit`             | Review code for bugs, risk, and test coverage.    | FileSystem, GitHub, GitHubMcp                  |
| Data Analysis      | `DataAnalysisSkill`     | `/analyze`           | Analyze tabular or structured data.               | DatabaseAdapter, FileSystem, GoogleSheets      |
| Document Analysis  | `DocumentAnalysisSkill` | `/extract`           | Inspect documents and extract structured content. | FileSystem, StorageAdapter, Fetch              |
| Memory             | `MemorySkill`           | `/remember`          | Store and retrieve from persistent memory.        | MemoryMcp, Redis, CreatorResourcesAdapter      |
| Conversation       | `ConversationSkill`     | `/continue`          | Conversational continuity and persona.            | Optional memory tools                          |
| Email Draft        | `EmailDraftSkill`       | `/draft-email`       | Draft emails without sending by default.          | EmailAdapter (approval-gated send)             |
| Scheduler          | `SchedulerSkill`        | `/schedule`          | Scheduling, calendar planning, and event prep.    | GoogleCalendarAdapter, calendar MCP            |
| Meeting            | `MeetingSkill`          | `/extract-actions`   | Meeting notes, agendas, and follow-up tasks.      | Calendar, transcription, EmailAdapter          |
| Vision             | `VisionSkill`           | `/observe`           | Image-aware review, description, and analysis.    | Vision-capable model, image input attachments  |
| Transcription      | `TranscriptionSkill`    | `/transcribe`        | Audio/video transcript handling and formatting.   | Audio-capable model or transcript tools        |

## Configuration Model

| Field                       | Required             | Default                | Notes                                                                          |
| --------------------------- | -------------------- | ---------------------- | ------------------------------------------------------------------------------ |
| `.create()` options         | No for most          | Skill defaults         | `ConversationSkill` accepts `{ maxTurns?, systemAppend?, rememberUser? }`.     |
| `directive`                 | Built in             | Skill-specific         | Slash directive without the leading `/`.                                       |
| `requires`                  | Built in             | Skill-specific         | Model capability requirements: `'vision'`, `'files'`, `'audio'`, `'tools'`.   |
| `metadata.requiredAdapters` | Built in             | `[]` unless needed     | Indicates which adapters make the skill more capable.                          |
| `metadata.sideEffectRisk`   | Built in             | Skill-specific         | Skills do not bypass `ToolPolicy` — write tools still need policy approval.    |

## Using Individual Skills

```ts
import {
  ResearchSkill,
  WritingSkill,
  HumanizerSkill,
  CodeReviewSkill,
  DataAnalysisSkill,
} from "@deskcreate/agentcraft/skills";

// Attach individual skills
agent
  .use(ResearchSkill.create())
  .use(WritingSkill.create())
  .use(HumanizerSkill.create());
```

## ConversationSkill Options

`ConversationSkill` is the only general skill with configurable options:

| Option          | Required | Default | Purpose                                                          |
| --------------- | -------- | ------- | ---------------------------------------------------------------- |
| `maxTurns`      | No       | `20`    | Maximum conversation turns before the skill stops contributing.  |
| `systemAppend`  | No       | None    | Additional system instructions appended to the skill's prompt.   |
| `rememberUser`  | No       | `false` | When `true`, prompts the model to recall user preferences.       |

```ts
import { ConversationSkill } from "@deskcreate/agentcraft/skills";

agent.use(ConversationSkill.create({
  maxTurns: 10,
  rememberUser: true,
}));
```

## Domain And Creator Skills

Domain skills are backed by `SkillSpec` definitions and accessed through the registry. Use `createSkillByName` for a single skill or `createSkillPackByName` for all skills in a domain.

```ts
import { createSkillByName, createSkillPackByName } from "@deskcreate/agentcraft/skills";

// Single domain skill
agent.use(createSkillByName("blog-writer"));

// All skills in a domain pack
agent.use(createSkillPackByName("marketing"));
agent.use(createSkillPackByName("engineering"));
agent.use(createSkillPackByName("legal"));
```

### Available Domain Pack Names

| Domain name           | Skills | Categories                                                           |
| --------------------- | ------ | -------------------------------------------------------------------- |
| `brand`               | ~10    | Brand voice, brand research, brand content                           |
| `business`            | 30     | Strategy, planning, operations, investments, partnerships, expansion |
| `creator`             | 102    | Blog, YouTube, LinkedIn, TikTok, newsletter, resume, book, and more  |
| `data-analytics`      | 12     | Experiments, metrics, data quality, dashboards                       |
| `engineering`         | 23     | Code review, security, architecture, testing, incident response      |
| `finance`             | 24     | Equity research, portfolio management, financial analysis, reporting |
| `healthcare`          | 11     | Clinical documentation, literature review, health content compliance |
| `legal`               | 12     | Contract review, compliance, policy audits, claims screening         |
| `marketing`           | 20     | SEO, content briefs, campaign copy, email marketing, social ads      |
| `personal-productivity` | 16   | Planning, task management, communication, decision journaling        |
| `product`             | 23     | Discovery, PRD writing, roadmaps, competitive analysis, launch       |
| `sales`               | 23     | Account research, outreach, deal management, proposals, coaching     |
| `support`             | 14     | Ticket handling, KB management, customer success, renewals           |

## Pack Accessor Pattern

Access individual skills from a pack without loading all skills:

| Pattern         | Example                                   | When to use                                             |
| --------------- | ----------------------------------------- | ------------------------------------------------------- |
| Registry lookup | `createSkillByName("blog-writer")`        | Single skill by known ID.                               |
| Pack attachment | `createSkillPackByName("marketing")`      | Load all skills in a domain at once.                    |
| Creator pack    | `CreatorPacks.blog()`                     | Creator skills with cache, memory, and adapter wiring.  |
| Inspection      | `inspectSkillByName("blog-writer")`       | Read capabilities without exposing the prompt.          |

## Custom Skills

Define project-specific skills with `defineSkill`:

```ts
import { defineSkill } from "@deskcreate/agentcraft/skills";

const brandVoiceSkill = defineSkill({
  name: "brand-voice-enforcer",
  directive: "enforce-brand",           // action verb — not the name
  description: "Rewrite content to match the brand voice guidelines.",
  prompt: {
    sections: [
      {
        title: "Brand Voice Mode",
        body: `Rewrite the provided content using these brand voice rules:
- Tone: confident but approachable
- Vocabulary: technical-lite (avoid jargon unless required)
- Sentence length: short to medium
- Never use passive voice for product claims`,
      },
    ],
  },
});

agent.use(brandVoiceSkill);

const response = await agent.run({
  prompt: "/enforce-brand Rewrite this landing page copy for our brand.",
});
```

## Inspecting Activation Results

```ts
const response = await agent.run({
  prompt: "/write-blog Write a post about semantic caching.",
});

const reasons = response.selection?.activationReasons ?? [];
for (const { skill, reason, confidence, matched } of reasons) {
  console.log(
    `${skill}: ${reason} (${confidence}${matched ? ` | matched: "${matched}"` : ""})`
  );
}
// → blog-writer: directive (1.0 | matched: "/write-blog")
```

More detail: [Skills Overview](../skills/overview.md), [Skill Activation](../skills/activation.md), [Domain Skills](../skills/built-in.md), [skill cookbook](../examples-cookbook/skills.md).
