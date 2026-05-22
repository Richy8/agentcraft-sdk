# Content & Creator Domain Skills

The creator domain provides 102 skills spanning blog, LinkedIn, YouTube, TikTok, Instagram, X/Twitter, newsletter, podcast, book, course, webinar, resume, and more. Use them to build content pipelines, social media agents, publication assistants, and multi-platform repurposing workflows.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "auto",
})
  .use(createSkillPackByName("creator"))
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

const response = await agent.run({
  prompt: "/write-blog Write an evidence-backed blog post about why TypeScript agent frameworks are replacing traditional chatbots.",
});
console.log(response.content);
```

## Skills

### Blog

| Skill | Directive | Purpose |
| --- | --- | --- |
| `blog-topic-research` | `/research-blog-topics` | Find blog topics with audience demand and owned-media fit |
| `blog-serp-research` | `/research-blog-serp` | Analyze SERP results for intent, ranking patterns, and content gaps |
| `blog-research` | `/research-blog-evidence` | Build source-backed blog research briefs with evidence maps |
| `blog-brief` | `/brief-blog` | Create execution-ready blog briefs with reader promise |
| `blog-writer` | `/write-blog` | Write evidence-aware blog drafts with clear thesis and structure |
| `blog-seo-review` | `/review-blog-seo` | Review blog drafts for search intent, information gain, and meta |
| `blog-fact-check` | `/fact-check-blog` | Verify blog claims, numbers, dates, quotes, and sources |
| `blog-citation` | `/map-blog-citations` | Map blog claims to precise supporting sources and attribution notes |
| `blog-refresh-review` | `/review-blog-refresh` | Review existing blog content for freshness decay and intent drift |

### LinkedIn

| Skill | Directive | Purpose |
| --- | --- | --- |
| `linkedin-audience-research` | `/research-linkedin-audience` | Research LinkedIn audience segments by professional situation |
| `linkedin-ideation` | `/ideate-linkedin-posts` | Generate LinkedIn post ideas with conceptual variety |
| `linkedin-post-writer` | `/write-linkedin-post` | Write platform-native LinkedIn posts with enacted specificity |
| `linkedin-hook-review` | `/review-linkedin-hook` | Review LinkedIn hooks for tension-with-stake quality |
| `linkedin-carousel-brief` | `/brief-linkedin-carousel` | Brief LinkedIn carousel content with slide-level jobs |
| `linkedin-calendar` | `/plan-linkedin-calendar` | Build LinkedIn content calendars with realistic review gates |
| `linkedin-performance-review` | `/review-linkedin-performance` | Review LinkedIn content performance by diagnosing engagement |

### YouTube

| Skill | Directive | Purpose |
| --- | --- | --- |
| `youtube-topic-research` | `/research-youtube-topic` | Research YouTube topics matching viewer demand and packaging |
| `youtube-title-thumbnail-brief` | `/brief-youtube-title-thumbnail` | Create YouTube title/thumbnail packages with click expectations |
| `youtube-scriptwriter` | `/write-youtube-script` | Write YouTube scripts with promise delivery and retention architecture |
| `youtube-thumbnail-brief` | `/brief-youtube-thumbnail` | Create YouTube thumbnail briefs with visual hierarchy and mobile fit |
| `youtube-description-tags-writer` | `/write-youtube-description-tags` | Write YouTube descriptions, tags, links, and disclosures |
| `youtube-chapter-writer` | `/write-youtube-chapters` | Write YouTube chapters that improve navigation and search replacement |
| `youtube-retention-review` | `/review-youtube-retention` | Review YouTube scripts or videos for retention failure paths |
| `youtube-community-post-writer` | `/write-youtube-community-post` | Write YouTube Community posts supporting video launches |

### TikTok

| Skill | Directive | Purpose |
| --- | --- | --- |
| `tiktok-trend-research` | `/research-tiktok-trends` | Research TikTok trends separating durable audience behaviors from noise |
| `tiktok-hook-writer` | `/write-tiktok-hooks` | Write TikTok hooks that earn the first seconds through visual language |
| `tiktok-scriptwriter` | `/write-tiktok-script` | Write TikTok scripts with native pacing and proof timing |
| `tiktok-shot-list` | `/plan-tiktok-shots` | Plan TikTok shots with first-frame proof and native filming constraints |
| `tiktok-retention-review` | `/review-tiktok-retention` | Review TikTok scripts for retention failure paths |
| `tiktok-safety-review` | `/review-tiktok-safety` | Review TikTok concepts, scripts, trends, and claims for safety |

### Instagram

| Skill | Directive | Purpose |
| --- | --- | --- |
| `instagram-caption-writer` | `/write-instagram-caption` | Write Instagram captions aligned to engagement type and function |
| `instagram-carousel-brief` | `/brief-instagram-carousel` | Brief Instagram carousel posts with slide-by-slide job assignments |
| `instagram-reel-scriptwriter` | `/write-instagram-reel-script` | Write Instagram Reels scripts optimizing for watch-through |
| `instagram-visual-direction` | `/direct-instagram-visuals` | Direct Instagram visual strategy aligning aesthetic and audience |
| `instagram-hashtag-review` | `/review-instagram-hashtags` | Review Instagram hashtag sets for audience-fit and engagement quality |

### X / Twitter

| Skill | Directive | Purpose |
| --- | --- | --- |
| `x-topic-research` | `/research-x-topics` | Research X/Twitter topics by mapping discourse tension and audience |
| `x-post-writer` | `/write-x-post` | Write X/Twitter posts with sharp public argument and source awareness |
| `x-thread-writer` | `/write-x-thread` | Write X/Twitter threads with argument progression and evidence |
| `x-hook-review` | `/review-x-hook` | Review X/Twitter opening lines and post hooks for quality |
| `x-community-reply-writer` | `/write-x-community-reply` | Write X/Twitter replies that add value and preserve tone |
| `x-trend-risk-review` | `/review-x-trend-risk` | Review X/Twitter trend participation for reputational risk |

### Newsletter

| Skill | Directive | Purpose |
| --- | --- | --- |
| `newsletter-audience-research` | `/research-newsletter-audience` | Research newsletter readers by inbox relationship and subscription intent |
| `newsletter-issue-planner` | `/plan-newsletter-issue` | Plan newsletter issues with promise, section jobs, and reader payoff |
| `newsletter-writer` | `/write-newsletter` | Write newsletter issues honoring the inbox relationship |
| `newsletter-subject-line-review` | `/review-newsletter-subject` | Review newsletter subject lines for promise-body fit and deliverability |
| `newsletter-sponsorship-copy-review` | `/review-newsletter-sponsor-copy` | Review newsletter sponsor copy for reader trust and disclosure |

### Podcast

| Skill | Directive | Purpose |
| --- | --- | --- |
| `podcast-topic-research` | `/research-podcast-topic` | Research podcast topics by listener job and episode premise |
| `podcast-outline-writer` | `/outline-podcast` | Build podcast episode outlines with cold open and segment jobs |
| `podcast-interview-question-writer` | `/write-podcast-questions` | Write podcast interview questions that surface stories and contrast |
| `podcast-show-notes-writer` | `/write-podcast-show-notes` | Write podcast show notes preserving episode promise and sources |
| `podcast-clip-repurposing` | `/repurpose-podcast-clips` | Identify and adapt podcast moments into platform-native clips |

### Book

| Skill | Directive | Purpose |
| --- | --- | --- |
| `book-positioning` | `/position-book` | Define book premise, reader promise, and competitive category shelf |
| `book-outline-writer` | `/outline-book` | Design book outlines with chapter promises and argument sequencing |
| `book-chapter-writer` | `/draft-chapter` | Draft book chapters advancing the manuscript arc with character |
| `book-developmental-edit` | `/develop-book` | Evaluate a manuscript at the structural level — thesis, arc, gaps |
| `book-continuity-review` | `/review-continuity` | Review manuscript continuity across chapters, terms, and frameworks |
| `book-citation-review` | `/review-citations` | Review manuscript claims, citations, source fit, and quote accuracy |

### Course

| Skill | Directive | Purpose |
| --- | --- | --- |
| `course-audience-research` | `/research-course-audience` | Research course audience by diagnosing prior knowledge and skill gaps |
| `course-curriculum-planner` | `/plan-course-curriculum` | Design online course curriculum with module sequence and content |
| `course-lesson-writer` | `/write-course-lesson` | Write course lessons that model the skill being taught |
| `course-exercise-generator` | `/generate-course-exercises` | Design exercises that produce skill transfer to job performance |
| `course-learning-outcome-review` | `/review-course-learning-outcomes` | Review learning outcomes for measurability and behavioral verbs |

### Webinar

| Skill | Directive | Purpose |
| --- | --- | --- |
| `webinar-topic-research` | `/research-webinar-topic` | Research webinar topics matching audience pain and buying stage |
| `webinar-outline-writer` | `/outline-webinar` | Build webinar outlines with live-attendance payoff and teaching arcs |
| `webinar-promo-copywriter` | `/write-webinar-promo-copy` | Write webinar promotion copy for landing pages, emails, and social |
| `webinar-slide-brief` | `/brief-webinar-slides` | Create webinar slide briefs translating the live outline to visual format |
| `webinar-followup-sequence` | `/write-webinar-followup-sequence` | Create webinar follow-up sequences segmented by attendance |

### Short Video

| Skill | Directive | Purpose |
| --- | --- | --- |
| `short-video-ideation` | `/ideate-short-video` | Generate short-video ideas matching platform consumption patterns |
| `short-video-scriptwriter` | `/write-short-video-script` | Write short-video scripts with first-seconds hook and visual beats |
| `short-video-shot-list` | `/plan-short-video-shots` | Turn scripts into producible shot lists with native filming constraints |
| `short-video-caption-writer` | `/write-short-video-caption` | Write platform-native captions, titles, and hashtags |
| `short-video-platform-adapter` | `/adapt-short-video-platforms` | Adapt one short-video concept across TikTok, Instagram Reels, and YouTube Shorts |

### Substack

| Skill | Directive | Purpose |
| --- | --- | --- |
| `substack-positioning` | `/position-substack` | Define Substack publication position with reader promise and differentiation |
| `substack-paid-free-strategy` | `/plan-substack-paid-free-strategy` | Design Substack paid/free boundaries and conversion paths |
| `substack-issue-writer` | `/write-substack-issue` | Write Substack issues with clear reader promise and voice-led narrative |
| `substack-community-thread-writer` | `/write-substack-community-thread` | Write Substack Notes/community thread prompts that create useful discussion |
| `substack-retention-review` | `/review-substack-retention` | Review Substack retention using churn, paid value, and cadence signals |

### Facebook

| Skill | Directive | Purpose |
| --- | --- | --- |
| `facebook-audience-research` | `/research-facebook-audience` | Research Facebook audience by diagnosing platform behavior patterns |
| `facebook-post-writer` | `/write-facebook-post` | Write Facebook page posts built for current organic distribution |
| `facebook-group-post-writer` | `/write-facebook-group-post` | Write Facebook Group posts that earn trust and engagement within communities |
| `facebook-community-engagement-planner` | `/plan-facebook-community-engagement` | Plan Facebook community engagement strategies building authentic growth |
| `facebook-adjacent-content-review` | `/review-facebook-adjacent-content` | Review content repurposed from other channels for Facebook platform fit |

### Pinterest

| Skill | Directive | Purpose |
| --- | --- | --- |
| `pinterest-keyword-research` | `/research-pinterest-keywords` | Research Pinterest keywords by search intent and seasonal planning |
| `pinterest-board-planner` | `/plan-pinterest-boards` | Plan Pinterest boards as search architecture with category fit |
| `pinterest-visual-brief` | `/brief-pinterest-visual` | Create Pinterest visual briefs translating keyword intent to image direction |
| `pinterest-pin-title-description-writer` | `/write-pinterest-pin-copy` | Write Pinterest pin titles and descriptions balancing visual and search |
| `pinterest-seasonality-review` | `/review-pinterest-seasonality` | Review Pinterest plans for seasonal timing and trend curve fit |

### Medium

| Skill | Directive | Purpose |
| --- | --- | --- |
| `medium-audience-research` | `/research-medium-audience` | Research Medium readers by publication context and topic following |
| `medium-story-angle` | `/angle-medium-story` | Shape a Medium story angle earning read-through by matching promise |
| `medium-article-writer` | `/write-medium-article` | Write Medium articles fulfilling the title promise and sustaining interest |
| `medium-title-subtitle-review` | `/review-medium-title` | Review Medium titles and subtitles for promise-size fit and readability |
| `medium-publication-fit-review` | `/review-medium-publication-fit` | Review whether a Medium article fits a target publication |

### Snapchat

| Skill | Directive | Purpose |
| --- | --- | --- |
| `snapchat-story-planner` | `/plan-snapchat-story` | Plan Snapchat story arcs with native sequence rhythm and privacy fit |
| `snapchat-short-copywriter` | `/write-snapchat-copy` | Write Snapchat-native short copy for snaps, stickers, and CTAs |
| `snapchat-ar-filter-brief` | `/brief-snapchat-ar-filter` | Create Snapchat AR/lens briefs with interaction logic and creative direction |
| `snapchat-youth-safety-review` | `/review-snapchat-youth-safety` | Review Snapchat content plans for youth safety and platform compliance |

### Resume & Career

| Skill | Directive | Purpose |
| --- | --- | --- |
| `resume-role-research` | `/research-resume-role` | Research a target role by decoding job descriptions and seniority signals |
| `resume-writer` | `/write-resume` | Write resumes translating career history into role-relevant achievement |
| `resume-tailoring` | `/tailor-resume` | Tailor an existing resume to a specific role by reordering and reframing |
| `resume-ats-review` | `/review-resume-ats` | Review resumes for ATS readability, parsing risk, and keyword presence |
| `linkedin-profile-optimizer` | `/optimize-linkedin-profile` | Optimize LinkedIn profiles for recruiter search and credibility |
| `cover-letter-writer` | `/write-cover-letter` | Write cover letters explaining fit, motivation, and value alignment |

## Patterns

### Blog to LinkedIn to Newsletter Pipeline

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";

const contentAgent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "directive-only",
})
  .use(createSkillPackByName("creator"))
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

// Research and write the blog
const research = await contentAgent.run({
  prompt: `/research-blog-evidence Research evidence for: "Why AI-native dev tools are replacing traditional IDEs."`,
});

const blogPost = await contentAgent.run({
  prompt: `/write-blog Write a 1500-word blog post on AI-native dev tools.
  
  Evidence: ${research.content}`,
});

// Adapt to LinkedIn
const linkedInPost = await contentAgent.run({
  prompt: `/write-linkedin-post Write a LinkedIn post promoting this blog post.
  
  Blog: ${blogPost.content.slice(0, 800)}`,
});

// Plan newsletter issue around it
const newsletterPlan = await contentAgent.run({
  prompt: `/plan-newsletter-issue Plan a newsletter issue featuring this blog as the lead.
  
  Blog summary: ${blogPost.content.slice(0, 500)}`,
});
```

