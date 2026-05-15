# Creator Packs

Creator packs are `.use(...)` bundles over creator skills. They are imported from `agentcraft/packs`, and every skill inside a pack remains directly importable from `agentcraft/skills`.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";
import { BrandVoiceSkill } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
  toolSelection: "auto",
})
  .use(CreatorPacks.blog({ contentRoot: "content", readOnlyByDefault: true }))
  .use(BrandVoiceSkill.create());

const response = await agent.run({
  prompt: "Draft a blog post about agent caching strategies.",
});
console.log(response.content);
```

## Available Packs

### Default Pack

Use [Default Pack](./packs/default.md) for a safe starter writing flow. It includes `AudienceResearchSkill`, `ContentPositioningSkill`, `ContentBriefSkill`, `BlogWriterSkill`, and `EditorialReviewSkill`.

### Blog Pack

Use [Blog Pack](./packs/blog.md) for Medium-style and blog article workflows. It includes research, positioning, briefing, synthesis, drafting, editing, and fact checking.

### SEO Pack

Use [SEO Pack](./packs/seo.md) for keyword strategy, SERP planning, and evidence-aware SEO briefs. It pairs naturally with [`SeoAdapter`](../adapters/built-in.md#seoadapter), [`TavilySearchAdapter`](../adapters/built-in.md#tavilysearchadapter), and [`FirecrawlAdapter`](../adapters/built-in.md#firecrawladapter).

### Social Pack

Use [Social Pack](./packs/social.md) for social posts, repurposing, voice consistency, and copy review.

### Video Pack

Use [Video Pack](./packs/video.md) for video ideation, scriptwriting, creative direction, and repurposed short assets.

### Book Pack

Use [Book Pack](./packs/book.md) for chapters, longform continuity, research synthesis, editorial review, and brand voice.

### Copy Pack

Use [Copy Pack](./packs/copy.md) for landing pages, ads, launch copy, email copy, conversion review, and claim risk review.

### Publishing Pack

Use [Publishing Pack](./packs/publishing.md) for publish QA, content calendars, SEO review, and final claim risk checks.

### Analytics Pack

Use [Analytics Pack](./packs/analytics.md) for performance analysis, experiment planning, SEO learning, and future content calendars.

## Shared Config

`contentRoot` points the pack at a content workspace. It is optional and defaults to no preferred root.

`cacheRoot` is an optional cache storage preference for workflows that coordinate with [AgentCache](../persistence/agent-cache.md).

`readOnlyByDefault` is optional. Use `true` for review and QA workflows where write-capable tools should remain approval-bound.

`memory` is optional. Use `true` or `{ filePath }` when creator memory is configured through [Creator Memory Store](../persistence/creator-memory-store.md).

`cache` is optional. Use `false`, `auto`, or `aggressive` depending on how much context reuse is safe for the workflow.

`skillActivation` is optional. Use `auto` for normal pack usage, `always` when pack instructions should always contribute, or `directive-only` when slash directives should be required.

`toolSelection` is optional. Use `auto` for normal behavior or `all` when every attached tool should be exposed.

`budget` is optional and accepts the same run budget shape described in [Run Config](../configuration/run-config.md).

## Copy-Ready Patterns

Use several packs together:

```ts
agent
  .use(CreatorPacks.seo())
  .use(CreatorPacks.blog())
  .use(CreatorPacks.publishing({ readOnlyByDefault: true }));
```

Use a pack plus one direct skill:

```ts
agent.use(CreatorPacks.social()).use(ClaimRiskReviewSkill.create());
```

Use a pack with cache and memory:

```ts
agent.use(
  CreatorPacks.book({
    contentRoot: "./book",
    memory: true,
    cache: "auto",
  }),
);
```

More variants live in [Creator Examples](../examples-cookbook/creator.md).
