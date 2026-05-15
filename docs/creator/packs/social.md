# Social Pack

The social pack turns one idea into platform-native posts without losing brand voice. It is strongest when paired with a content source, brand memory, and review tools.

## Coverage

| Stage   | Included skills | Tools to attach                   | Purpose                                   |
| ------- | --------------- | --------------------------------- | ----------------------------------------- |
| Writing | `social-writer` | `creator-resources`, `filesystem` | Draft posts per platform.                 |
| Reuse   | `repurposing`   | `filesystem`, `memory-mcp`        | Convert longform into short assets.       |
| Voice   | `brand-voice`   | `CreatorMemoryStore`              | Preserve tone and recurring preferences.  |
| Review  | `copy-review`   | `citation-manager`                | Improve clarity, hooks, and risk posture. |

## Usage

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(
  CreatorPacks.social({
    memory: true,
    skillActivation: "auto",
  }),
);

const response = await agent.run({
  prompt:
    "Turn this article outline into LinkedIn, X, and YouTube Community posts.",
});
console.log(response.content);
```

## Configuration

| Option              | Required | Default   | Purpose                                          |
| ------------------- | -------- | --------- | ------------------------------------------------ |
| `memory`            | No       | `false`   | Applies brand voice and prior audience learning. |
| `contentRoot`       | No       | Undefined | Finds reusable drafts and outlines.              |
| `toolSelection`     | No       | `auto`    | Uses only needed resource or memory tools.       |
| `readOnlyByDefault` | No       | `false`   | Avoids publishing side effects unless approved.  |

## Examples

Add direct copy risk review for regulated industries:

```ts
agent.use(CreatorPacks.social()).use(ClaimRiskReviewSkill.create());
```

More variants live in the [skills cookbook](../../examples-cookbook/skills.md).