### YouTube Video Production Pipeline

```ts
const videoAgent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "directive-only",
}).use(createSkillPackByName("creator"));

// Research the topic
const topicResearch = await videoAgent.run({
  prompt: `/research-youtube-topic Research YouTube topics about TypeScript agent frameworks.
  Focus: search demand, competition, viewer intent, packaging angles.`,
});

// Create title and thumbnail brief together
const titleThumbnail = await videoAgent.run({
  prompt: `/brief-youtube-title-thumbnail Create title and thumbnail brief.
  
  Topic research: ${topicResearch.content}`,
});

// Write the script
const script = await videoAgent.run({
  prompt: `/write-youtube-script Write a 10-minute YouTube script.
  
  Title/Thumbnail brief: ${titleThumbnail.content}`,
});

// Write description and chapters
const description = await videoAgent.run({
  prompt: `/write-youtube-description-tags Write description, tags, and chapters.
  
  Script: ${script.content}`,
});
```

### Multi-Platform Short Video Adaptation

```ts
// Write a short video script once
const script = await agent.run({
  prompt: `/write-short-video-script Write a 60-second script on "How to build an AI agent in TypeScript in 5 minutes."`,
});

// Adapt it for all platforms
const adapted = await agent.run({
  prompt: `/adapt-short-video-platforms Adapt this script for TikTok, Instagram Reels, and YouTube Shorts.
  
  Script: ${script.content}`,
});

// Write platform-specific captions
const captions = await agent.run({
  prompt: `/write-short-video-caption Write captions for each platform version.
  
  Adaptations: ${adapted.content}`,
});
```

