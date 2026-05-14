# Blog Pack

The blog pack is the full Medium-style writing lane. It adds research synthesis and fact checking on top of the default pack so drafts are built from evidence instead of a flat prompt.

## Coverage

| Stage    | Included skills                           | Tools to attach                                           | Purpose                                                      |
| -------- | ----------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------ |
| Research | `audience-research`, `research-synthesis` | `TavilySearchAdapter`, `FirecrawlAdapter`, `FetchAdapter` | Collect and compress source material.                        |
| Strategy | `content-positioning`, `content-brief`    | `CreatorResourcesAdapter`, `MemoryMCP`                    | Shape angle, reader, outline, and claims.                    |
| Writing  | `blog-writer`                             | `FileSystemAdapter`                                       | Produce the article body and optional draft artifact.        |
| QA       | `editorial-review`, `fact-check`          | `CitationManagerAdapter`, `LinkCheckerAdapter`            | Catch weak logic, missing citations, and unsupported claims. |

## Usage

```ts
import { Agent, Provider } from "agentcraft";
import { FirecrawlAdapter, FileSystemAdapter } from "agentcraft/adapters";
import { CreatorPacks } from "agentcraft/packs";

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
  prompt: "/fact-check Check every claim in this draft before I publish it.",
});
```

For more article flows, see [Creator Workflows](../workflows.md) and the [creator cookbook](../../examples-cookbook/creator.md).
