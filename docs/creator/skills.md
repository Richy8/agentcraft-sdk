# Creator Skills

AgentCraft creator skills are now platform/category-specific domain skills. Use `createSkillByName(...)` for one skill, or `CreatorPacks.*()` for a full category pack with auto activation.

## Categories

Creator skills are no longer one flat creator catalog. Each platform or routine has its own category pack, and each skill carries platform-specific domain intelligence.

| Category | Skills | Typical directives |
| --- | --- | --- |
| Blog | `blog-topic-research`, `blog-research`, `blog-serp-research`, `blog-brief`, `blog-writer`, `blog-seo-review`, `blog-fact-check`, `blog-citation`, `blog-refresh-review` | `/research-blog-topics`, `/research-blog-evidence`, `/research-blog-serp`, `/brief-blog`, `/write-blog`, `/review-blog-seo`, `/fact-check-blog`, `/review-blog-refresh` |
| Medium | `medium-audience-research`, `medium-story-angle`, `medium-article-writer`, `medium-title-subtitle-review`, `medium-publication-fit-review` | `/research-medium-audience`, `/write-medium-article`, `/review-medium-title` |
| LinkedIn | `linkedin-audience-research`, `linkedin-ideation`, `linkedin-post-writer`, `linkedin-carousel-brief`, `linkedin-hook-review`, `linkedin-calendar`, `linkedin-performance-review` | `/research-linkedin-audience`, `/write-linkedin-post` |
| YouTube | `youtube-topic-research`, `youtube-title-thumbnail-brief`, `youtube-scriptwriter`, `youtube-retention-review`, `youtube-chapters-brief`, `youtube-description-tags` | `/research-youtube-topics`, `/write-youtube-script` |
| Newsletter | `newsletter-issue-planner`, `newsletter-writer`, `newsletter-subject-line-review` | `/plan-newsletter-issue`, `/write-newsletter` |
| Book / Course / Resume | `book-outline-writer`, `book-chapter-writer`, `book-continuity-review`, `course-curriculum-planner`, `course-lesson-writer`, `resume-writer`, `resume-ats-review`, `cover-letter-writer` | `/write-book-outline`, `/write-book-chapter`, `/review-resume-ats` |

## Usage

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillByName } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
})
  .use(createSkillByName("blog-brief"))
  .use(createSkillByName("blog-writer"));

const response = await agent.run({
  prompt:
    "/write-blog Write a practical post about TypeScript 5.5 migration risk.",
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
