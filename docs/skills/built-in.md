# Built-In Skills

Built-in skills are imported from `agentcraft/skills` and attached with `.use(...)`. They shape the agent's prompt behavior, declare useful capabilities, and expose slash directives when you want to force a specific skill.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { ResearchSkill, WritingSkill } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
})
  .use(ResearchSkill.create())
  .use(WritingSkill.create());

const response = await agent.run({
  prompt: "Research this topic, then write a clear executive summary.",
});
console.log(response.content);
```

## General Skills

### ResearchSkill

Import `ResearchSkill` when the agent should gather, compare, and synthesize information before answering. Directive: `/research`.

Useful tools: [`fetch_url`](../adapters/built-in.md#fetchadapter), [`web_search`](../adapters/built-in.md#tavilysearchadapter), [`search_web`](../adapters/built-in.md#firecrawladapter), [search MCP wrappers](../mcp/built-in.md#search-and-web-mcps).

```ts
import { ResearchSkill } from "@deskcreate/agentcraft/skills";
import {
  FetchAdapter,
  TavilySearchAdapter,
} from "@deskcreate/agentcraft/adapters";

agent
  .use(FetchAdapter.connect({ allowedDomains: ["developer.mozilla.org"] }))
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }))
  .use(ResearchSkill.create());
```

### DeepResearchSkill

Import `DeepResearchSkill` for multi-source research where the agent should compare sources, preserve caveats, and produce a more defensible answer. Directive: `/deep-research`.

Useful tools: [`scrape_url`](../adapters/built-in.md#firecrawladapter), [`crawl_site`](../adapters/built-in.md#firecrawladapter), [`save_citation`](../adapters/built-in.md#citationmanageradapter), [`read_citation`](../adapters/built-in.md#citationmanageradapter).

```ts
agent
  .use(FirecrawlAdapter.connect({ apiKey: process.env.FIRECRAWL_API_KEY! }))
  .use(CitationManagerAdapter.connect({ root: "content/citations" }))
  .use(DeepResearchSkill.create());
```

### WritingSkill

Import `WritingSkill` for general drafting, rewriting, and composition. Directive: `/write`.

Useful tools: [`read_file`](../adapters/built-in.md#filesystemadapter), [`write_file`](../adapters/built-in.md#filesystemadapter), [`read_brand_voice`](../adapters/built-in.md#creatorresourcesadapter).

```ts
agent.use(WritingSkill.create());

await agent.run({
  prompt: "/write Turn these notes into a concise launch update.",
});
```

### SummarizeSkill

Import `SummarizeSkill` for compact summaries, briefs, minutes, and takeaways. Directive: `/summarize`.

Useful tools: [`fetch_url`](../adapters/built-in.md#fetchadapter), [`read_file`](../adapters/built-in.md#filesystemadapter), [`get_page_content`](../adapters/built-in.md#tavilysearchadapter).

```ts
agent.use(SummarizeSkill.create());
```

### TranslationSkill

Import `TranslationSkill` when preserving meaning, tone, and terminology matters. Directive: `/translate`.

Useful tools: [`read_brand_voice`](../adapters/built-in.md#creatorresourcesadapter), [`search_content_corpus`](../adapters/built-in.md#creatorresourcesadapter), memory tools through [MemoryMCP](../mcp/built-in.md#memory-and-filesystem-mcps).

```ts
agent.use(TranslationSkill.create());
```

### HumanizerSkill

Import `HumanizerSkill` to improve clarity, flow, and naturalness without changing the underlying meaning. Directive: `/humanizer`.

Useful tools: [`read_brand_voice`](../adapters/built-in.md#creatorresourcesadapter), [`search_content_corpus`](../adapters/built-in.md#creatorresourcesadapter).

```ts
agent.use(HumanizerSkill.create());
```

### CodeReviewSkill

Import `CodeReviewSkill` for review-style output focused on bugs, regressions, risks, and tests. Directive: `/code-review`.

Useful tools: [`read_file`](../adapters/built-in.md#filesystemadapter), [`search_files`](../adapters/built-in.md#filesystemadapter), [`get_file_content`](../adapters/built-in.md#githubadapter), [`list_prs`](../adapters/built-in.md#githubadapter).

```ts
agent
  .use(FileSystemAdapter.connect({ rootPath: "./src", readOnly: true }))
  .use(CodeReviewSkill.create());
```

### DataAnalysisSkill

Import `DataAnalysisSkill` for tabular, database, and metric analysis. Directive: `/data-analysis`.

Useful tools: [`execute_query`](../adapters/built-in.md#databaseadapter), [`fetch_records`](../adapters/built-in.md#databaseadapter), [`read_range`](../adapters/built-in.md#googlesheetsadapter), [`read_content_metrics`](../adapters/built-in.md#analyticsadapter).

```ts
agent.use(DataAnalysisSkill.create());
```

### DocumentAnalysisSkill

Import `DocumentAnalysisSkill` when the agent needs to inspect documents, extracted text, or stored files. Directive: `/document-analysis`.

Useful tools: [`read_file`](../adapters/built-in.md#filesystemadapter), [`download_file`](../adapters/built-in.md#storageadapter), [`fetch_url`](../adapters/built-in.md#fetchadapter).

```ts
agent.use(DocumentAnalysisSkill.create());
```

### MemorySkill And ConversationSkill

Import `MemorySkill` for durable recall and `ConversationSkill` for conversational continuity. Directives: `/memory`, `/conversation`.

Useful tools: [`get_value`](../adapters/built-in.md#redisadapter), [`set_value`](../adapters/built-in.md#redisadapter), [MemoryMCP](../mcp/built-in.md#memory-and-filesystem-mcps), [Creator Memory Store](../persistence/creator-memory-store.md).

```ts
agent.use(MemorySkill.create()).use(ConversationSkill.create());
```

### EmailDraftSkill, SchedulerSkill, MeetingSkill

Use these operational skills for emails, calendars, agendas, notes, and follow-ups. Directives: `/email-draft`, `/scheduler`, `/meeting`.

Useful tools: [`send_email`](../adapters/built-in.md#emailadapter), [`list_events`](../adapters/built-in.md#googlecalendaradapter), [`find_free_slots`](../adapters/built-in.md#googlecalendaradapter), [`send_message`](../adapters/built-in.md#slackadapter).

```ts
agent
  .use(
    GoogleCalendarAdapter.connect({
      accessToken: process.env.GOOGLE_ACCESS_TOKEN!,
    }),
  )
  .use(SchedulerSkill.create());
