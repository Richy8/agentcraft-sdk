# Marketing Domain Skills

The marketing domain provides 37 skills across advertising, campaigns, SEO, email, landing pages, and competitive analysis. Use them to build marketing agents, campaign brief generators, SEO research pipelines, and ad copy assistants.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
})
  .use(createSkillPackByName("marketing"))
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

const response = await agent.run({
  prompt: "/research-keywords Research SEO keywords for a TypeScript agent framework targeting developers.",
});
console.log(response.content);
```

## Skills

### Advertising

| Skill | Directive | Purpose |
| --- | --- | --- |
| `ad-copywriter` | `/write-ad-copy` | Write ad copy for multiple formats and platforms |
| `ad-angle-generator` | `/generate-ad-angles` | Generate creative angles for ad campaigns |
| `ad-creative-brief` | `/brief-ad-creative` | Write an ad creative brief for the creative team |
| `ad-audience-research` | `/research-ad-audience` | Research and define target ad audiences |
| `ad-variant-analysis` | `/analyze-ad-variants` | Analyze performance of ad variants and recommend winners |
| `ad-compliance-review` | `/review-ad-compliance` | Review ads for regulatory and platform compliance |

### Campaigns

| Skill | Directive | Purpose |
| --- | --- | --- |
| `campaign-brief` | `/write-campaign-brief` | Write a full campaign brief with objectives and KPIs |
| `campaign-strategy` | `/build-campaign-strategy` | Develop campaign strategy and channel allocation |
| `campaign-asset-planner` | `/plan-campaign-assets` | Plan all creative and copy assets for a campaign |
| `campaign-calendar` | `/build-campaign-calendar` | Build a campaign execution calendar |
| `campaign-performance-review` | `/review-campaign-performance` | Analyze campaign performance and recommend optimizations |

### SEO

| Skill | Directive | Purpose |
| --- | --- | --- |
| `seo-keyword-research` | `/research-keywords` | Keyword research with intent mapping and difficulty scoring |
| `seo-content-brief` | `/brief-seo-content` | Write an SEO content brief with target keywords |
| `seo-serp-analysis` | `/analyze-serp` | Analyze SERP landscape for a keyword or topic |
| `seo-content-refresh-review` | `/review-content-refresh` | Identify content to refresh and what to update |
| `seo-internal-link-planner` | `/plan-internal-links` | Plan internal linking strategy |
| `seo-technical-audit` | `/audit-technical-seo` | Audit technical SEO issues |

### Email Marketing

| Skill | Directive | Purpose |
| --- | --- | --- |
| `email-copywriter` | `/write-email-copy` | Write marketing email copy |
| `email-sequence-planner` | `/plan-email-sequence` | Plan a nurture or onboarding email sequence |
| `email-subject-line-review` | `/review-subject-lines` | Review and score email subject lines |
| `email-segmentation-analysis` | `/analyze-email-segments` | Analyze list segmentation and targeting |
| `email-performance-review` | `/review-email-performance` | Analyze email campaign performance |

### Landing Pages

| Skill | Directive | Purpose |
| --- | --- | --- |
| `landing-page-copywriter` | `/write-landing-page-copy` | Write conversion-focused landing page copy |
| `landing-page-positioning` | `/position-landing-page` | Develop landing page positioning and hierarchy |
| `landing-page-conversion-review` | `/review-conversion` | Review landing page for conversion optimization |
| `landing-page-wireframe-brief` | `/brief-wireframe` | Write a wireframe brief for a landing page |
| `landing-page-claim-risk-review` | `/review-page-claims` | Review claims for accuracy and compliance risk |

### Competitive Analysis

| Skill | Directive | Purpose |
| --- | --- | --- |
| `competitor-content-analysis` | `/analyze-competitor-content` | Analyze competitor content strategy and gaps |
| `competitor-positioning-map` | `/map-positioning` | Map competitive positioning landscape |
| `competitor-gap-synthesis` | `/synthesize-competitor-gaps` | Identify positioning and content gaps vs. competitors |
| `competitor-offer-review` | `/review-competitor-offer` | Review and compare competitor offers |

### Digital Marketing

| Skill | Directive | Purpose |
| --- | --- | --- |
| `digital-marketing-strategy` | `/build-strategy` | Build an integrated digital marketing strategy |
| `digital-channel-mix-planner` | `/plan-channel-mix` | Plan budget and resource allocation across channels |
| `digital-funnel-audit` | `/audit-funnel` | Audit the full marketing and conversion funnel |
| `digital-growth-experiment-planner` | `/plan-growth-experiment` | Plan growth experiments with hypotheses and metrics |
| `digital-attribution-review` | `/review-attribution` | Review attribution model and multi-touch coverage |
| `digital-marketing-performance-brief` | `/brief-performance` | Write a marketing performance summary for stakeholders |

## Patterns

### SEO Research Pipeline

```ts
const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "directive-only",
})
  .use(createSkillPackByName("marketing"))
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

const keywords = await agent.run({
  prompt: "/research-keywords TypeScript agent frameworks — find high-intent keywords with low difficulty.",
});

const brief = await agent.run({
  prompt: `/brief-seo-content Create an SEO content brief for the keyword "TypeScript agent SDK".
  
  Keyword research: ${keywords.content.slice(0, 800)}`,
});

console.log(brief.content);
```

### Ad Campaign Launch Assistant

```ts
const campaign = await agent.run({
  prompt: `/write-campaign-brief Create a campaign brief for a B2B SaaS launch targeting engineering managers.
  
  Product: AgentCraft — TypeScript agent SDK
  Goal: 100 trial signups
  Budget: $10,000
  Timeline: 4 weeks`,
});

const adCopy = await agent.run({
  prompt: `/write-ad-copy Write 3 Google ad variants based on this campaign brief.
  
  Brief: ${campaign.content}`,
});
```

## Optional Adapters

| Adapter | Benefit |
| --- | --- |
| `TavilySearchAdapter` | Live keyword and competitor data |
| `FirecrawlAdapter` | Deep competitor content crawling |
| `SeoAdapter` | SEO metrics and SERP data |
| `AnalyticsAdapter` | Performance data for review skills |

## Related

- [Industry Domain Skills Overview](./overview.md)
- [Brand Domain](./brand.md)
- [Content & Creator Domain](./creator.md)
