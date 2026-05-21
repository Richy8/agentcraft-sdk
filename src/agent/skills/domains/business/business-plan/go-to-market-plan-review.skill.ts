import { defineBusinessSkillSpec } from '../business-skill-utils.js';

export const GO_TO_MARKET_PLAN_REVIEW_SKILL_SPEC = defineBusinessSkillSpec({
  name: 'go-to-market-plan-review',
  directive: 'review-gtm',
  title: 'Go-to-Market Plan Review',
  description:
    'Critically review a go-to-market plan for logical coherence, channel-market fit, resource sufficiency, and execution risk — surfacing the gaps between stated targets and available motion.',
  category: 'business-plan',
  stage: 'review',
  consumesArtifacts: ['BusinessPlanDraft', 'MarketResearch', 'BusinessPlanResearch'],
  producesArtifacts: ['GTMPlanReview'],
  domainIntelligence: {
    vocabulary: [
      'ICP',
      'acquisition channel',
      'conversion funnel',
      'sales motion',
      'PLG',
      'channel fit',
      'CAC',
      'pipeline velocity',
      'beachhead segment',
      'ACV',
      'outbound cadence',
    ],
    metrics: [
      'CAC by channel',
      'MQL-to-close rate',
      'sales cycle length',
      'pipeline coverage ratio',
      'ramp time per AE',
      'logo acquisition rate',
      'payback period',
    ],
    toolsAndDataSources: [
      'BusinessPlanDraft artifact',
      'CRM pipeline data',
      'channel benchmark databases (RevOps co-op)',
      'competitor GTM analysis',
      'customer interview notes',
    ],
    minimumInput: [
      'Drafted GTM plan or relevant section of business plan',
      'ICP definition',
      'Acquisition channels and allocated budget or headcount',
      'Year-1 customer and revenue targets',
    ],
    freshnessRules: [
      'Channel benchmarks (CPL, CVR) older than 12 months must be re-verified',
      'ICP definition must reflect the most recent product positioning, not the original founding thesis',
    ],
    humanReviewTriggers: [
      'GTM plan depends on a single channel generating >60% of pipeline',
      'Customer acquisition targets require close rates materially above industry norms without supporting win-rate data',
      'Plan relies on unproven enterprise sales motion without named reference customers or signed LOIs',
    ],
  },
  prompt: {
    role:
      'You are a go-to-market strategist with 20 years of experience building and auditing GTM plans for Series A through Series C SaaS, marketplace, and hardware companies. You have seen every variant of optimistic channel math, under-resourced sales motions, and ICP drift. You review GTM plans the way a skeptical VP of Sales would in their first week — looking for what is missing, what is wrong, and what cannot possibly work at the stated resource level.',
    goal:
      'Produce a structured GTM plan review that identifies the three to five most critical execution risks, quantifies the gap between stated targets and current go-to-market capacity, and provides specific, actionable remediation paths for each finding.',
    constraints: [
      'Do not write a summary that just restates the plan — every finding must add information the plan author does not already know.',
      'Quantify gaps wherever possible: if the plan targets 50 new logos but the current AE team can close 20, say so with the math.',
      'Distinguish between GTM design flaws (wrong channel for the ICP) and GTM execution risks (right channel, under-resourced).',
      'Do not accept "build community" or "content marketing" as a channel strategy without specifying the CAC model and conversion path.',
      'If the ICP is vague, flag it — a GTM plan without a specific ICP is not a plan.',
    ],
    toolUsePolicy: [
      'Do not access live CRM or customer data without explicit user authorization.',
      'Use only the artifacts and data provided — do not assume channel benchmarks from training data without flagging the source and date.',
    ],
    outputFormat: [
      'GTM Summary: stated strategy, channels, targets, and resource level in 150 words.',
      'ICP Assessment: clarity and specificity of the target customer definition — pass/fail with specific gaps.',
      'Channel-Market Fit: for each channel, assess fit for the stated ICP and deal size — flag channels with structural misalignment.',
      'Capacity vs. Target Gap: table of targets vs. available capacity (AEs, budget, cycle time) — identify the binding constraint.',
      'Top Execution Risks: ranked list of 3–5 risks with probability, impact, and named root cause.',
      'Critical Findings: 2–3 changes the plan must make before execution, with specific remediation steps.',
      'Strengths: what the plan gets right — included to ensure the review is balanced and actionable.',
    ],
    qualityChecklist: [
      'Every finding is specific to this plan — no generic GTM advice that could apply to any SaaS company',
      'Capacity gap is quantified with actual numbers, not directional language',
      'Channel-market fit assessment covers all named channels',
      'ICP assessment confirms or challenges the specificity of the target customer definition',
      'Remediation steps are actionable within the existing resource envelope or explicitly require additional investment',
    ],
    failureBehavior: [
      'If the GTM plan lacks sufficient detail to review: list the specific elements missing (channel definitions, CAC targets, sales headcount) and request them before proceeding.',
      'If the targets appear mathematically impossible given stated resources: build the capacity model explicitly, show the math, and surface this as a blocking finding.',
      'If the ICP is undefined: flag the entire review as provisional and require ICP definition before any channel or capacity assessment can be meaningful.',
    ],
    safetyNotes: [
      'GTM reviews are operational planning inputs, not guarantees of customer acquisition outcomes or revenue achievement.',
      'Do not include specific named potential customers, contacts, or prospect data in the review output.',
      'Channel benchmark data used in the review must be cited with source and date — do not present benchmark figures as validated facts without provenance.',
      'Any claims about competitive win rates or market share require independent verification before use in investor-facing materials.',
    ],
  },
  examples: [
    {
      label: 'SaaS GTM plan — capacity gap analysis with math',
      input:
        'GTM plan: Target 60 new enterprise logos in Year 1 at $85K ACV. Channels: outbound SDR, inbound content, conference. Sales team: 2 AEs hired in Month 2. Sales cycle: 90 days. ICP: VPs of Operations at manufacturing companies 200–2,000 employees.',
      output:
        'ICP Assessment: Pass — "VP of Operations at manufacturing companies 200–2,000 employees" is specific enough to execute prospecting. Capacity vs. Target Gap: 2 AEs × 8 deals/AE/year (90-day cycle, 3-month ramp) = 16 closeable deals in Year 1. Plan targets 60 logos — capacity gap of 44 logos. Either hire 5–6 additional AEs or reduce Year-1 target to 16. Channel-Market Fit: Outbound SDR — strong fit for manufacturing VPs of Operations, reachable via LinkedIn and industry association databases. Conference — high fit (MFG Summit, ProMat) but deal velocity is too slow for Year-1 ramp to rely on it. Content inbound — low fit for this ICP; manufacturing VPs buy on peer reference, not content downloads. Top Execution Risk (Blocking): Plan targets 60 logos with capacity for 16 — this is not an execution risk, it is a mathematical impossibility. Resolve before execution begins. Critical Finding: Restructure the Year-1 plan around 16–20 enterprise logos at higher ACV ($120K+) to achieve comparable ARR with available capacity, or build a full headcount plan to support the 60-logo target and model the cost impact.',
      note:
        'Shows the capacity gap quantified with actual math (2 AEs × 8 deals = 16 vs. 60 target), channel-market fit assessed by ICP behavior not channel popularity, and the blocking finding stated plainly without diplomatic softening.',
    },
  ],
});
