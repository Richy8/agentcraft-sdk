# Industry Packs

Industry packs are lightweight workflow bundles for non-creator domains. They are imported from `@deskcreate/agentcraft/packs`, backed by registry pack specs, and the curated namespaces attach focused workflow skills.

AgentCraft also exports category-level skill packs through `createSkillPackByName()`. Use the namespace packs when you want a compact workflow entry point; use category-level skill packs when you want every skill in a domain category available for auto activation.

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  FinancePacks,
  MarketingPacks,
  ProductPacks,
} from "@deskcreate/agentcraft/packs";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
  toolSelection: "auto",
})
  .use(MarketingPacks.seo({ readOnlyByDefault: true }))
  .use(ProductPacks.prd())
  .use(FinancePacks.marketUpdate({ readOnlyByDefault: true }));

const response = await agent.run({
  prompt:
    "Create a product launch readiness brief that separates SEO opportunities, PRD risks, and market timing assumptions.",
});
console.log(response.content);
```

## Registry Inspection

Use workflow pack specs when you want to show curated pack membership in your UI without instantiating skills.

```ts
import { listPackSpecs } from "@deskcreate/agentcraft/packs";

const financePacks = listPackSpecs({ domain: "finance" });

for (const pack of financePacks) {
  console.log(pack.name, pack.skillIds, pack.docsPath);
}
```

Use category-level skill pack specs when you want a full picker across every active domain/category pair.

```ts
import {
  createSkillPackByName,
  listSkillPackSpecs,
} from "@deskcreate/agentcraft/packs";

const seoSkills = listSkillPackSpecs({
  domain: "marketing",
  category: "seo",
})[0];

console.log(seoSkills.name); // "marketing-seo-skills"
console.log(seoSkills.skillIds); // all SEO category skills

agent.use(createSkillPackByName("marketing-seo-skills"));
```

Brand category packs are available the same way. Use them when a workflow needs focused brand expertise without attaching a broad creator workflow.

```ts
import { createSkillPackByName } from "@deskcreate/agentcraft/packs";

agent
  .use(createSkillPackByName("brand-research-skills"))
  .use(createSkillPackByName("brand-positioning-skills"))
  .use(createSkillPackByName("brand-messaging-skills"))
  .use(createSkillPackByName("brand-voice-skills"));
```

## Skill Overrides

Pack defaults are conservative: `skillActivation: "auto"`, `toolSelection: "auto"`, and `readOnlyByDefault: true`. Disable a skill only when you know another attached skill or tool owns that part of the workflow.

```ts
import { CreatorPacks } from "@deskcreate/agentcraft/packs";

const pack = CreatorPacks.blog({
  skillOverrides: {
    "research-synthesis": { enabled: false },
  },
});
```

## Available Namespaces

Marketing:

```ts
MarketingPacks.seo();
MarketingPacks.ads();
MarketingPacks.campaign();
```

Finance:

```ts
FinancePacks.stockResearch();
FinancePacks.marketUpdate();
FinancePacks.portfolioReview();
```

Product:

```ts
ProductPacks.productResearch();
ProductPacks.prd();
ProductPacks.launch();
```

Engineering:

```ts
EngineeringPacks.codeReview();
EngineeringPacks.debugging();
EngineeringPacks.testGeneration();
```

Support:

```ts
SupportPacks.ticketTriage();
SupportPacks.knowledgeBase();
SupportPacks.customerSuccess();
```

Business:

```ts
BusinessPacks.investments();
BusinessPacks.strategy();
```

Personal operations:

```ts
PersonalProductivityPacks.weeklyPlanning();
```

Deferred domains such as agriculture, tax/accounting, banking operations, education, HR, insurance, operations, ecommerce, security, travel/hospitality, logistics, manufacturing, energy, science/R&D, construction, local services, sports/fitness, beauty/lifestyle, restaurants/food service, real estate, media production, public sector, and nonprofit are kept in the roadmap for later implementation, but they are not exported as active packs yet.

## Category-Level Skill Packs

Every active domain category has a generated skill pack named `<domain>-<category>-skills`. These packs are intentionally separate from the curated workflow namespaces above.

```ts
import { createSkillPackByName } from "@deskcreate/agentcraft/packs";

const packs = [
  createSkillPackByName("brand-positioning-skills"),
  createSkillPackByName("business-investments-skills"),
  createSkillPackByName("sales-prospecting-skills"),
  createSkillPackByName("product-prd-skills"),
  createSkillPackByName("legal-contract-review-skills"),
];

for (const pack of packs) {
  agent.use(pack);
}
```

High-risk category packs such as finance, healthcare, legal, and business investments carry human-review metadata and keep `readOnlyByDefault: true` unless you override it.

## High-Risk Boundaries

Finance and business investment workflows are designed to surface assumptions, missing inputs, evidence boundaries, and human-review triggers. They should not be marketed or used as autonomous legal, tax, medical, financial, safety, compliance, or professional advice systems.

## Copy-Ready Patterns

Run one pack per request:

```ts
const response = await agent.run({
  use: FinancePacks.stockResearch({ readOnlyByDefault: true }),
  prompt:
    "Prepare an equity research brief for a watchlist company. Mark missing data instead of inventing metrics.",
});
```

Combine a pack with a custom app skill:

```ts
agent
  .use(SupportPacks.ticketTriage())
  .use(MyInternalEscalationPolicySkill.create());
```

Use specs for a pack picker:

```ts
const choices = listPackSpecs().map((pack) => ({
  label: pack.name,
  domain: pack.domain,
  skills: pack.skillIds,
  requiresHumanReview: pack.humanReviewRequired ?? false,
}));
```
