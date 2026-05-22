# Product Domain Skills

The product domain provides 23 skills covering product discovery, PRD writing, roadmap prioritization, user research, launch planning, and usability review. Use them to build product intelligence agents, PRD generators, and user feedback analysis pipelines.

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
  .use(createSkillPackByName("product"))
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }));

const response = await agent.run({
  prompt: "/write-prd Write a PRD for an AI-powered PR review feature for GitHub. Target: engineering teams at mid-market SaaS companies.",
});
console.log(response.content);
```

## Skills

### Discovery & Research

| Skill | Directive | Purpose |
| --- | --- | --- |
| `user-problem-research` | `/research-problem` | Research a user problem by segment, context, and workarounds |
| `jtbd-synthesis` | `/synthesize-jtbd` | Synthesize customer evidence into jobs-to-be-done with confidence scores |
| `persona-profile-builder` | `/build-persona-profile` | Build evidence-backed persona profiles from observed behavior |
| `research-note-synthesis` | `/synthesize-research-notes` | Synthesize UX research notes into behaviors, quotes, and insights |
| `interview-guide-writer` | `/write-interview-guide` | Write an unbiased interview guide with research questions and probes |
| `user-feedback-clustering` | `/cluster-feedback` | Cluster user feedback into evidence-backed themes by sentiment and frequency |

### PRD & Specification

| Skill | Directive | Purpose |
| --- | --- | --- |
| `prd-writer` | `/write-prd` | Write an implementation-ready PRD with problem, goals, scope, and non-goals |
| `prd-discovery` | `/discover-prd` | Turn discovery evidence into PRD-ready scope and non-goals |
| `prd-risk-review` | `/review-prd-risk` | Review a PRD for hidden scope, risky assumptions, and data dependencies |
| `user-story-writer` | `/write-user-stories` | Write user stories with acceptance criteria and role/context |
| `acceptance-criteria-review` | `/review-acceptance-criteria` | Review acceptance criteria for testability and edge case coverage |

### Roadmap & Prioritization

| Skill | Directive | Purpose |
| --- | --- | --- |
| `roadmap-prioritization` | `/prioritize-roadmap` | Prioritize roadmap initiatives using evidence, strategy, and capacity |
| `roadmap-narrative-writer` | `/write-roadmap-narrative` | Write a roadmap narrative explaining strategy and sequencing |
| `rice-score-review` | `/review-rice-score` | Review RICE scores for inflated reach and vague impact estimates |
| `dependency-map` | `/map-dependencies` | Map roadmap dependencies across engineering, design, data, and legal |
| `opportunity-solution-tree` | `/map-opportunity-tree` | Map opportunities, assumptions, bets, and experiments |

### Competitive & Market

| Skill | Directive | Purpose |
| --- | --- | --- |
| `competitor-feature-analysis` | `/analyze-competitor-features` | Analyze competitor capabilities, positioning, and gaps |
| `go-to-market-brief` | `/brief-gtm` | Create a go-to-market brief aligning audience, value prop, and channels |

### Launch & Quality

| Skill | Directive | Purpose |
| --- | --- | --- |
| `launch-plan` | `/plan-launch` | Plan a product launch with cohort, messaging, and readiness criteria |
| `launch-readiness-review` | `/review-launch-readiness` | Review launch readiness across behavior, customers, and operations |
| `rollout-risk-review` | `/review-rollout-risk` | Review rollout risk by cohort, blast radius, and telemetry |
| `release-note-writer` | `/write-release-notes` | Write release notes explaining what changed and who benefits |
| `usability-finding-review` | `/review-usability-findings` | Review usability findings for severity calibration and evidence quality |

## Patterns

### Discovery to PRD Pipeline

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";

const productAgent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "directive-only",
}).use(createSkillPackByName("product"));

// Synthesize research into JTBD
const jtbd = await productAgent.run({
  prompt: `/synthesize-jtbd Synthesize customer interviews into jobs-to-be-done.
  
  Research notes:
  - "I spend 2 hours every Monday manually reviewing PRs that block deployments"
  - "I need to catch security issues before the team merges bad code"
  - "I want my junior devs to learn from review feedback automatically"`,
});

// Translate to PRD scope
const discovery = await productAgent.run({
  prompt: `/discover-prd Turn this JTBD synthesis into PRD-ready scope.
  
  JTBD: ${jtbd.content}
  Constraints: Q3 release, 2 engineers, no ML infrastructure yet.`,
});

// Write the PRD
const prd = await productAgent.run({
  prompt: `/write-prd Write a complete PRD from this discovery work.
  
  Discovery: ${discovery.content}`,
});

// Review for risks
const riskReview = await productAgent.run({
  prompt: `/review-prd-risk Review this PRD for hidden scope and risky assumptions.
  
  PRD: ${prd.content}`,
});
```

### Roadmap Prioritization Agent

```ts
const initiatives = `
1. AI PR review assistant (high eng ask)
2. GitHub Actions integration (customer request, 15 accounts)
3. SAML SSO support (enterprise blocker)
4. Bulk CSV import (requested by 3 accounts)
5. Mobile app (nice-to-have)
`;

const prioritized = await agent.run({
  prompt: `/prioritize-roadmap Prioritize these initiatives for Q3.
  
  Initiatives: ${initiatives}
  Strategy: Win enterprise, reduce time-to-value.
  Capacity: 4 engineers, 12 weeks.`,
});

const narrative = await agent.run({
  prompt: `/write-roadmap-narrative Write a roadmap narrative for the Q3 plan.
  
  Prioritized: ${prioritized.content}`,
});
```

### Launch Readiness Check

```ts
const launchPlan = await agent.run({
  prompt: `/plan-launch Plan the launch for our AI PR review feature.
  
  Target cohort: Beta customers (50 teams)
  Timeline: 2 weeks to GA
  Channels: In-app, email, Product Hunt`,
});

const readinessReview = await agent.run({
  prompt: `/review-launch-readiness Review launch readiness.
  
  Launch plan: ${launchPlan.content}
  Current status: Feature shipped, docs pending, CS briefed, monitoring live.`,
});
```

## Optional Adapters

| Adapter | Benefit |
| --- | --- |
| `TavilySearchAdapter` | Live competitor research and market signals |
| `FileSystemAdapter` | Load user interviews, research notes, and existing PRDs |
| `FetchAdapter` | Fetch customer feedback from external sources |

## Related

- [Industry Domain Skills Overview](./overview.md)
- [Data & Analytics Domain](./data-analytics.md)
- [Marketing Domain](./marketing.md)
