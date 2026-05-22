# Creator Category Packs

The old flat creator default pack has been replaced by category packs. Pick the platform or content routine you actually need, then let `skillActivation: "auto"` select the relevant skills inside that category.

## Coverage

| Need                        | Pack                      | Example skills                                                               |
| --------------------------- | ------------------------- | ---------------------------------------------------------------------------- |
| Blog or owned-media article | `CreatorPacks.blog()`     | `blog-brief`, `blog-writer`, `blog-fact-check`                               |
| Medium-native essay/article | `CreatorPacks.medium()`   | `medium-story-angle`, `medium-article-writer`                                |
| LinkedIn content system     | `CreatorPacks.linkedin()` | `linkedin-ideation`, `linkedin-post-writer`, `linkedin-calendar`             |
| YouTube workflow            | `CreatorPacks.youtube()`  | `youtube-topic-research`, `youtube-scriptwriter`, `youtube-retention-review` |
| Resume/career material      | `CreatorPacks.resume()`   | `resume-role-research`, `resume-writer`, `resume-ats-review`                 |

## Usage

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  CreatorPacks.blog({ contentRoot: "./content", skillActivation: "auto" }),
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
agent.use(CreatorPacks.blog()).use(createSkillByName("blog-writer"));
```

For more variants, see the [creator cookbook](../../examples-cookbook/creator.md) and [skill activation](../../skills/activation.md).
