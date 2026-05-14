# Citation Store

The citation store keeps source records, quote metadata, and evidence links accessible to creator skills such as `fact-check`, `research-synthesis`, and `claim-risk-review`.

## Purpose

| Need             | Tool                               | Used by              | Related page                                      |
| ---------------- | ---------------------------------- | -------------------- | ------------------------------------------------- |
| Record source    | `CitationManagerAdapter`           | `fact-check`         | [Creator Skills](../creator/skills.md)            |
| Validate links   | `LinkCheckerAdapter`               | `publish-qa`         | [Publishing Pack](../creator/packs/publishing.md) |
| Read source page | `FetchAdapter`, `FirecrawlAdapter` | `research-synthesis` | [Adapters](../adapters/built-in.md)               |
| Keep audit trail | Trace sink                         | Review workflows     | [Observability](../core/observability-replay.md)  |

## Usage

```ts
import { Agent, Provider } from "agentcraft";
import {
  CitationManagerAdapter,
  LinkCheckerAdapter,
} from "agentcraft/adapters";
import { CreatorPacks } from "agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(CitationManagerAdapter.connect())
  .use(LinkCheckerAdapter.connect())
  .use(CreatorPacks.blog());

const response = await agent.run({
  prompt: "Research and write a post with source citations.",
});
console.log(response.content);
```

## Configuration

| Option            | Required           | Default               | Purpose                                |
| ----------------- | ------------------ | --------------------- | -------------------------------------- |
| Store path/client | Depends on adapter | In-memory or injected | Persists citation records.             |
| Link timeout      | No                 | Adapter default       | Bounds link checks.                    |
| Allowed domains   | No                 | Undefined             | Limits source reads.                   |
| Approval policy   | No                 | Agent default         | Controls write-like record operations. |

## Local Examples

Run a citation-heavy fact check:

```ts
await agent.run({
  prompt:
    "/fact-check Verify claims and return citation gaps with source URLs.",
});
```

More variants: [creator cookbook](../examples-cookbook/creator.md).
