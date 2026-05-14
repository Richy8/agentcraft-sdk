# Built-In Skills Reference

Skills are normal `.use(...)` attachments. They add reusable behavior, directives, metadata, and sometimes tool dependencies. They do not replace adapters or MCPs: use adapters/MCPs for capability, and skills for behavior.

```ts
import { Agent, Provider } from "agentcraft";
import { BlogWriterSkill, ResearchSkill } from "agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
})
  .use(ResearchSkill.create())
  .use(BlogWriterSkill.create());

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

## Creator Skills

All creator skills are exported from `agentcraft/skills`. They are also grouped into [Creator Packs](../creator/packs.md).

| Skill                      | Directive               | Stage      | Produces            | Best paired with                            |
| -------------------------- | ----------------------- | ---------- | ------------------- | ------------------------------------------- |
| `AudienceResearchSkill`    | `/audience-research`    | Context    | `AudienceProfile`   | Search, crawl, creator memory.              |
| `ContentPositioningSkill`  | `/content-positioning`  | Strategy   | `PositioningBrief`  | Competitor research, brand voice.           |
| `ContentBriefSkill`        | `/content-brief`        | Strategy   | `ContentBrief`      | Audience, positioning, SEO.                 |
| `ResearchSynthesisSkill`   | `/research-synthesis`   | Context    | `SourceNote`        | Fetch, Firecrawl, Tavily, citation manager. |
| `FactCheckSkill`           | `/fact-check`           | Review     | `ClaimMap`          | Search, citation manager, source notes.     |
| `CompetitorAnalysisSkill`  | `/competitor-analysis`  | Strategy   | `SerpBrief`         | SERP, crawl, link checker.                  |
| `TrendDiscoverySkill`      | `/trend-discovery`      | Strategy   | `ContentBrief`      | Search, social/listening, analytics.        |
| `SeoStrategySkill`         | `/seo-strategy`         | Strategy   | `SeoPlan`           | SEO adapter, analytics, content corpus.     |
| `SeoAuditSkill`            | `/seo-audit`            | Review     | `EditorialReview`   | Fetch, link checker, SERP.                  |
| `SerpBriefSkill`           | `/serp-brief`           | Strategy   | `SerpBrief`         | SEO adapter, crawl/fetch.                   |
| `SeoReviewSkill`           | `/seo-review`           | Review     | `EditorialReview`   | SEO adapter, link checker.                  |
| `BlogWriterSkill`          | `/blog-writer`          | Creation   | `Draft`             | Briefs, research, brand voice.              |
| `BookWriterSkill`          | `/book-writer`          | Creation   | `Draft`             | Content corpus, memory, outlines.           |
| `NewsletterWriterSkill`    | `/newsletter-writer`    | Creation   | `Draft`             | Brand voice, prior issues.                  |
| `CopywriterSkill`          | `/copywriter`           | Creation   | `Draft`             | Audience research, proof library.           |
| `SocialWriterSkill`        | `/social-writer`        | Creation   | `Draft`             | Repurposing, brand voice.                   |
| `VideoIdeationSkill`       | `/video-ideation`       | Strategy   | `ContentBrief`      | Trends, YouTube/transcript tools.           |
| `VideoScriptwriterSkill`   | `/video-scriptwriter`   | Creation   | `Draft`             | Brief, research, creative direction.        |
| `CreativeDirectionSkill`   | `/creative-direction`   | Creation   | `Draft`             | Asset library, image generation.            |
| `RepurposingSkill`         | `/repurposing`          | Operations | `RepurposingPack`   | Source draft, platform constraints.         |
| `EditorialReviewSkill`     | `/editorial-review`     | Review     | `EditorialReview`   | Draft, brand voice, rubric.                 |
| `CopyReviewSkill`          | `/copy-review`          | Review     | `EditorialReview`   | Draft, audience, offer.                     |
| `ClaimRiskReviewSkill`     | `/claim-risk-review`    | Review     | `EditorialReview`   | Claim map, legal/compliance context.        |
| `BrandVoiceSkill`          | `/brand-voice`          | Context    | `SourceNote`        | Creator memory, corpus examples.            |
| `PublishQaSkill`           | `/publish-qa`           | Operations | `PublishPackage`    | Link checker, SEO review.                   |
| `ContentCalendarSkill`     | `/content-calendar`     | Operations | `ContentCalendar`   | Analytics, publishing, calendar tools.      |
| `PerformanceAnalysisSkill` | `/performance-analysis` | Operations | `PerformanceReport` | Analytics adapter/history.                  |
| `ExperimentPlannerSkill`   | `/experiment-planner`   | Operations | `ExperimentPlan`    | Performance reports, calendar.              |

## Activation Modes

| Mode           | Config                              | Behavior                                                                |
| -------------- | ----------------------------------- | ----------------------------------------------------------------------- |
| Always         | `skillActivation: 'always'`         | Default-compatible: attached skills contribute prompt behavior.         |
| Auto           | `skillActivation: 'auto'`           | Agent selects relevant attached skills from prompt/directives/metadata. |
| Directive only | `skillActivation: 'directive-only'` | Skills activate only when slash directives target them.                 |

Use directives when you want to force a skill. Use `auto` when packs provide many skills and you want the runtime to select a smaller active set.
