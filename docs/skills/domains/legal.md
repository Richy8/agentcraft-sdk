# Legal Domain Skills

The legal domain provides 12 skills for contract review, policy drafting, compliance analysis, and regulatory claim review. Use them to build contract intelligence agents, policy compliance assistants, and legal document summarizers.

> **Important:** Legal skills are designed to support lawyers, compliance teams, and legal operations professionals with document analysis and drafting tasks. They are not legal advice and should not substitute for qualified legal counsel in specific matters.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";
import { FileSystemAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "auto",
})
  .use(createSkillPackByName("legal"))
  .use(FileSystemAdapter.connect({ rootPath: "./contracts", readOnly: true }));

const response = await agent.run({
  prompt: "/review-contract-risk Review this SaaS vendor agreement for provisions that create unacceptable risk.",
});
console.log(response.content);
```

## Skills

### Contract Review

| Skill | Directive | Purpose |
| --- | --- | --- |
| `contract-risk-review` | `/review-contract-risk` | Review contracts for provisions that create unacceptable risk |
| `contract-summary` | `/summarize-contract` | Structured executive summary of a contract with key obligations and dates |
| `clause-comparison` | `/compare-clauses` | Compare contract clauses across drafts or counterparties |
| `negotiation-issue-list` | `/list-negotiation-issues` | Prioritized list of negotiation issues with positions |
| `legal-review-brief` | `/brief-legal-review` | Structured brief for legal counsel reviewing a specific agreement |

### Policy & Compliance

| Skill | Directive | Purpose |
| --- | --- | --- |
| `policy-draft-writer` | `/draft-policy` | Draft organizational policies satisfying regulatory requirements |
| `policy-gap-analysis` | `/analyze-policy-gaps` | Analyze existing policies against regulatory frameworks for gaps |
| `compliance-checklist` | `/build-compliance-checklist` | Generate a compliance checklist mapped to specific regulations |
| `policy-change-summary` | `/summarize-policy-change` | Summarize changes between policy versions with risk flags |
| `policy-plain-language-review` | `/review-plain-language` | Review policies for readability and plain language compliance |

### Audit & Claims

| Skill | Directive | Purpose |
| --- | --- | --- |
| `audit-evidence-summary` | `/summarize-audit-evidence` | Synthesize audit evidence into a structured findings summary |
| `regulated-claim-review` | `/review-regulated-claim` | Review marketing and product claims for regulatory compliance |

## Patterns

### Contract Review Pipeline

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";
import { FileSystemAdapter } from "@deskcreate/agentcraft/adapters";

const legalAgent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "directive-only",
})
  .use(createSkillPackByName("legal"))
  .use(FileSystemAdapter.connect({ rootPath: "./contracts", readOnly: true }));

// Summarize the agreement
const summary = await legalAgent.run({
  prompt: `/summarize-contract Summarize this enterprise SaaS subscription agreement.
  Focus: payment terms, data processing obligations, IP ownership, termination rights.`,
});

// Identify risks
const riskReview = await legalAgent.run({
  prompt: `/review-contract-risk Review this agreement for unacceptable risk provisions.
  
  Contract summary: ${summary.content}`,
});

// Build negotiation list
const negotiationList = await legalAgent.run({
  prompt: `/list-negotiation-issues Build a prioritized negotiation issue list from this risk review.
  
  Risk findings: ${riskReview.content}
  Our position: buyer, mid-market company, $50K/year contract.`,
});
```

### Compliance Gap Analysis

```ts
const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "directive-only",
}).use(createSkillPackByName("legal"));

// Analyze policy gaps
const gapAnalysis = await agent.run({
  prompt: `/analyze-policy-gaps Analyze our data privacy policy for GDPR and CCPA compliance gaps.
  
  Current policy: [policy text]
  Regulations: GDPR Art. 13/14 disclosure requirements, CCPA consumer rights.`,
});

// Generate compliance checklist
const checklist = await agent.run({
  prompt: `/build-compliance-checklist Build a GDPR compliance checklist for our SaaS product.
  
  Gap analysis context: ${gapAnalysis.content}`,
});

// Draft missing policies
const policyDraft = await agent.run({
  prompt: `/draft-policy Draft a data subject rights request handling policy based on these gaps.
  
  Gaps identified: ${gapAnalysis.content.slice(0, 500)}`,
});
```

### Regulated Claims Screening

```ts
// Screen marketing content before publishing
const claimReview = await agent.run({
  prompt: `/review-regulated-claim Review this email campaign copy for FTC and FDA advertising compliance.
  
  Industry: dietary supplements
  Copy: [email body text]
  Market: US consumers`,
});
```

## Optional Adapters

| Adapter | Benefit |
| --- | --- |
| `FileSystemAdapter` | Load contracts, policies, and compliance documents |
| `FetchAdapter` | Fetch regulatory frameworks, official guidance, and case law |
| `TavilySearchAdapter` | Research regulatory interpretations and enforcement actions |

## Related

- [Industry Domain Skills Overview](./overview.md)
- [Healthcare Domain](./healthcare.md)
- [Business Domain](./business.md)
