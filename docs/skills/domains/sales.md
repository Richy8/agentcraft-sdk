# Sales Domain Skills

The sales domain provides 23 skills for account research, prospecting, deal review, pipeline management, proposal writing, and sales coaching. Use them to build sales intelligence agents, deal review assistants, proposal generators, and pipeline risk monitors.

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
  .use(createSkillPackByName("sales"))
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

const response = await agent.run({
  prompt: "/research-prospect Research Stripe as a prospective enterprise account. Focus on engineering team structure, recent growth signals, and tech stack.",
});
console.log(response.content);
```

## Skills

### Account Research & Intelligence

| Skill | Directive | Purpose |
| --- | --- | --- |
| `prospect-research` | `/research-prospect` | Research a prospect to determine ICP fit and entry strategy |
| `account-news-research` | `/research-account-news` | Classify account news into actionable triggers and background |
| `account-fit-analysis` | `/analyze-account-fit` | Score an account against ICP, timing, and disqualifiers |
| `buying-committee-analysis` | `/analyze-buying-committee` | Analyze buying committee completeness and role coverage |
| `stakeholder-map` | `/map-stakeholders` | Map known and likely stakeholders by buying role and authority |

### Outreach & Prospecting

| Skill | Directive | Purpose |
| --- | --- | --- |
| `outreach-personalization` | `/personalize-outreach` | Turn prospect research into respectful, relevant outreach |
| `lead-prioritization` | `/prioritize-leads` | Prioritize leads by fit, buying signal quality, and consensus |
| `prospecting-risk-review` | `/review-prospecting-risk` | Review prospect lists for privacy, compliance, and quality risk |

### Deal Management

| Skill | Directive | Purpose |
| --- | --- | --- |
| `deal-review` | `/review-deal` | Review a single opportunity for stage truth and buyer evidence |
| `crm-note-summarizer` | `/summarize-crm-notes` | Turn messy CRM notes into buyer-confirmed next steps |
| `crm-next-step-planner` | `/plan-next-step` | Plan the next buyer-verified action to advance the deal |
| `pipeline-risk-analysis` | `/analyze-pipeline-risk` | Analyze pipeline quality separating headline from real coverage |
| `forecast-narrative-writer` | `/write-forecast-narrative` | Write an evidence-backed forecast narrative |

### Objection Handling

| Skill | Directive | Purpose |
| --- | --- | --- |
| `objection-research` | `/research-objection` | Diagnose an objection preserving exact buyer language |
| `objection-response-writer` | `/write-objection-response` | Write buyer-safe objection responses validating the concern |
| `competitive-objection-review` | `/review-competitive-objection` | Review competitive objections for buyer criteria and traps |

### Proposals

| Skill | Directive | Purpose |
| --- | --- | --- |
| `proposal-writer` | `/write-proposal` | Write a buyer-ready proposal connecting discovery to value |
| `proposal-discovery-synthesis` | `/synthesize-discovery` | Synthesize discovery into a proposal-readiness brief |
| `proposal-red-team-review` | `/red-team-proposal` | Pressure-test a proposal for deal-loss paths and unsupported claims |
| `proposal-objection-review` | `/review-proposal-objections` | Review a proposal for likely buyer objections and proof gaps |
| `proposal-pricing-rationale` | `/explain-pricing` | Build a defensible pricing rationale separating value from cost |

### Coaching & Analysis

| Skill | Directive | Purpose |
| --- | --- | --- |
| `account-plan-writer` | `/write-account-plan` | Write an executable account plan with thesis, stakeholders, and plays |
| `sales-call-coach` | `/coach-sales-call` | Coach sales calls by diagnosing evidence-backed moments |

## Patterns

### Account Research to Outreach Pipeline

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";

const salesAgent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "directive-only",
})
  .use(createSkillPackByName("sales"))
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

// Research the prospect
const research = await salesAgent.run({
  prompt: `/research-prospect Research Notion as a prospective enterprise account.
  ICP criteria: 200-2000 employees, engineering-led, using multiple dev tools.`,
});

// Analyze fit
const fitAnalysis = await salesAgent.run({
  prompt: `/analyze-account-fit Score Notion against our ICP.
  
  Research: ${research.content}
  ICP: B2B SaaS, engineering team 50+, budget >$50K/year.`,
});

// Personalize outreach
const outreach = await salesAgent.run({
  prompt: `/personalize-outreach Write a personalized cold outreach email for the VP Engineering at Notion.
  
  Account research: ${research.content.slice(0, 500)}
  Fit analysis: ${fitAnalysis.content.slice(0, 300)}`,
});
```

### Deal Review and Pipeline Inspection

```ts
const dealData = `
Account: Acme Corp
Stage: Proposal Sent
Amount: $120K ARR
Close date: End of quarter
Last activity: Demo 3 weeks ago, no response to follow-ups
Champion: Engineering Manager (no exec sponsor identified)
`;

const dealReview = await agent.run({
  prompt: `/review-deal Review this deal for stage truth and risk signals.
  
  ${dealData}`,
});

const nextStep = await agent.run({
  prompt: `/plan-next-step Plan the next action to advance or disqualify this deal.
  
  Deal review: ${dealReview.content}`,
});

const pipelineAnalysis = await agent.run({
  prompt: `/analyze-pipeline-risk Analyze Q3 pipeline risk.
  
  Pipeline: [15 deals, $1.8M total, $600K in late stage]
  Individual deal risk: ${dealReview.content.slice(0, 300)}`,
});
```

### Proposal Writing Pipeline

```ts
// Synthesize discovery call notes
const discoverySynthesis = await agent.run({
  prompt: `/synthesize-discovery Synthesize discovery call notes into proposal readiness brief.
  
  Notes: Pain is slow code review (avg 3 days). Stakeholders: VP Eng, CTO.
  Budget: $80-120K. Timeline: needs in Q3. Previous solution: manual.`,
});

// Write the proposal
const proposal = await agent.run({
  prompt: `/write-proposal Write a buyer-ready proposal based on this discovery.
  
  Discovery: ${discoverySynthesis.content}
  Product: AgentCraft Enterprise — AI-assisted code review SDK`,
});

// Red team it
const redTeam = await agent.run({
  prompt: `/red-team-proposal Pressure-test this proposal for deal-loss paths.
  
  Proposal: ${proposal.content}`,
});
```

## Optional Adapters

| Adapter | Benefit |
| --- | --- |
| `TavilySearchAdapter` | Live prospect research, news, and signal monitoring |
| `FirecrawlAdapter` | Deep prospect website crawling for positioning and tech stack |
| `EmailAdapter` | Send personalized outreach directly from the agent |
| `FetchAdapter` | Fetch from LinkedIn, Crunchbase, and company data APIs |

## Related

- [Industry Domain Skills Overview](./overview.md)
- [Marketing Domain](./marketing.md)
- [Support Domain](./support.md)
