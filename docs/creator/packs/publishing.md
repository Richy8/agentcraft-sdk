# Publishing Readiness Workflows

Publishing is no longer a single generic creator pack. Compose the review skills and operational packs that match the surface you are preparing.

## Coverage

| Need                       | Current Skill Or Pack                                 | Purpose                                                            |
| -------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------ |
| Blog readiness             | `blog-fact-check`, `blog-citation`, `blog-seo-review` | Verify claims, source use, citations, and SEO readiness.           |
| Landing page risk          | `landing-page-claim-risk-review`                      | Flag unsupported, regulated, or overclaimed conversion copy.       |
| Campaign calendar          | `MarketingPacks.campaign()`                           | Plan assets, dates, owners, and dependencies.                      |
| LinkedIn schedule          | `CreatorPacks.linkedin()`                             | Use `linkedin-calendar` for platform-native post scheduling plans. |
| Newsletter issue readiness | `CreatorPacks.newsletter()`                           | Review subject line, issue structure, and sponsorship fit.         |

## Usage

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { CreatorPacks, MarketingPacks } from "@deskcreate/agentcraft/packs";
import { createSkillByName } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
})
  .use(CreatorPacks.blog({ readOnlyByDefault: true }))
  .use(MarketingPacks.campaign({ readOnlyByDefault: true }))
  .use(createSkillByName("blog-fact-check"));

const response = await agent.run({
  prompt:
    "/fact-check-blog Run a pre-publish blocker review on this article and return claim, citation, SEO, and launch-calendar gaps.",
});
console.log(response.content);
```

Keep actual publishing or scheduling behind [Approvals](../../tools/approvals.md) and tool policy gates.
