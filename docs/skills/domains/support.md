# Support Domain Skills

The support domain provides 14 skills for ticket handling, knowledge base management, customer health monitoring, renewals, and QBR writing. Use them to build support automation agents, churn risk monitors, KB maintenance tools, and customer success assistants.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "auto",
}).use(createSkillPackByName("support"));

const response = await agent.run({
  prompt: "/triage-ticket Triage this support ticket: 'Our API integration stopped returning data after your maintenance window yesterday. This is blocking our release.'",
});
console.log(response.content);
```

## Skills

### Ticket Handling

| Skill | Directive | Purpose |
| --- | --- | --- |
| `ticket-triage` | `/triage-ticket` | Triage tickets by severity, customer impact, and product area |
| `support-response-writer` | `/write-support-response` | Write customer support responses that acknowledge impact and resolve clearly |
| `escalation-summary` | `/summarize-escalation` | Summarize an escalation with customer impact, timeline, and next steps |
| `support-macro-writer` | `/write-support-macro` | Write support macros that are accurate, empathetic, and policy-compliant |

### Knowledge Base

| Skill | Directive | Purpose |
| --- | --- | --- |
| `kb-article-writer` | `/write-kb-article` | Write knowledge base articles answering exact customer questions |
| `kb-freshness-review` | `/review-kb-freshness` | Review KB content for stale UI, policy drift, and outdated guidance |
| `kb-gap-analysis` | `/analyze-kb-gaps` | Analyze ticket and search data to identify missing KB coverage |

### Customer Success & Health

| Skill | Directive | Purpose |
| --- | --- | --- |
| `account-health-summary` | `/summarize-account-health` | Summarize account health from adoption, outcomes, and stakeholder signals |
| `churn-risk-review` | `/review-churn-risk` | Review churn risk signals: adoption decline, sponsor changes, sentiment |
| `customer-outcome-plan` | `/plan-customer-outcome` | Create a customer outcome plan with target outcomes and milestones |
| `sentiment-risk-review` | `/review-sentiment-risk` | Review conversation sentiment for escalation risk and signal patterns |

### Renewals & QBR

| Skill | Directive | Purpose |
| --- | --- | --- |
| `renewal-risk-analysis` | `/analyze-renewal-risk` | Analyze renewal risk by value realization and adoption breadth |
| `qbr-writer` | `/write-qbr` | Write a QBR narrative connecting customer goals and outcomes |
| `refund-policy-review` | `/review-refund-policy` | Review refund and credit requests against policy and evidence |

## Patterns

### Support Ticket Automation

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";

const supportAgent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "directive-only",
}).use(createSkillPackByName("support"));

async function processTicket(ticket: { subject: string; body: string; accountTier: string }) {
  // Triage first
  const triage = await supportAgent.run({
    prompt: `/triage-ticket Triage this ${ticket.accountTier} customer ticket.
    
    Subject: ${ticket.subject}
    Body: ${ticket.body}`,
  });

  // Write response
  const response = await supportAgent.run({
    prompt: `/write-support-response Write a support response for this ticket.
    
    Triage: ${triage.content}
    Ticket: ${ticket.body}`,
  });

  return { triage: triage.content, response: response.content };
}
```

### Knowledge Base Maintenance Pipeline

```ts
const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "directive-only",
}).use(createSkillPackByName("support"));

// Identify gaps from ticket data
const gapAnalysis = await agent.run({
  prompt: `/analyze-kb-gaps Identify KB gaps from this ticket analysis.
  
  Top deflection failures (last 30 days):
  - "how to set up SSO" — 47 tickets, no KB article
  - "API rate limit errors" — 31 tickets, outdated article
  - "bulk import CSV format" — 28 tickets, article missing examples`,
});

// Write missing articles
const ssoArticle = await agent.run({
  prompt: `/write-kb-article Write a KB article: "How to set up SAML SSO".
  
  Target readers: IT admins at enterprise companies.
  Product: AgentCraft Cloud. Auth: Okta, Azure AD, Google Workspace supported.`,
});

// Review existing articles for staleness
const freshnessReview = await agent.run({
  prompt: `/review-kb-freshness Review these KB articles for staleness.
  
  Articles to review: [list of article titles and last-updated dates]
  Recent product changes: New UI launched March 2025, OAuth flow changed.`,
});
```

### Churn Risk and Renewal Pipeline

```ts
const accountData = `
Account: Acme Corp (Enterprise, $80K ARR)
Renewal: 45 days
Usage: API calls down 40% vs. 3 months ago
Sponsor: CTO left last month, no new contact established
Last CSM call: 8 weeks ago
Support tickets: 3 open, 1 critical (unresolved 10 days)
`;

// Health summary
const healthSummary = await agent.run({
  prompt: `/summarize-account-health Summarize account health.
  
  ${accountData}`,
});

// Churn risk
const churnRisk = await agent.run({
  prompt: `/review-churn-risk Review churn risk signals.
  
  Health summary: ${healthSummary.content}`,
});

// Renewal risk
const renewalRisk = await agent.run({
  prompt: `/analyze-renewal-risk Analyze renewal risk and recommend intervention.
  
  Churn signals: ${churnRisk.content}
  Renewal in: 45 days`,
});
```

## Optional Adapters

| Adapter | Benefit |
| --- | --- |
| `FileSystemAdapter` | Load KB articles, support macros, and policy documents |
| `FetchAdapter` | Fetch from Zendesk, Intercom, and support platform APIs |
| `DatabaseAdapter` | Query ticket and account health data directly |
| `EmailAdapter` | Send customer outcome plans and QBR summaries |

## Related

- [Industry Domain Skills Overview](./overview.md)
- [Sales Domain](./sales.md)
- [Product Domain](./product.md)
