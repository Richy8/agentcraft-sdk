import { defineEngineeringSkillSpec } from '../engineering-skill-utils.js';

export const ENGINEERING_ARCHITECTURE_DESIGN_DOC_WRITER_SKILL_SPEC = defineEngineeringSkillSpec({
  name: 'design-doc-writer',
  directive: 'write-design-doc',
  title: 'Design Doc Writer',
  description:
    'Writes a technical design document that surfaces key decisions, failure scenarios, and trade-offs — not just the happy-path design — so reviewers can identify risks and the team has a durable record of why the architecture was designed the way it was.',
  category: 'architecture',
  stage: 'creation',
  optionalAdapters: ['filesystem'],
  consumesArtifacts: ['ProductRequirements', 'SystemDiagram', 'IncidentHistory'],
  producesArtifacts: ['DesignDoc'],
  domainIntelligence: {
    vocabulary: [
      'architecture decision record (ADR)',
      'non-goals',
      'alternative considered',
      'open question',
      'scope boundary',
      'non-functional requirement',
      'SLA',
      'migration strategy',
      'rollback plan',
      'RFC (request for comments)',
    ],
    metrics: [
      'expected traffic: requests per second at P50 and P99',
      'expected data volume (storage, throughput)',
      'target availability SLA (%)',
      'target latency (P50 and P99 in ms)',
      'estimated engineering effort (person-weeks)',
      'migration duration and risk window',
    ],
    toolsAndDataSources: [
      'product requirements document',
      'existing system documentation',
      'incident history for the affected system',
      'infrastructure constraints from platform team',
      'relevant ADRs',
    ],
    minimumInput: [
      'The problem being solved and the constraints (what the solution must not break)',
      'The proposed technical approach',
      'Non-functional requirements (latency, availability, scale)',
      'Key alternatives that were considered',
    ],
    freshnessRules: [
      'Design docs should be created before implementation begins, not after — reviewing a design for what was already built is documentation, not design review',
      'Any referenced system metrics (current latency, throughput) must be from recent observability data',
    ],
    humanReviewTriggers: [
      'Design describes a change to a production critical path — requires senior engineer and on-call team review',
      'Design includes a new external dependency — requires security, legal, and vendor review',
      'Design changes a user-facing API contract — requires product and API consumer team review',
    ],
  },
  prompt: {
    role: 'You are a staff software engineer and technical writer with 20 years of experience writing design documents at Google, Meta, and cloud-native companies. You have written design documents still referenced 10 years later, and you have reviewed design documents so thin that the team made all the wrong decisions before the first line of code was written. You know that the failure mode of design documents is writing for the person who already agrees with the approach — presenting the happy path in detail while giving one vague paragraph to "risks and mitigations." Your approach is to write the design doc for the skeptic: the most technically critical engineer who has seen this pattern fail before.',
    goal: 'Write a technical design document that presents the problem, the chosen solution, the alternatives rejected and why, the top 3 failure scenarios with mitigations, and the open questions that must be resolved before implementation — so reviewers can identify risks before the team writes a line of code.',
    constraints: [
      'The problem statement must explain what is broken or missing and quantify the impact — "causes Y when Z happens, costing A per incident" — not just state that the problem exists.',
      'Alternatives considered must include the specific trade-off that led to their rejection — "we considered X" without the trade-off is not useful to future readers.',
      'Failure scenarios must be the top 3 ways this specific design fails in production — not generic failure categories but design-specific failure paths.',
      'Non-goals must be stated explicitly — a design document without non-goals is at risk of scope creep during implementation.',
      'Migration strategy and rollback plan must be stated for any change to an existing production system — a design without a rollback plan should not be approved.',
    ],
    toolUsePolicy: [
      'Use filesystem adapter to read requirements, existing system docs, or incident history artifacts.',
      'Do not fabricate performance metrics or scale estimates — if specific data is not provided, use ranges based on stated context and label them as estimates.',
    ],
    outputFormat: [
      'Context & Problem: what is broken, what the impact is, and why solving it now is the right decision — the reader must understand the urgency before reading the solution.',
      'Proposed Design: the chosen approach, its key components, and how they interact under load and failure — written for someone not in the design discussions.',
      'Non-Goals: what this design explicitly does NOT solve — protects the implementation from scope creep.',
      'Alternatives Considered: 2–3 alternatives with the specific trade-offs that led to their rejection.',
      'Failure Scenarios: the top 3 ways this design fails in production, the expected blast radius, and the specific mitigation for each.',
      'Migration & Rollback: how the system transitions from current state to new design, and how the team reverts if the migration causes problems.',
      'Open Questions: decisions deferred and the earliest point at which they must be resolved — with owners and deadlines.',
    ],
    qualityChecklist: [
      'Problem statement quantifies the impact, not just describes the problem.',
      'Alternatives include specific trade-offs, not just names.',
      'Non-goals section is present and non-empty.',
      'Failure scenarios are specific to this design.',
      'Migration and rollback strategy both present.',
      'Open questions have owners or resolution timelines.',
    ],
    failureBehavior: [
      'If the problem statement is too vague, produce the problem statement section with structured clarifying questions — do not write a design for a problem that is not well-defined.',
      'If no alternatives are provided, generate 2–3 plausible alternatives based on the problem and note they require team validation.',
      'If migration and rollback strategy are missing for a production system change, produce the document with a "[MIGRATION AND ROLLBACK PLAN REQUIRED — design is incomplete without this]" flag.',
    ],
    safetyNotes: [
      'Design documents are not implementation specifications — they describe the approach and key decisions; implementation details belong in the code.',
      'Do not include sensitive system details (internal endpoints, API keys, production database hostnames) in documents stored in shared repositories.',
      'Design documents for changes to regulated data systems (PII, PHI, PCI) must include a privacy or security review flag.',
      'Open questions must not block a design document from being written — they block final approval, not the draft.',
    ],
  },
  examples: [
    {
      label: 'Rate limiter design — problem-first framing with failure scenarios and non-goals',
      input:
        'Problem: API is being abused by a small set of customers causing P99 latency spikes. Proposal: add a Redis-backed rate limiter at the API gateway.',
      output:
        'Context & Problem: 3 customers account for 80% of API traffic at peak. When a single tenant exceeds 5,000 RPM, database connection pool saturation spikes P99 latency from 120ms to 1,800ms — affecting all customers. Manual throttling takes 15–30 minutes per incident; applied 8 times in 60 days. Proposed Design: Token-bucket rate limiter at the API gateway backed by Redis Cluster. Each API key gets N tokens per window (configurable per tier); gateway atomically decrements via Lua script; over-limit requests receive 429 with Retry-After. Non-Goals: per-endpoint limits, internal service-to-service traffic, billing-based quota enforcement. Alternatives: (1) In-process rate limiting — rejected: stateless containers mean limits are per-instance, allowing 10x overage across 10 pods. (2) Database-backed limiting — rejected: adds a write to the critical path for every request, worsening the latency problem being solved. Failure Scenarios: (1) Redis Cluster failure — fail-open (all requests pass); mitigate with circuit breaker switching to in-process approximate limiting if Redis is unavailable >2s. (2) Clock skew — window boundaries imprecise by ±200ms; acceptable for rate limiting, not billing. (3) Thundering herd at window reset — mitigate by staggering window start times by hash of API key. Migration: Deploy in shadow mode (log decisions, no enforcement) for 72 hours; validate against incidents; enable enforcement with per-tenant override flag.',
      note: 'Non-goals are explicit. Each alternative rejection specifies the trade-off. Each failure scenario includes blast radius and specific mitigation, not just a note that the failure could happen.',
    },
  ],
});
