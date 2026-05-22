# SEO Workflows

SEO is now modeled as a marketing domain pack instead of a creator-only pack. Use `MarketingPacks.seo()` when the work is keyword research, SERP analysis, technical SEO, internal links, or content refresh planning.

## Coverage

| Stage          | Current skills                              | Tools to attach                           | Purpose                                                 |
| -------------- | ------------------------------------------- | ----------------------------------------- | ------------------------------------------------------- |
| Research       | `seo-keyword-research`, `seo-serp-analysis` | `TavilySearchAdapter`, `FirecrawlAdapter` | Understand intent, SERP shape, competitors, and gaps.   |
| Briefing       | `seo-content-brief`                         | `SeoAdapter`, `FetchAdapter`              | Produce an execution-ready SEO content brief.           |
| Technical      | `seo-technical-audit`                       | `PlaywrightAdapter`, `FetchAdapter`       | Inspect indexability, metadata, links, and page health. |
| Internal links | `seo-internal-link-planner`                 | `FileSystemAdapter`, `FetchAdapter`       | Plan useful internal links without anchor stuffing.     |
| Refresh        | `seo-content-refresh-review`                | `SeoAdapter`, `AnalyticsAdapter`          | Decide what to update, consolidate, or leave alone.     |

## Usage

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  SeoAdapter,
  TavilySearchAdapter,
} from "@deskcreate/agentcraft/adapters";
import { CreatorPacks, MarketingPacks } from "@deskcreate/agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
})
  .use(SeoAdapter.connect())
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }))
  .use(MarketingPacks.seo({ readOnlyByDefault: true }))
  .use(CreatorPacks.blog());

const response = await agent.run({
  prompt:
    "/brief-seo-content Build an SEO brief for agent workflow caching, then outline the blog article.",
});
console.log(response.content);
```

For direct skill access, use `createSkillByName("seo-content-brief")` or extract a skill accessor from `MarketingPacks.seo()`.
