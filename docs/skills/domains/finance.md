# Finance Domain Skills

The finance domain provides 24 skills for equity research, portfolio analysis, market scanning, financial statement review, and investment decision support. Use them to build research agents, portfolio risk monitors, earnings analysis pipelines, and financial briefing assistants.

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
  .use(createSkillPackByName("finance"))
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

const response = await agent.run({
  prompt: "/brief-equity-research Produce an equity research brief for MSFT. Focus on cloud segment growth and competitive positioning versus AWS.",
});
console.log(response.content);
```

## Skills

### Equity Research

| Skill | Directive | Purpose |
| --- | --- | --- |
| `equity-research-brief` | `/brief-equity-research` | Concise equity research brief synthesizing financials, growth, and risks |
| `investment-thesis-writer` | `/draft-investment-thesis` | Structured investment thesis with bull/bear cases and catalysts |
| `catalyst-analysis` | `/analyze-catalysts` | Identify and assess specific events or milestones that could drive returns |
| `earnings-call-analysis` | `/analyze-earnings-call` | Extract signal from earnings call transcripts — management tone, guidance |
| `investment-red-flag-review` | `/review-investment-red-flags` | Review an opportunity for financial, governance, and accounting red flags |
| `opportunity-screener` | `/screen-opportunity` | Screen an investment opportunity against a defined set of criteria |

### Portfolio Management

| Skill | Directive | Purpose |
| --- | --- | --- |
| `portfolio-exposure-analysis` | `/analyze-portfolio-exposure` | Analyze actual portfolio exposures across geographies, sectors, and factors |
| `portfolio-risk-review` | `/review-portfolio-risk` | Review portfolio for concentration risk, factor exposure, and drawdown risk |
| `portfolio-fit-brief` | `/brief-portfolio-fit` | Assess whether a prospective investment fits current portfolio strategy |
| `allocation-drift-review` | `/review-allocation-drift` | Review portfolio allocation drift against target weights |

### Market Research & Screening

| Skill | Directive | Purpose |
| --- | --- | --- |
| `stock-screening` | `/screen-stocks` | Screen a universe of stocks against quantitative and qualitative criteria |
| `sector-rotation-analysis` | `/analyze-sector-rotation` | Analyze cross-sector performance patterns and earnings trends |
| `macro-news-synthesis` | `/synthesize-macro-news` | Synthesize macro economic news and data into actionable implications |
| `market-update` | `/write-market-update` | Write a structured market update that goes beyond price description |
| `country-market-scan` | `/scan-country-market` | Structured single-country market assessment for investment purposes |
| `cross-country-opportunity-scan` | `/scan-cross-country-opportunities` | Scan multiple country markets to identify and rank investment opportunities |

### Financial Analysis

| Skill | Directive | Purpose |
| --- | --- | --- |
| `financial-statement-review` | `/review-financial-statements` | Review income statement, balance sheet, and cash flow for quality |
| `valuation-risk-review` | `/review-valuation-risk` | Review an equity or asset valuation for assumptions and methodology |
| `cash-flow-risk-review` | `/review-cash-flow-risk` | Review cash flow statements and projections for liquidity risk |
| `variance-analysis` | `/analyze-variance` | Decompose actual vs. budget variance into root causes |

### Reporting & Budgeting

| Skill | Directive | Purpose |
| --- | --- | --- |
| `monthly-finance-summary` | `/summarize-monthly-finance` | Concise executive-level monthly finance summary |
| `budget-narrative-writer` | `/draft-budget-narrative` | Draft a budget narrative explaining the financial strategy and tradeoffs |
| `currency-risk-brief` | `/brief-currency-risk` | Quantify and assess currency exposure and hedging implications |
| `private-market-opportunity-brief` | `/brief-private-market-opportunity` | Structured brief on a private market opportunity |

## Patterns

### Earnings Call Analysis Pipeline

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";
import { FetchAdapter } from "@deskcreate/agentcraft/adapters";

const financeAgent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "directive-only",
})
  .use(createSkillPackByName("finance"))
  .use(FetchAdapter.connect({ allowedDomains: ["earningscast.com", "seekingalpha.com"] }));

const earningsAnalysis = await financeAgent.run({
  prompt: `/analyze-earnings-call Analyze the Q3 2025 MSFT earnings call transcript.
  
  Transcript: [fetched from source]
  Focus: Azure growth commentary, AI monetization signals, management tone vs. guidance.`,
});

const redFlags = await financeAgent.run({
  prompt: `/review-investment-red-flags Review for red flags based on this earnings analysis.
  
  Earnings analysis: ${earningsAnalysis.content}`,
});
```

### Portfolio Risk Monitor

```ts
const portfolioContext = `
Holdings: AAPL 15%, MSFT 12%, AMZN 10%, GOOGL 8%, NVDA 7%, fixed income 30%, other 18%
Benchmark: S&P 500
Time horizon: 5 years
`;

const exposureAnalysis = await agent.run({
  prompt: `/analyze-portfolio-exposure Analyze this portfolio for sector and factor exposure.
  
  ${portfolioContext}`,
});

const riskReview = await agent.run({
  prompt: `/review-portfolio-risk Review portfolio risk given this exposure analysis.
  
  Exposure: ${exposureAnalysis.content}`,
});

const driftReview = await agent.run({
  prompt: `/review-allocation-drift Review allocation drift. Target: 60% equity, 30% fixed, 10% alternatives. Current matches portfolio above.`,
});
```

### Investment Thesis Generator

```ts
const thesis = await agent.run({
  prompt: `/draft-investment-thesis Write an investment thesis for Anthropic (hypothetical public company).
  
  Key data:
  - Revenue growing 300% YoY
  - Enterprise customers: 500+
  - Flagship: Claude API
  - Competition: OpenAI, Google DeepMind
  - Risks: regulatory, commoditization, model training costs`,
});

const catalysts = await agent.run({
  prompt: `/analyze-catalysts Identify near-term and long-term catalysts for this thesis.
  
  Thesis: ${thesis.content.slice(0, 600)}`,
});
```

## Optional Adapters

| Adapter | Benefit |
| --- | --- |
| `TavilySearchAdapter` | Live market data, news, and analyst coverage |
| `FetchAdapter` | Fetch earnings transcripts, SEC filings, and financial APIs |
| `FileSystemAdapter` | Load financial models, pitch decks, and portfolio snapshots |
| `DatabaseAdapter` | Query portfolio databases and historical price stores |

## Related

- [Industry Domain Skills Overview](./overview.md)
- [Business Domain](./business.md)
- [Data & Analytics Domain](./data-analytics.md)
