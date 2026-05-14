# Creator Default Pack

The default creator pack is the safest starting point for longform content. It gives the agent enough structure to research the audience, position the idea, build a brief, draft the article, and review the result without assuming publishing access.

## Coverage

| Area     | Included skills                        | Useful tools                                 | Deeper page                          |
| -------- | -------------------------------------- | -------------------------------------------- | ------------------------------------ |
| Audience | `audience-research`                    | `tavily`, `firecrawl`, `fetch`, `memory-mcp` | [Creator Skills](../skills.md)       |
| Strategy | `content-positioning`, `content-brief` | `creator-resources`, `filesystem`            | [Creator Workflows](../workflows.md) |
| Drafting | `blog-writer`                          | `filesystem`, `memory-mcp`                   | [Blog Pack](./blog.md)               |
| Review   | `editorial-review`                     | `citation-manager`, `link-checker`           | [Publishing Pack](./publishing.md)   |

## Usage

```ts
import { Agent, Provider } from "agentcraft";
import { CreatorPacks } from "agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  CreatorPacks.default({
    contentRoot: "./content",
    skillActivation: "auto",
  }),
);

const response = await agent.run({
  prompt: "Draft a practical Medium article about reducing AI workflow costs.",
});
console.log(response.content);
```

## Configuration

| Option              | Required | Default   | Purpose                                                           |
| ------------------- | -------- | --------- | ----------------------------------------------------------------- |
| `contentRoot`       | No       | Undefined | Preferred workspace for drafts and briefs.                        |
| `readOnlyByDefault` | No       | `false`   | Keeps write-capable tools approval-bound.                         |
| `memory`            | No       | `false`   | Enables creator memory when a store is attached.                  |
| `skillActivation`   | No       | `auto`    | Lets the agent choose relevant skills unless a directive is used. |

## Examples

Use this pack when you want a minimal creator setup:

```ts
agent.use(CreatorPacks.default()).use(BrandVoiceSkill.create());
```

For more variants, see the [creator cookbook](../../examples-cookbook/creator.md) and [skill activation](../../skills/activation.md).
