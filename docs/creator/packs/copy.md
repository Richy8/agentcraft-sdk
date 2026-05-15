# Copy Pack

The copy pack is for landing pages, ads, lifecycle emails, product launches, and conversion copy. It combines audience insight, positioning, writing, review, and risk checks.

## Coverage

| Stage       | Included skills                    | Tools to attach                    | Purpose                                     |
| ----------- | ---------------------------------- | ---------------------------------- | ------------------------------------------- |
| Insight     | `audience-research`                | `tavily`, `firecrawl`              | Understand pain, intent, and objections.    |
| Positioning | `content-positioning`              | `creator-resources`                | Clarify promise and differentiation.        |
| Drafting    | `copywriter`                       | `filesystem`                       | Write conversion assets.                    |
| Review      | `copy-review`, `claim-risk-review` | `citation-manager`, `link-checker` | Improve persuasion and reduce risky claims. |

## Usage

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
}).use(CreatorPacks.copy({ readOnlyByDefault: true }));

const response = await agent.run({
  prompt: "Write a landing page section for an agent testing toolkit.",
});
console.log(response.content);
```

## Configuration

| Option              | Required | Default       | Purpose                                         |
| ------------------- | -------- | ------------- | ----------------------------------------------- |
| `readOnlyByDefault` | No       | `false`       | Keeps publishing or CRM writes gated.           |
| `memory`            | No       | `false`       | Applies brand voice and offer history.          |
| `toolSelection`     | No       | `auto`        | Avoids calling research tools for known offers. |
| `budget`            | No       | Agent default | Bounds ideation and review loops.               |

## Examples

Add a publishing adapter only when the workflow should prepare deployable copy:

```ts
agent
  .use(CreatorPacks.copy())
  .use(PublishingAdapter.connect({ channels: ["web"] }));
```

More copy examples are in the [creator cookbook](../../examples-cookbook/creator.md).
