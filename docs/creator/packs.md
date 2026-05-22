# Creator Packs

Creator packs are `.use(...)` bundles over platform-specific creator skills. They are imported from `@deskcreate/agentcraft/packs`. Every skill inside a pack can also be used directly through `createSkillByName(...)` or through the pack's generated skill accessors.

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
  .use(createSkillByName("blog-writer"));

const response = await agent.run({
  prompt: "/write-blog Draft a blog post about agent caching strategies.",
});
console.log(response.content);
```

## Available Creator Packs

| Pack | Best For | Representative Skills |
| --- | --- | --- |
| `CreatorPacks.blog()` | Owned-media articles, evergreen posts, source-backed longform | `blog-topic-research`, `blog-brief`, `blog-writer`, `blog-fact-check` |
| `CreatorPacks.medium()` | Medium-native essays and publication-fit articles | `medium-story-angle`, `medium-article-writer`, `medium-publication-fit-review` |
| `CreatorPacks.linkedin()` | LinkedIn posts, carousels, calendars, and performance review | `linkedin-ideation`, `linkedin-post-writer`, `linkedin-hook-review` |
| `CreatorPacks.youtube()` | YouTube topics, scripts, thumbnails, retention, chapters, descriptions | `youtube-topic-research`, `youtube-scriptwriter`, `youtube-retention-review` |
| `CreatorPacks.tiktok()` | TikTok hooks, scripts, trends, shot lists, safety review | `tiktok-trend-research`, `tiktok-scriptwriter`, `tiktok-retention-review` |
| `CreatorPacks.xTwitter()` | X posts, threads, community replies, trend risk | `x-post-writer`, `x-thread-writer`, `x-trend-risk-review` |
| `CreatorPacks.instagram()` | Captions, reels, carousels, hashtags, visual direction | `instagram-caption-writer`, `instagram-reel-scriptwriter`, `instagram-visual-direction` |
| `CreatorPacks.facebook()` | Facebook posts, group content, event copy, audience targeting | `facebook-post-writer`, `facebook-group-content`, `facebook-event-brief` |
| `CreatorPacks.pinterest()` | Pins, board strategy, seasonal planning, product descriptions | `pinterest-pin-writer`, `pinterest-board-strategy`, `pinterest-seasonal-planner` |
| `CreatorPacks.snapchat()` | Snap stories, AR filter briefs, spotlight scripts | `snapchat-story-writer`, `snapchat-spotlight-brief`, `snapchat-ar-filter-brief` |
| `CreatorPacks.shortVideo()` | Platform-agnostic short-form video: hooks, scripts, shot lists | `short-video-hook-writer`, `short-video-scriptwriter`, `short-video-shot-list` |
| `CreatorPacks.podcast()` | Episode planning, show notes, guest briefs, transcript summaries | `podcast-episode-planner`, `podcast-show-notes-writer`, `podcast-guest-brief` |
| `CreatorPacks.newsletter()` | Issue planning, recurring voice, subject lines, sponsorship review | `newsletter-issue-planner`, `newsletter-writer`, `newsletter-subject-line-review` |
| `CreatorPacks.substack()` | Substack-native posts, paid vs free splits, community threads | `substack-post-writer`, `substack-paid-free-brief`, `substack-community-thread` |
| `CreatorPacks.book()` | Book positioning, outlines, chapters, continuity, development edits | `book-outline-writer`, `book-chapter-writer`, `book-continuity-review` |
| `CreatorPacks.course()` | Course outlines, lesson plans, curriculum structure, quiz briefs | `course-curriculum-planner`, `course-lesson-writer`, `course-quiz-brief` |
| `CreatorPacks.webinar()` | Webinar scripts, slide briefs, live Q&A prep, follow-up sequences | `webinar-script-writer`, `webinar-slide-brief`, `webinar-followup-sequence` |
| `CreatorPacks.resume()` | Role research, resume writing, ATS review, cover letters, profiles | `resume-role-research`, `resume-writer`, `resume-ats-review` |

For SEO, ads, email, landing pages, campaigns, analytics, and competitor intelligence, use the marketing packs instead:

```ts
import { MarketingPacks } from "@deskcreate/agentcraft/packs";

