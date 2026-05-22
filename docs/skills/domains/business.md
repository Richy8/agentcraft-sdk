# Business Operations Domain Skills

The business domain provides 30 skills covering strategy, business planning, operations, investments, partnerships, and market expansion. Use them to build strategy advisors, due diligence pipelines, business plan generators, and executive decision support agents.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "auto",
})
  .use(createSkillPackByName("business"))
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

const response = await agent.run({
  prompt: "/analyze-business-model Analyze the business model of a B2B SaaS company targeting mid-market engineering teams.",
});
console.log(response.content);
```

## Skills

### Strategy

| Skill | Directive | Purpose |
| --- | --- | --- |
| `business-model-analysis` | `/analyze-business-model` | Analyze how a business creates, delivers, and captures value |
| `strategic-options-brief` | `/brief-strategic-options` | Develop and evaluate a structured set of strategic options |
| `market-entry-strategy` | `/strategize-market-entry` | Develop a market entry strategy with beachhead segment and sequencing |
| `competitive-moat-review` | `/review-moat` | Critically evaluate a company's claimed competitive advantages |
| `executive-decision-memo` | `/write-decision-memo` | Write a concise, decision-forcing executive memo |

### Business Planning

| Skill | Directive | Purpose |
| --- | --- | --- |
| `business-plan-research` | `/research-plan` | Gather and validate market, customer, competitor, and financial data |
| `business-plan-writer` | `/write-plan` | Draft a complete, investor-ready business plan |
| `financial-projection-narrative` | `/narrate-projections` | Translate a financial model into a written narrative |
| `go-to-market-plan-review` | `/review-gtm` | Critically review a go-to-market plan for logical coherence |
| `investor-pitch-review` | `/review-pitch` | Review an investor pitch deck for narrative and evidence quality |

### Operations

| Skill | Directive | Purpose |
| --- | --- | --- |
| `business-kpi-review` | `/review-kpis` | Review a KPI set for completeness and leading vs. lagging balance |
| `business-process-analysis` | `/analyze-processes` | Identify bottlenecks, waste, and high-leverage improvement areas |
| `business-risk-register` | `/register-risks` | Build or update a structured risk register |
| `cost-optimization-brief` | `/brief-cost-cuts` | Identify and prioritize cost reduction opportunities |
| `operating-model-design` | `/design-operating-model` | Design an operating model that aligns with strategy |

### Investments

| Skill | Directive | Purpose |
| --- | --- | --- |
| `business-investment-opportunity-research` | `/research-opportunity` | Research a business investment opportunity with evidence |
| `business-investment-risk-review` | `/review-investment-risk` | Identify and assess the full spectrum of investment risks |
| `business-valuation-review` | `/review-valuation` | Critically review a business valuation analysis |
| `business-investment-thesis-writer` | `/write-thesis` | Write a rigorous investment thesis document |
| `business-due-diligence-brief` | `/brief-diligence` | Synthesize diligence findings across business model and financials |
| `business-exit-scenario-analysis` | `/analyze-exits` | Model and evaluate multiple exit pathways for an investment |

### Partnerships

| Skill | Directive | Purpose |
| --- | --- | --- |
| `partnership-opportunity-research` | `/research-partnerships` | Research potential partnership opportunities by mapping the landscape |
| `partner-fit-analysis` | `/analyze-partner-fit` | Evaluate strategic, commercial, and operational fit |
| `partnership-proposal-writer` | `/write-partnership-proposal` | Write a persuasive, partner-centric partnership proposal |
| `partnership-risk-review` | `/review-partnership-risk` | Identify and assess commercial, legal, and operational risks |

### Market Expansion

| Skill | Directive | Purpose |
| --- | --- | --- |
| `new-market-research` | `/research-market` | Research market attractiveness, structure, and entry requirements |
| `market-sizing-review` | `/review-market-size` | Critically review a market sizing analysis for methodological soundness |
| `market-entry-strategy` | `/strategize-market-entry` | Develop a market entry strategy with beachhead segment |
| `country-expansion-brief` | `/brief-expansion` | Synthesize market, regulatory, and operational country expansion data |
| `expansion-readiness-review` | `/assess-readiness` | Assess operational, financial, legal, and cultural readiness |
| `localization-risk-review` | `/review-localization-risk` | Identify product, content, legal, and cultural localization risks |

## Patterns

### Due Diligence Pipeline

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";
import { TavilySearchAdapter, FileSystemAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "directive-only",
})
  .use(createSkillPackByName("business"))
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }))
  .use(FileSystemAdapter.connect({ rootPath: "./diligence-docs", readOnly: true }));

// Research the opportunity
const opportunity = await agent.run({
  prompt: `/research-opportunity Research the investment opportunity for Acme SaaS.
  Focus: market position, growth trajectory, competitive moat.`,
});

// Review risks
const risks = await agent.run({
  prompt: `/review-investment-risk Identify investment risks based on this opportunity research.
  
  Opportunity data: ${opportunity.content}`,
});

// Write thesis
const thesis = await agent.run({
  prompt: `/write-thesis Write an investment thesis that incorporates opportunity and risk findings.
  
  Opportunity: ${opportunity.content.slice(0, 600)}
  Risks: ${risks.content.slice(0, 400)}`,
});

console.log(thesis.content);
```

### Strategy Briefing Agent

```ts
const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
}).use(createSkillPackByName("business"));

// Analyze current state
const modelAnalysis = await agent.run({
  prompt: "/analyze-business-model Analyze the business model for a marketplace connecting freelance engineers with startups.",
});

// Generate strategic options
const options = await agent.run({
  prompt: `/brief-strategic-options Based on this business model analysis, develop 3 distinct strategic growth options.
  
  Context: ${modelAnalysis.content.slice(0, 500)}`,
});

// Write executive decision memo
const memo = await agent.run({
  prompt: `/write-decision-memo Write an executive memo recommending which strategic option to pursue.
  
  Options: ${options.content}`,
});
```

### Market Expansion Readiness Check

```ts
const research = await agent.run({
  prompt: `/research-market Research the German market for B2B project management SaaS.
  Focus: TAM, competitive landscape, enterprise procurement patterns, data residency requirements.`,
});

const readiness = await agent.run({
  prompt: `/assess-readiness Assess our readiness to expand into Germany.
  
  Market research: ${research.content}
  Company context: 50 employees, $5M ARR, EU GDPR compliant, no local entity yet.`,
});
```

## Optional Adapters

| Adapter | Benefit |
| --- | --- |
| `TavilySearchAdapter` | Live market research, competitor data, and industry news |
| `FirecrawlAdapter` | Deep competitor site crawling for positioning analysis |
| `FileSystemAdapter` | Load financial models, pitch decks, and due diligence documents |
| `FetchAdapter` | Fetch public filings, analyst reports, and market data |

## Related

- [Industry Domain Skills Overview](./overview.md)
- [Finance Domain](./finance.md)
- [Marketing Domain](./marketing.md)
