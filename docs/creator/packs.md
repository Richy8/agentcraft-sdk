# Creator Packs

Creator packs are `.use(...)` bundles over creator skills. They are imported from `@deskcreate/agentcraft/packs`. Every skill inside a pack can also be used directly through `createSkillByName(...)` or through the pack's generated skill accessors.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";
import { createSkillByName } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
  toolSelection: "auto",
})
  .use(CreatorPacks.blog({ contentRoot: "content", readOnlyByDefault: true }))
  .use(createSkillByName("brand-voice"));

const response = await agent.run({
  prompt: "Draft a blog post about agent caching strategies.",
});
console.log(response.content);
```

## Available Packs

### Default Pack

Use [Default Pack](./packs/default.md) for a safe starter writing flow. It includes audience research, positioning, briefing, blog drafting, and editorial review skills.

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

## Full Category Skill Packs

The `CreatorPacks.*()` helpers are curated workflows. If you want every skill in a creator category, use the category-level skill packs instead. They are named `<domain>-<category>-skills`.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
  toolSelection: "auto",
}).use(createSkillPackByName("creator-youtube-skills"));

const response = await agent.run({
  prompt:
    "Plan a YouTube video from topic research through title, thumbnail, retention, chapters, and description tags.",
});
```

Use this pattern for full platform coverage such as `creator-linkedin-skills`, `creator-tiktok-skills`, `creator-medium-skills`, `creator-newsletter-skills`, and `creator-resume-skills`.

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
agent.use(CreatorPacks.social()).use(createSkillByName("claim-risk-review"));
```

Extract one skill from a pack:

```ts
const blog = CreatorPacks.blog();

agent.use(blog.blogWriter.create());
console.log(blog.blogWriter.inspect());
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

## Activation Matrix

Use this matrix when deciding whether a pack should be attached globally, per run, or directive-only.

### Default Pack

Best trigger terms: `audience`, `positioning`, `brief`, `blog`, `article`, `editorial review`.

Primary skills: `audience-research`, `content-positioning`, `content-brief`, `blog-writer`, and `editorial-review`.

Recommended config:

```ts
const response = await agent.run({
  prompt: "Turn this idea into a useful article direction.",
  use: CreatorPacks.default({ readOnlyByDefault: true }),
  skillActivation: "auto",
});
```

### Blog Pack

Best trigger terms: `blog`, `article`, `medium`, `draft`, `longform`, `brief`, `research`, `fact-check`.

Primary skills: `blog-topic-research`, `blog-serp-research`, `blog-brief`, `blog-writer`, `blog-seo-review`, `blog-fact-check`, `blog-citation`, and `blog-refresh-review`.

Recommended config:

```ts
const response = await agent.run({
  prompt: "Create a Medium article plan about durable agent caching.",
  use: CreatorPacks.blog({ cache: "auto", readOnlyByDefault: true }),
  promptCompression: "balanced",
  budget: { mode: "prefer-cache", maxToolCalls: 4 },
});
```

### Publishing Pack

Best trigger terms: `publish`, `publishing`, `preflight`, `qa`, `calendar`, `schedule`, `claim risk`.

Use `directive-only` or run-level `use` when write-capable publishing tools are attached. Publishing skills can prepare packages and check readiness, but publishing or scheduling should remain approval-bound through [Tool Policy](../tools/tool-policy.md).

### Analytics Pack

Best trigger terms: `performance`, `analytics`, `metrics`, `experiment`, `hypothesis`, `calendar`.

Analytics works best with a bounded budget and read-only adapters:

```ts
const response = await agent.run({
  prompt: "Review last month performance and propose one experiment.",
  use: CreatorPacks.analytics({ readOnlyByDefault: true }),
  budget: { mode: "fail-closed", maxToolCalls: 3, maxCost: 0.05 },
});
```

### SEO Pack

Best trigger terms: `seo`, `keyword`, `search intent`, `serp`, `ranking`, `metadata`, `slug`.

Primary skills: `seo-keyword-research`, `seo-serp-analysis`, `seo-content-brief`, `seo-technical-audit`, `seo-internal-link-planner`, and `seo-content-refresh-review`.

Use with [`SeoAdapter`](../adapters/built-in.md#seoadapter), [`TavilySearchAdapter`](../adapters/built-in.md#tavilysearchadapter), or [`FirecrawlAdapter`](../adapters/built-in.md#firecrawladapter) when live SERP or page inspection is needed.

### Social Pack

Best trigger terms: `social`, `linkedin`, `x post`, `tweet`, `caption`, `repurpose`, `brand voice`, `copy review`.

Primary skills: platform-native post, thread, caption, hook review, engagement, and brand-safety skills from the social creator categories.

```ts
const response = await agent.run({
  prompt: "Turn this draft into three LinkedIn variants.",
  use: CreatorPacks.social({ readOnlyByDefault: true }),
  promptCompression: "safe",
});
```

### Video Pack

Best trigger terms: `video`, `script`, `youtube`, `voiceover`, `video idea`, `creative direction`, `shorts`.

Primary skills: YouTube, TikTok, short-video, Snapchat, and repurposing skills for topic research, scripting, shot planning, retention review, and platform adaptation.

### Book Pack

Best trigger terms: `book`, `chapter`, `manuscript`, `continuity`, `brand voice`, `research synthesis`.

Primary skills: `book-positioning`, `book-outline-writer`, `book-chapter-writer`, `book-continuity-review`, `book-developmental-edit`, and `book-citation-review`.

### Copy Pack

Best trigger terms: `copy`, `copywriting`, `landing page`, `conversion`, `offer review`, `claim risk`.

Primary skills: landing-page, ads, campaign, email, positioning, and claim-risk skills from creator and marketing packs.
