# Creator Skills

AgentCraft ships 28 creator skills across strategy, SEO, creation, review, and operations.

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
import { Agent, Provider } from "agentcraft";
import { BlogWriterSkill, FactCheckSkill } from "agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
})
  .use(BlogWriterSkill.create())
  .use(FactCheckSkill.create());

const response = await agent.run({
  prompt: "Write and fact-check a post about TypeScript 5.5.",
});
console.log(response.content);
```

## Drill Down

- [Built-In Skills Reference](../reference/built-in-skills.md)
- [Creator Packs](./packs.md)
- [Creator Workflows](./workflows.md)
