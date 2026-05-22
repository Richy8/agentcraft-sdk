# Healthcare Domain Skills

The healthcare domain provides 11 skills for clinical documentation, patient education, medical literature synthesis, and regulatory claim review. Use them to build clinical summary agents, patient communication assistants, evidence review pipelines, and compliance reviewers.

> **Important:** Healthcare skills are designed to support clinicians and health writers with documentation, education, and research tasks. They are not a substitute for clinical judgment and should never be used for direct medical diagnosis or treatment decisions.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "auto",
}).use(createSkillPackByName("healthcare"));

const response = await agent.run({
  prompt: "/write-patient-education Write a patient education handout explaining Type 2 diabetes management for a newly diagnosed adult patient.",
});
console.log(response.content);
```

## Skills

### Clinical Documentation

| Skill | Directive | Purpose |
| --- | --- | --- |
| `clinical-note-summary` | `/summarize-clinical-note` | Concise, clinically faithful summary of a SOAP or progress note |
| `intake-summary` | `/summarize-intake` | Transform raw patient intake data into a structured clinical summary |
| `care-plan-summary` | `/summarize-care-plan` | Condense a multi-section care plan into a structured hierarchy |
| `care-instruction-summary` | `/write-care-instructions` | Write post-visit or post-procedure care instructions in plain language |
| `referral-letter-draft` | `/draft-referral` | Draft a specialist referral letter with clinical context and urgency |

### Patient Education

| Skill | Directive | Purpose |
| --- | --- | --- |
| `patient-education-writer` | `/write-patient-education` | Write patient education materials — condition explanations, care guides |
| `medical-plain-language-review` | `/review-plain-language` | Review clinical documents for readability and plain language compliance |

### Research & Evidence

| Skill | Directive | Purpose |
| --- | --- | --- |
| `medical-literature-synthesis` | `/synthesize-literature` | Synthesize a set of clinical studies into a structured evidence summary |
| `clinical-guideline-comparison` | `/compare-guidelines` | Compare clinical practice guidelines across organizations |
| `evidence-grade-review` | `/grade-evidence` | Review clinical claims for evidence quality and grade strength |

### Compliance

| Skill | Directive | Purpose |
| --- | --- | --- |
| `health-claim-risk-review` | `/review-health-claims` | Review health content for regulatory risk and substantiation gaps |

## Patterns

### Clinical Document Processing Pipeline

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";
import { FileSystemAdapter } from "@deskcreate/agentcraft/adapters";

const clinicalAgent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "directive-only",
})
  .use(createSkillPackByName("healthcare"))
  .use(FileSystemAdapter.connect({ rootPath: "./clinical-docs", readOnly: true }));

// Summarize intake form
const intakeSummary = await clinicalAgent.run({
  prompt: `/summarize-intake Summarize this patient intake form.
  
  Chief complaint: Shortness of breath on exertion
  PMH: HTN, T2DM (Dx 2018), ex-smoker (quit 2020)
  Medications: Metformin 1000mg BID, Lisinopril 10mg daily
  Allergies: Penicillin (rash)`,
});

// Summarize care plan
const carePlanSummary = await clinicalAgent.run({
  prompt: `/summarize-care-plan Summarize this care plan for the patient and care team.
  
  Intake context: ${intakeSummary.content}`,
});

// Write patient education
const education = await clinicalAgent.run({
  prompt: `/write-patient-education Write discharge education materials based on this care plan.
  
  Care plan: ${carePlanSummary.content}`,
});
```

### Medical Literature Evidence Review

```ts
const synthesis = await agent.run({
  prompt: `/synthesize-literature Synthesize these 5 RCTs on GLP-1 receptor agonists for weight loss.
  
  Studies: [list of abstracts with sample sizes, outcomes, follow-up periods]`,
});

const evidenceGrade = await agent.run({
  prompt: `/grade-evidence Grade the evidence quality from this synthesis.
  
  Synthesis: ${synthesis.content}`,
});
```

### Health Content Compliance Review

```ts
const agent = Agent.create({
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  skillActivation: "directive-only",
}).use(createSkillPackByName("healthcare"));

// Review marketing copy for regulatory risk
const claimReview = await agent.run({
  prompt: `/review-health-claims Review this supplement marketing copy for regulatory and substantiation risk.
  
  Copy: "Our product clinically proven to reverse aging and boost immune function by 300%."`,
});

// Check readability for patient-facing content
const plainLanguageReview = await agent.run({
  prompt: `/review-plain-language Review this patient consent form for readability.
  
  Target audience: General adult population, 6th-grade reading level target.`,
});
```

## Optional Adapters

| Adapter | Benefit |
| --- | --- |
| `FileSystemAdapter` | Load clinical notes, care plans, and patient intake forms |
| `FetchAdapter` | Fetch from PubMed, clinical guideline databases, and regulatory sources |
| `TavilySearchAdapter` | Search for clinical guidelines and medical literature |

## Related

- [Industry Domain Skills Overview](./overview.md)
- [Legal Domain](./legal.md)
- [Support Domain](./support.md)
