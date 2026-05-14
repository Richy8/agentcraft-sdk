# SEO Pack

The SEO pack turns keyword intent, competitor pages, and SERP patterns into an actionable brief. It is designed for strategy and review, not blind keyword stuffing.

## Coverage

| Stage             | Included skills       | Tools to attach                     | Purpose                                        |
| ----------------- | --------------------- | ----------------------------------- | ---------------------------------------------- |
| Strategy          | `seo-strategy`        | `SeoAdapter`, `TavilySearchAdapter` | Choose intent, clusters, and page targets.     |
| SERP brief        | `serp-brief`          | `FirecrawlAdapter`, `FetchAdapter`  | Compare ranking pages and content gaps.        |
| Verification      | `fact-check`          | `CitationManagerAdapter`            | Keep claims grounded and traceable.            |
| Publishing review | Optional `seo-review` | `LinkCheckerAdapter`                | Inspect metadata, links, and publish blockers. |

## Usage

```ts
import { Agent, Provider } from "agentcraft";
import { SeoAdapter, TavilySearchAdapter } from "agentcraft/adapters";
import { CreatorPacks } from "agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(SeoAdapter.connect())
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }))
  .use(CreatorPacks.seo({ skillActivation: "auto" }));

const response = await agent.run({
  prompt:
    'Build an SEO brief for "agent workflow caching" targeting SaaS engineers.',
});
console.log(response.content);
```

## Configuration

| Option              | Required | Default       | Purpose                                                   |
| ------------------- | -------- | ------------- | --------------------------------------------------------- |
| `toolSelection`     | No       | `auto`        | Prevents unnecessary searches when enough context exists. |
| `cache`             | No       | `false`       | Reuses SERP and keyword research where safe.              |
| `readOnlyByDefault` | No       | `false`       | Keeps audit writes explicit.                              |
| `budget`            | No       | Agent default | Prevents expensive competitor sweeps.                     |

## Examples

Use the pack with a normal writing skill:

```ts
agent.use(CreatorPacks.seo()).use(BlogWriterSkill.create());
```

For more SEO variants, see [SEO examples](../../examples-cookbook/creator.md) and [Built-In Adapters](../../reference/built-in-adapters.md).
