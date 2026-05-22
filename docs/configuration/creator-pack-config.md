# Creator Pack Config

Creator packs bundle related skills, adapters, and cache behavior for content workflows. Attach them with `CreatorPacks.packName(config)` or `agent.use(CreatorPacks.blog({ ... }))`. Packs work with any LLM provider — the available functionality depends on which adapters are also attached.

## Available Packs

| Pack                    | Factory                      | Skills included                                                     |
| ----------------------- | ---------------------------- | ------------------------------------------------------------------- |
| Blog                    | `CreatorPacks.blog()`        | Research, write, SEO review, fact-check, publish                    |
| SEO                     | `CreatorPacks.seo()`         | Keyword research, content brief, cluster planning                   |
| Social                  | `CreatorPacks.social()`      | LinkedIn, X/Twitter, Instagram, Facebook, Pinterest posts           |
| Video                   | `CreatorPacks.video()`       | YouTube scripts, TikTok, short-video, description/chapters          |
| Newsletter              | `CreatorPacks.newsletter()`  | Beehiiv/Substack writing, welcome sequences, lead magnets           |
| Book                    | `CreatorPacks.book()`        | Outline, chapter drafts, editing, publishing prep                   |
| Copy                    | `CreatorPacks.copy()`        | Landing page copy, headlines, CTAs, email sequences                 |
| Analytics               | `CreatorPacks.analytics()`   | Content performance analysis, metric snapshots, insights            |
| Publishing              | `CreatorPacks.publishing()`  | Publish workflows with approval-gated publish tools                 |
| Default (all-in-one)    | `CreatorPacks.default()`     | All creator skills — use `skillActivation: "directive-only"`        |

## Shared Config Fields

Every pack accepts the same base config object:

| Option              | Required | Default            | Purpose                                                                |
| ------------------- | -------- | ------------------ | ---------------------------------------------------------------------- |
| `contentRoot`       | No       | Undefined          | Root directory for drafts, briefs, and output artifacts.               |
| `cacheRoot`         | No       | Undefined          | Cache directory for this pack when file cache is in use.               |
| `cache`             | No       | `false`            | `false`, `'auto'`, or `'aggressive'`. Enables semantic cache.          |
| `memory`            | No       | `false`            | Enables creator memory behavior (requires a memory store or adapter).  |
| `skillActivation`   | No       | `'auto'`           | `'always'`, `'auto'`, or `'directive-only'`.                           |
| `toolSelection`     | No       | `'auto'`           | `'auto'` or `'all'`. Controls which tools are offered per run.         |
| `readOnlyByDefault` | No       | `false`            | When `true`, write tools require explicit approval.                    |
| `budget`            | No       | Agent/run default  | Pack-level budget cap applied before run budget.                       |
| `skillOverrides`    | No       | `{}`               | Disable individual skills by ID: `{ "blog-writer": { enabled: false } }`|

## Blog Pack

Research, write, SEO-review, fact-check, and publish blog posts.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";
import { TavilySearchAdapter, FileSystemAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "directive-only",
})
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }))
  .use(FileSystemAdapter.connect({ rootPath: "./content", allowedExtensions: [".md"] }))
  .use(CreatorPacks.blog({
    contentRoot: "./content",
    cache: "auto",
    readOnlyByDefault: true,
  }));

const draft = await agent.run({
  prompt: `/write-blog Write a 1200-word post about TypeScript agent caching.`,
});
```

## SEO Pack

Keyword research, content briefs, and SEO cluster planning.

```ts
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

agent.use(CreatorPacks.seo({
  cache: "auto",
  skillActivation: "directive-only",
}));

const brief = await agent.run({
  prompt: `/brief-seo-content Create an SEO content brief for "TypeScript agent SDK".`,
});
```

## Social Pack

LinkedIn posts, X/Twitter threads, Instagram captions, Facebook posts, Pinterest descriptions.

```ts
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

agent.use(CreatorPacks.social({
  skillActivation: "directive-only",
}));

const post = await agent.run({
  prompt: `/write-linkedin-post Announce our new v2.0 release.
  
Blog summary: [summary here]`,
});
```

## Video Pack

YouTube scripts, TikTok scripts, short-video briefs, video descriptions, chapters, and tags.

```ts
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

agent.use(CreatorPacks.video({
  cache: "auto",
  skillActivation: "directive-only",
}));

const script = await agent.run({
  prompt: `/write-youtube-script Write a 10-minute YouTube script about agent caching.`,
});
```

## Newsletter Pack

Email newsletters, Substack posts, Beehiiv articles, welcome sequences, and lead magnets.

```ts
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

agent.use(CreatorPacks.newsletter({
  contentRoot: "./newsletters",
  cache: "auto",
}));
```

## Publishing Pack

Approval-gated publish workflows. All publish tools require explicit approval.

```ts
import { CreatorPacks } from "@deskcreate/agentcraft/packs";
import { PublishingAdapter } from "@deskcreate/agentcraft/adapters";

agent.use(CreatorPacks.publishing({ readOnlyByDefault: true }))
     .use(PublishingAdapter.connect());
```

## Default Pack (All Skills)

Loads all 102+ creator skills. Use with `skillActivation: "directive-only"` — `auto` mode with this many skills produces unpredictable activation.

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache: AgentCache.file(".agentcraft/cache", { strategy: "auto" }),
  skillActivation: "directive-only",  // required with the default pack
}).use(CreatorPacks.default({
  contentRoot: "./content",
  cache: "auto",
  readOnlyByDefault: true,
}));
```

## Disabling Individual Skills

Use `skillOverrides` to turn off specific skills without replacing the pack:

```ts
agent.use(CreatorPacks.blog({
  contentRoot: "./content",
  skillOverrides: {
    "research-synthesis": { enabled: false },  // disable only this skill
    "blog-fact-check": { enabled: false },
  },
}));
```

## Skill Activation Per Pack

| Strategy            | Config                                | When to use                                                              |
| ------------------- | ------------------------------------- | ------------------------------------------------------------------------ |
| Always              | `skillActivation: 'always'`           | Single-pack agent where all skills should always apply.                  |
| Auto                | `skillActivation: 'auto'`             | Multi-skill pack where runtime should select the right subset per run.   |
| Directive-only      | `skillActivation: 'directive-only'`   | Precise pipelines where you want `/directive` control over every step.  |

See [Creator Packs Overview](../creator/packs.md) for the full per-pack skill listings.

More patterns: [creator cookbook](../examples-cookbook/creator.md).
