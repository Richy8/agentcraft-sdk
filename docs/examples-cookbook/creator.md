# Creator Examples

Creator examples combine packs, direct skills, tools, memory, cache, and review passes to build full content pipelines.

## Blog Post Pipeline (Research → Write → SEO Review)

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";
import { TavilySearchAdapter, FileSystemAdapter } from "@deskcreate/agentcraft/adapters";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  cache: AgentCache.file("./.agentcraft/cache", { strategy: "auto" }),
  skillActivation: "directive-only",
})
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }))
  .use(FileSystemAdapter.connect({ rootPath: "./content", allowedExtensions: [".md"] }))
  .use(createSkillPackByName("creator"));

// Research
const research = await agent.run({
  prompt: `/research-blog-evidence Research evidence for: "Why TypeScript agent frameworks outperform Python alternatives for production use cases"`,
});

// Write
const draft = await agent.run({
  prompt: `/write-blog Write a 1500-word blog post based on this research.
  
Evidence: ${research.content}`,
});

// SEO review
const seoReview = await agent.run({
  prompt: `/review-blog-seo Review this draft for search intent and information gain.
  
Draft: ${draft.content}`,
});

console.log(seoReview.content);
```

## Medium Blog Workflow (Creator Pack)

```ts
import { Agent, AgentCache, Provider } from "@deskcreate/agentcraft";
import {
  FirecrawlAdapter,
  FileSystemAdapter,
} from "@deskcreate/agentcraft/adapters";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  cache: AgentCache.file("./.agentcraft/cache", { strategy: "auto" }),
})
  .use(FirecrawlAdapter.connect({ apiKey: process.env.FIRECRAWL_API_KEY! }))
  .use(FileSystemAdapter.connect({
    rootPath: "./content",
    allowedExtensions: [".md"],
  }))
  .use(CreatorPacks.medium({ contentRoot: "./content", cache: "auto" }));

const response = await agent.run({
  prompt: "/write-medium-article Write a Medium article about testing agent workflows in production.",
});
console.log(response.content);
```

## LinkedIn + Newsletter Cross-Post

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "directive-only",
}).use(createSkillPackByName("creator"));

const blogPost = `[existing 1500-word blog post content]`;

// LinkedIn adaptation
const linkedIn = await agent.run({
  prompt: `/write-linkedin-post Write a LinkedIn post promoting this blog.
  
Blog summary: ${blogPost.slice(0, 400)}`,
});

// Newsletter section
const newsletterSection = await agent.run({
  prompt: `/write-newsletter Write a newsletter section featuring this post as the lead story.
  
Blog: ${blogPost.slice(0, 600)}`,
});

console.log("LinkedIn:", linkedIn.content);
console.log("Newsletter:", newsletterSection.content);
```

## YouTube Script + Description + Chapters

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";

const videoAgent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "directive-only",
}).use(createSkillPackByName("creator"));

// Research topic first
const topicResearch = await videoAgent.run({
  prompt: `/research-youtube-topic Research YouTube topics about TypeScript agent frameworks.
  Focus: search demand, viewer intent, packaging angles.`,
});

// Title + thumbnail in one call
const titleThumbnail = await videoAgent.run({
  prompt: `/brief-youtube-title-thumbnail Create a title and thumbnail brief for a 10-minute video.
  
Topic research: ${topicResearch.content}`,
});

// Write the script
const script = await videoAgent.run({
  prompt: `/write-youtube-script Write a 10-minute YouTube script.
  
Title/thumbnail brief: ${titleThumbnail.content}`,
});

// Write description and chapters
const descriptionAndChapters = await videoAgent.run({
  prompt: `/write-youtube-description-tags Write the YouTube description, tags, and video chapters.
  
Script: ${script.content}`,
});

console.log(descriptionAndChapters.content);
```

## Resume and Cover Letter Pipeline

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";

const resumeAgent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "directive-only",
}).use(createSkillPackByName("creator"));

const jobDescription = `Staff Software Engineer at Stripe. Requirements: 8+ years TypeScript...`;
const existingResume = `[resume content]`;

// Research the role
const roleResearch = await resumeAgent.run({
  prompt: `/research-resume-role Research this Staff Engineer role at Stripe.
  
JD: ${jobDescription}`,
});

// Tailor the resume
const tailoredResume = await resumeAgent.run({
  prompt: `/tailor-resume Tailor this resume for the role.
  
Existing resume: ${existingResume}
Role research: ${roleResearch.content}`,
});

// Check ATS compatibility
const atsCheck = await resumeAgent.run({
  prompt: `/review-resume-ats Review for ATS readability and keyword coverage.
  
Resume: ${tailoredResume.content}`,
});

// Write cover letter
const coverLetter = await resumeAgent.run({
  prompt: `/write-cover-letter Write a cover letter for Staff Engineer at Stripe.
  
Resume: ${tailoredResume.content}
Role research: ${roleResearch.content}`,
});

console.log("Cover letter:", coverLetter.content);
console.log("ATS review:", atsCheck.content);
```

## Review Before Publish

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { CreatorPacks, MarketingPacks } from "@deskcreate/agentcraft/packs";
import { createSkillByName } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(CreatorPacks.blog({ readOnlyByDefault: true }))
  .use(MarketingPacks.campaign({ readOnlyByDefault: true }))
  .use(createSkillByName("blog-fact-check"));

const response = await agent.run({
  prompt: "/fact-check-blog Review this draft for citations, unsupported claims, SEO readiness, and launch blockers.",
});
console.log(response.content);
```

More detail: [Creator Packs](../creator/packs.md), [Creator Skills](../creator/skills.md), [Creator Domain Skills](../skills/domains/creator.md).
