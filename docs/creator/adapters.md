# Creator Adapters

Creator adapters provide the tools creator skills naturally need.

## Adapter Map

| Adapter                   | Tools                                                              | Used for                                 |
| ------------------------- | ------------------------------------------------------------------ | ---------------------------------------- |
| `CitationManagerAdapter`  | `save_citation`, `read_citation`                                   | Source notes, claim maps, fact checks.   |
| `LinkCheckerAdapter`      | `check_link`                                                       | Publish QA, SEO review.                  |
| `SeoAdapter`              | `get_serp_results`, `get_keyword_metrics`                          | SERP briefs, SEO strategy.               |
| `CreatorResourcesAdapter` | `read_brand_voice`, `search_content_corpus`, `list_creator_assets` | Brand voice, prior work, assets.         |
| `PublishingAdapter`       | `create_publish_draft`, `publish_content`                          | Draft/publish workflows, approval-gated. |
| `AnalyticsAdapter`        | `read_content_metrics`                                             | Performance analysis, experiments.       |

## Example

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  CitationManagerAdapter,
  LinkCheckerAdapter,
  SeoAdapter,
} from "@deskcreate/agentcraft/adapters";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(CreatorPacks.blog())
  .use(CitationManagerAdapter.connect({ root: "content/citations" }))
  .use(LinkCheckerAdapter.connect())
  .use(SeoAdapter.connect());

const response = await agent.run({
  prompt: "Write and SEO-review a blog post about AI agents.",
});
console.log(response.content);
```

## More

- [Built-In Adapters Reference](../reference/built-in-adapters.md)
- [Creator Memory](./memory.md)
- [Creator Analytics](./analytics.md)