```

### VisionSkill And TranscriptionSkill

Use `VisionSkill` for image-aware prompts and `TranscriptionSkill` for audio/video transcript workflows. Directives: `/vision`, `/transcription`.

Useful tools: vision-capable model inputs, [`text_to_speech`](../adapters/built-in.md#elevenlabsadapter), [ElevenLabsMCP](../mcp/built-in.md#media-and-design-mcps).

```ts
agent.use(VisionSkill.create()).use(TranscriptionSkill.create());
```

## Creator Skills

Creator skills are also imported from `agentcraft/skills`. They can be used directly or through [Creator Packs](../creator/packs.md).

### Research And Strategy Skills

Use `AudienceResearchSkill`, `ContentPositioningSkill`, `ContentBriefSkill`, `ResearchSynthesisSkill`, `CompetitorAnalysisSkill`, and `TrendDiscoverySkill` to understand the reader, choose an angle, produce a brief, and synthesize sources.

Useful tools: [`web_search`](../adapters/built-in.md#tavilysearchadapter), [`scrape_url`](../adapters/built-in.md#firecrawladapter), [`read_brand_voice`](../adapters/built-in.md#creatorresourcesadapter), [`save_citation`](../adapters/built-in.md#citationmanageradapter).

```ts
agent
  .use(AudienceResearchSkill.create())
  .use(ContentPositioningSkill.create())
  .use(ContentBriefSkill.create());
```

### SEO Skills

Use `SeoStrategySkill`, `SerpBriefSkill`, `SeoAuditSkill`, and `SeoReviewSkill` for keyword strategy, SERP briefs, page audits, and pre-publish review.

Useful tools: [`get_serp_results`](../adapters/built-in.md#seoadapter), [`get_keyword_metrics`](../adapters/built-in.md#seoadapter), [`check_link`](../adapters/built-in.md#linkcheckeradapter), [`browse_url`](../adapters/built-in.md#playwrightadapter).

```ts
agent
  .use(SeoAdapter.connect())
  .use(SeoStrategySkill.create())
  .use(SerpBriefSkill.create());
```

### Writing And Media Skills

Use `BlogWriterSkill`, `BookWriterSkill`, `NewsletterWriterSkill`, `CopywriterSkill`, `SocialWriterSkill`, `VideoIdeationSkill`, `VideoScriptwriterSkill`, and `CreativeDirectionSkill` to create channel-specific assets.

Useful tools: [`write_file`](../adapters/built-in.md#filesystemadapter), [`list_creator_assets`](../adapters/built-in.md#creatorresourcesadapter), [`generate_image`](../adapters/built-in.md#imagegenerationadapter), [`text_to_speech`](../adapters/built-in.md#elevenlabsadapter).

```ts
agent
  .use(BlogWriterSkill.create())
  .use(BrandVoiceSkill.create())
  .use(EditorialReviewSkill.create());
```

### Review And Risk Skills

Use `FactCheckSkill`, `EditorialReviewSkill`, `CopyReviewSkill`, `ClaimRiskReviewSkill`, and `PublishQaSkill` before publishing or sending externally.

Useful tools: [`read_citation`](../adapters/built-in.md#citationmanageradapter), [`check_link`](../adapters/built-in.md#linkcheckeradapter), [`fetch_url`](../adapters/built-in.md#fetchadapter), [`extract_text`](../adapters/built-in.md#playwrightadapter).

```ts
await agent.run({
  prompt:
    "/publish-qa Review this draft for unsupported claims, broken links, and metadata gaps.",
});
```

### Operations And Analytics Skills

Use `RepurposingSkill`, `ContentCalendarSkill`, `PerformanceAnalysisSkill`, and `ExperimentPlannerSkill` to turn finished work into assets, calendars, reports, and experiments.

Useful tools: [`create_publish_draft`](../adapters/built-in.md#publishingadapter), [`read_content_metrics`](../adapters/built-in.md#analyticsadapter), [`append_row`](../adapters/built-in.md#googlesheetsadapter), [`create_page`](../adapters/built-in.md#notionadapter).

```ts
agent
  .use(CreatorPacks.analytics({ memory: true }))
  .use(ExperimentPlannerSkill.create());
```

## Activation

Use `skillActivation: 'auto'` when attaching several skills or packs. Use a directive like `/fact-check` when a specific skill must run. Use `directive-only` when you want skills to stay silent unless explicitly requested.

```ts
const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
});
```

More examples: [Skill Activation](./activation.md), [Directives](./directives.md), [Skills Cookbook](../examples-cookbook/skills.md).
