# Creator Skills

AgentCraft creator skills are now platform/category-specific domain skills. Use `createSkillByName(...)` for one skill, or `CreatorPacks.*()` for a full category pack with auto activation.

## Categories

| Category          | Skills                                                                                                                                                        | Used by packs                   |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Strategy/research | `audience-research`, `content-positioning`, `content-brief`, `research-synthesis`, `fact-check`, `competitor-analysis`, `trend-discovery`                     | Default, blog, copy, SEO        |
| SEO               | `seo-strategy`, `seo-audit`, `serp-brief`, `seo-review`                                                                                                       | SEO, publishing, analytics      |
| Creation          | `blog-writer`, `book-writer`, `newsletter-writer`, `copywriter`, `social-writer`, `video-ideation`, `video-scriptwriter`, `creative-direction`, `repurposing` | Blog, book, copy, social, video |
| Review/governance | `editorial-review`, `copy-review`, `claim-risk-review`, `brand-voice`                                                                                         | Most creator packs              |
| Operations        | `publish-qa`, `content-calendar`, `performance-analysis`, `experiment-planner`                                                                                | Publishing, analytics           |

## Usage

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillByName } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
})
  .use(createSkillByName("blog-writer"))
  .use(createSkillByName("blog-fact-check"));

const response = await agent.run({
  prompt: "Write and fact-check a post about TypeScript 5.5.",
});
console.log(response.content);
```

You can also extract a skill from a pack:

```ts
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

const blog = CreatorPacks.blog();
agent.use(blog.blogWriter.create());
console.log(blog.blogWriter.inspect());
```

## Drill Down

- [Built-In Skills Reference](../reference/built-in-skills.md)
- [Creator Packs](./packs.md)
- [Creator Workflows](./workflows.md)