### Substack Launch Workflow

```ts
// Define publication position
const positioning = await agent.run({
  prompt: `/position-substack Define the publication position for a Substack about AI and developer tools.
  Target reader: senior software engineers, tech leads.`,
});

// Design paid/free strategy
const paidFreeStrategy = await agent.run({
  prompt: `/plan-substack-paid-free-strategy Design the paid/free content strategy.
  
  Positioning: ${positioning.content}`,
});

// Write the first issue
const firstIssue = await agent.run({
  prompt: `/write-substack-issue Write the first Substack issue introducing the publication.
  
  Positioning: ${positioning.content}`,
});
```

### Resume Tailoring Pipeline

```ts
const resumeAgent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "directive-only",
}).use(createSkillPackByName("creator"));

// Research the target role
const roleResearch = await resumeAgent.run({
  prompt: `/research-resume-role Research the Staff Engineer role at Stripe.
  
  Job description: [paste JD here]`,
});

// Tailor the existing resume
const tailoredResume = await resumeAgent.run({
  prompt: `/tailor-resume Tailor this resume for the Staff Engineer role.
  
  Existing resume: [resume content]
  Role research: ${roleResearch.content}`,
});

// Check ATS compatibility
const atsReview = await resumeAgent.run({
  prompt: `/review-resume-ats Review this tailored resume for ATS compatibility.
  
  Resume: ${tailoredResume.content}`,
});

// Write cover letter
const coverLetter = await resumeAgent.run({
  prompt: `/write-cover-letter Write a cover letter for Staff Engineer at Stripe.
  
  Resume: ${tailoredResume.content}
  Role research: ${roleResearch.content}`,
});
```

## Optional Adapters

| Adapter | Benefit |
| --- | --- |
| `TavilySearchAdapter` | Live topic research, SERP analysis, and trend monitoring |
| `FirecrawlAdapter` | Deep competitor content crawling for differentiation research |
| `FileSystemAdapter` | Load existing content, brand guidelines, and source documents |
| `PublishingAdapter` | Publish blog posts, newsletters, and content artifacts directly |

## Related

- [Industry Domain Skills Overview](./overview.md)
- [Marketing Domain](./marketing.md)
- [Brand Domain](./brand.md)
- [Creator Packs](../../creator/packs.md)