agent.use(MarketingPacks.seo()).use(MarketingPacks.digitalMarketing());
```

## Full Category Skill Packs

The `CreatorPacks.*()` helpers are category-level packs. The same packs are also available through the generic registry using `<domain>-<category>-skills`.

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

Use this registry pattern for full platform coverage such as `creator-linkedin-skills`, `creator-tiktok-skills`, `creator-medium-skills`, `creator-newsletter-skills`, `creator-substack-skills`, `creator-podcast-skills`, `creator-short-video-skills`, `creator-course-skills`, `creator-webinar-skills`, and `creator-resume-skills`.

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

Use creator and marketing packs together:

```ts
import { CreatorPacks, MarketingPacks } from "@deskcreate/agentcraft/packs";

agent
  .use(MarketingPacks.seo())
  .use(CreatorPacks.blog())
  .use(MarketingPacks.landingPage({ readOnlyByDefault: true }));
```

Use a pack plus one direct skill:

```ts
agent
  .use(CreatorPacks.linkedin())
  .use(createSkillByName("landing-page-claim-risk-review"));
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

### Blog Pack

Best trigger terms: `blog`, `article`, `longform`, `brief`, `research`, `source-backed`, `fact-check`.

Primary skills: `blog-topic-research`, `blog-research`, `blog-serp-research`, `blog-brief`, `blog-writer`, `blog-seo-review`, `blog-fact-check`, `blog-citation`, and `blog-refresh-review`.

Recommended config:

```ts
const response = await agent.run({
  prompt:
    "/write-blog Create a source-backed article about durable agent caching.",
  use: CreatorPacks.blog({ cache: "auto", readOnlyByDefault: true }),
  promptCompression: "balanced",
  budget: { mode: "prefer-cache", maxToolCalls: 4 },
});
```

### Medium Pack

Best trigger terms: `medium`, `publication`, `essay`, `story angle`, `subtitle`, `member read`.

Use this pack when the surface is explicitly Medium rather than a generic blog:

```ts
const response = await agent.run({
  prompt:
    "/write-medium-article Draft a Medium-native essay on AI agent reliability.",
  use: CreatorPacks.medium({ readOnlyByDefault: true }),
});
```

### LinkedIn Pack

Best trigger terms: `linkedin`, `post`, `carousel`, `hook`, `founder voice`, `calendar`, `performance review`.

Primary skills: `linkedin-audience-research`, `linkedin-ideation`, `linkedin-post-writer`, `linkedin-carousel-brief`, `linkedin-hook-review`, `linkedin-calendar`, and `linkedin-performance-review`.

### YouTube And Short Video Packs

Best trigger terms: `youtube`, `title`, `thumbnail`, `retention`, `chapters`, `shorts`, `shot list`, `hook`, `reel`, `tiktok`.

Use `CreatorPacks.youtube()` for YouTube-native videos, `CreatorPacks.shortVideo()` for platform-agnostic shorts, and platform packs such as `CreatorPacks.tiktok()` or `CreatorPacks.instagram()` when the platform mechanics matter.

### Newsletter And Book Packs

Best trigger terms: `newsletter`, `issue`, `subject line`, `sponsor`, `book`, `chapter`, `manuscript`, `continuity`.

Use `CreatorPacks.newsletter()` for recurring issues and `CreatorPacks.book()` for longform manuscript work.

### Resume Pack

Best trigger terms: `resume`, `ATS`, `cover letter`, `role research`, `LinkedIn profile`, `tailor`.

Use `CreatorPacks.resume()` when the output needs hiring-market positioning rather than general writing.
