# Publishing Pack

The publishing pack is the operations layer for final checks, content calendars, SEO review, and risky claim detection. It should usually run after drafting packs, not before them.

## Coverage

| Stage      | Included skills     | Tools to attach                      | Purpose                                           |
| ---------- | ------------------- | ------------------------------------ | ------------------------------------------------- |
| QA         | `publish-qa`        | `link-checker`, `citation-manager`   | Verify links, citations, metadata, and readiness. |
| Calendar   | `content-calendar`  | `google-sheets`, `notion`, `storage` | Plan publishing cadence.                          |
| SEO review | `seo-review`        | `seo`, `fetch`, `playwright`         | Inspect page readiness.                           |
| Risk       | `claim-risk-review` | `citation-manager`                   | Flag claims needing evidence or legal review.     |

## Usage

```ts
import { Agent, Provider } from "agentcraft";
import { CreatorPacks } from "agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(CreatorPacks.publishing({ readOnlyByDefault: true }));

const response = await agent.run({
  prompt: "Run pre-publish QA on this article and produce a blocker list.",
});
console.log(response.content);
```

## Configuration

| Option              | Required | Default       | Purpose                                                |
| ------------------- | -------- | ------------- | ------------------------------------------------------ |
| `readOnlyByDefault` | No       | `false`       | Recommended `true` for publishing workflows.           |
| `contentRoot`       | No       | Undefined     | Local drafts to inspect.                               |
| `toolSelection`     | No       | `auto`        | Chooses link, SEO, or calendar tools only when needed. |
| `budget`            | No       | Agent default | Caps large crawl or QA passes.                         |

## Examples

Combine with a draft pack:

```ts
agent
  .use(CreatorPacks.blog())
  .use(CreatorPacks.publishing({ readOnlyByDefault: true }));
```

See [Approvals](../../tools/approvals.md) before attaching write-capable publishing tools.
