# Copy Workflows

Conversion copy now lives in marketing domain packs. Use the pack that matches the asset instead of a generic creator copy pack.

## Coverage

| Need          | Pack                              | Representative Skills                                                                                                     |
| ------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Landing pages | `MarketingPacks.landingPage()`    | `landing-page-positioning`, `landing-page-copywriter`, `landing-page-conversion-review`, `landing-page-claim-risk-review` |
| Ads           | `MarketingPacks.ads()`            | `ad-audience-research`, `ad-angle-generator`, `ad-copywriter`, `ad-creative-brief`, `ad-compliance-review`                |
| Email         | `MarketingPacks.emailMarketing()` | `email-sequence-planner`, `email-copywriter`, `email-subject-line-review`, `email-performance-review`                     |
| Campaigns     | `MarketingPacks.campaign()`       | `campaign-strategy`, `campaign-calendar`, `campaign-brief`, `campaign-asset-planner`                                      |

## Usage

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { MarketingPacks } from "@deskcreate/agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
})
  .use(MarketingPacks.landingPage({ readOnlyByDefault: true }))
  .use(MarketingPacks.ads({ readOnlyByDefault: true }));

const response = await agent.run({
  prompt:
    "Write a landing-page hero section and two paid ad angles for an agent testing toolkit. Flag any claim-risk issues.",
});
console.log(response.content);
```

For direct skill access, use names like `landing-page-copywriter`, `ad-copywriter`, or `email-copywriter`.
