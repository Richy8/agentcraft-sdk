# Blog Pack

The blog pack is the longform owned-media lane. Use it for blog posts, article plans, refresh reviews, citations, and evidence-aware drafts. Use [Medium](../skills.md) or `CreatorPacks.medium()` when the platform surface is specifically Medium and publication/read-depth mechanics matter.

## Coverage

| Stage    | Included skills                                                              | Tools to attach                                                         | Purpose                                                                |
| -------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Research | `blog-topic-research`, `blog-research`, `blog-serp-research`                 | `TavilySearchAdapter`, `FirecrawlAdapter`, `FetchAdapter`, SEO adapters | Find topics, source evidence, and inspect SERP shape.                  |
| Strategy | `blog-brief`                                                                 | Memory, artifact, filesystem, and storage adapters                      | Turn evidence into an execution-ready article brief.                   |
| Writing  | `blog-writer`                                                                | Filesystem, storage, memory, fetch/search tools when needed             | Produce the article draft with thesis, examples, and claim boundaries. |
| Review   | `blog-seo-review`, `blog-fact-check`, `blog-citation`, `blog-refresh-review` | Citation, link-check, fetch, crawl, analytics, and storage adapters     | Check search fit, claim support, citations, and freshness.             |

## Usage

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  FirecrawlAdapter,
  FileSystemAdapter,
} from "@deskcreate/agentcraft/adapters";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
})
  .use(FirecrawlAdapter.connect({ apiKey: process.env.FIRECRAWL_API_KEY! }))
  .use(
    FileSystemAdapter.connect({
      rootPath: "./content",
      allowedExtensions: [".md"],
    }),
  )
  .use(CreatorPacks.blog({ contentRoot: "./content", cache: "auto" }));

const response = await agent.run({
  prompt:
    "Write a Medium post for engineering managers about agent cost governance.",
});
console.log(response.content);
```

## Configuration

| Option          | Required | Default       | Purpose                                                            |
| --------------- | -------- | ------------- | ------------------------------------------------------------------ |
| `contentRoot`   | No       | Undefined     | Draft and brief target path.                                       |
| `cache`         | No       | `false`       | Reuses research and brief context when `AgentCache` is configured. |
| `toolSelection` | No       | `auto`        | Lets the agent use only useful attached tools.                     |
| `budget`        | No       | Agent default | Caps spend and token use for heavier article workflows.            |

## Examples

Force one skill inside the pack when the user knows the next step:

```ts
await agent.run({
  prompt:
    "/fact-check-blog Check every claim in this draft before I publish it.",
});
```

For more article flows, see [Creator Workflows](../workflows.md) and the [creator cookbook](../../examples-cookbook/creator.md).
