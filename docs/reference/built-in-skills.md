# Built-In Skills Reference

Skills are normal `.use(...)` attachments. They add reusable behavior, directives, metadata, and sometimes tool dependencies. They do not replace adapters or MCPs: use adapters/MCPs for capability, and skills for behavior.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  ResearchSkill,
  createSkillByName,
} from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
})
  .use(ResearchSkill.create())
  .use(createSkillByName("blog-writer"));

const response = await agent.run({
  prompt: "Research and write a post about agent caching.",
});
console.log(response.content);
```

## Configuration Model

| Config                      | Required              | Default                | Notes                                                                                   |
| --------------------------- | --------------------- | ---------------------- | --------------------------------------------------------------------------------------- |
| `.create()` options         | No for most built-ins | Skill-defined defaults | `ConversationSkill` has options. Creator skills currently use metadata/prompt defaults. |
| `directive`                 | Built in              | Skill-specific         | Enables slash-scoped usage such as `/write` or `/blog-writer`.                          |
| `requires`                  | Built in              | Skill-specific         | Runtime/model capability requirements such as tools, files, vision, audio, or video.    |
| `metadata.requiredAdapters` | Built in              | `[]` unless needed     | Use this to understand what adapters/MCPs make the skill more capable.                  |
| `metadata.sideEffectRisk`   | Built in              | Skill-specific         | Skills do not bypass `ToolPolicy`; side-effecting tools still require policy approval.  |

## General Skills

| Skill             | Import                  | Directive            | Purpose                                     | Typical tools/adapters                     |
| ----------------- | ----------------------- | -------------------- | ------------------------------------------- | ------------------------------------------ |
| Research          | `ResearchSkill`         | `/research`          | Gather and synthesize information.          | Fetch/search adapters, MCP search servers. |
| Deep research     | `DeepResearchSkill`     | `/deep-research`     | Deeper multi-source research.               | Web/search/crawl tools, citation storage.  |
| Writing           | `WritingSkill`          | `/write`             | General writing and drafting.               | Optional filesystem/artifact tools.        |
| Summarize         | `SummarizeSkill`        | `/summarize`         | Summarize long input or retrieved material. | Files, fetch, MCP resources.               |
| Translation       | `TranslationSkill`      | `/translate`         | Translate while preserving meaning/tone.    | Optional memory/glossary tools.            |
| Humanizer         | `HumanizerSkill`        | `/humanizer`         | Improve clarity and naturalness.            | Optional brand voice/context tools.        |
| Code review       | `CodeReviewSkill`       | `/code-review`       | Review code for bugs, risk, and tests.      | Filesystem, GitHub, database read tools.   |
| Data analysis     | `DataAnalysisSkill`     | `/data-analysis`     | Analyze tabular or structured data.         | Database, files, sheets.                   |
| Document analysis | `DocumentAnalysisSkill` | `/document-analysis` | Inspect documents and extracted text.       | Files, storage, fetch.                     |
| Memory            | `MemorySkill`           | `/memory`            | Use or update persistent memory.            | Memory MCP, Redis, creator memory.         |
| Conversation      | `ConversationSkill`     | `/conversation`      | Conversational continuity and tone.         | Optional memory tools.                     |
| Email draft       | `EmailDraftSkill`       | `/email-draft`       | Draft emails without sending by default.    | Email adapter, approval-gated send tools.  |
| Scheduler         | `SchedulerSkill`        | `/scheduler`         | Scheduling and calendar planning.           | Google Calendar, calendar MCP.             |
| Meeting           | `MeetingSkill`          | `/meeting`           | Meeting notes, agendas, follow-ups.         | Calendar, transcription, email.            |
| Vision            | `VisionSkill`           | `/vision`            | Image-aware review or description.          | Vision-capable model, image inputs.        |
| Transcription     | `TranscriptionSkill`    | `/transcription`     | Audio/video transcript handling.            | Audio-capable model or transcript tools.   |

## Domain And Creator Skills

Domain skills are created through the registry: `createSkillByName("blog-writer")`. They are also grouped into [Creator Packs](../creator/packs.md) and industry packs.

| Pattern         | Example                                   | Use when                                                                                  |
| --------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------- |
| Registry lookup | `createSkillByName("blog-writer")`        | You know the exact skill id and want a single skill.                                      |
| Pack accessor   | `CreatorPacks.blog().blogWriter.create()` | You want a direct skill from a pack without memorizing registry calls.                    |
| Pack attachment | `CreatorPacks.blog()`                     | You want category-level auto activation across related skills.                            |
| Inspection      | `inspectSkillByName("blog-writer")`       | You want capabilities, adapters, artifacts, and safety hints without exposing the prompt. |

## Activation Modes

| Mode           | Config                              | Behavior                                                                |
| -------------- | ----------------------------------- | ----------------------------------------------------------------------- |
| Always         | `skillActivation: 'always'`         | Default-compatible: attached skills contribute prompt behavior.         |
| Auto           | `skillActivation: 'auto'`           | Agent selects relevant attached skills from prompt/directives/metadata. |
| Directive only | `skillActivation: 'directive-only'` | Skills activate only when slash directives target them.                 |

Use directives when you want to force a skill. Use `auto` when packs provide many skills and you want the runtime to select a smaller active set.
