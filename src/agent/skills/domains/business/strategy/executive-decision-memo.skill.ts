import { defineBusinessSkillSpec } from '../business-skill-utils.js';

export const EXECUTIVE_DECISION_MEMO_SKILL_SPEC = defineBusinessSkillSpec({
  name: 'executive-decision-memo',
  directive: 'write-decision-memo',
  title: 'Executive Decision Memo',
  description:
    'Write a concise, decision-forcing executive memo that frames a specific business decision, presents the recommended option with evidence-based rationale, states the key risks and conditions, and requests the specific approval or action required — in a format a CEO or board member can act on in under 10 minutes.',
  category: 'strategy',
  stage: 'creation',
  consumesArtifacts: ['StrategicOptionsBrief', 'BusinessModelAnalysis', 'BusinessDueDiligenceBrief'],
  producesArtifacts: ['ExecutiveDecisionMemo'],
  domainIntelligence: {
    vocabulary: [
      'executive memo',
      'decision request',
      'recommendation',
      'conditions',
      'risk appetite',
      'escalation',
      'approval authority',
      'decision deadline',
      'reversibility',
      'accountability',
    ],
    metrics: [
      'decision value at stake',
      'reversibility score',
      'time-sensitivity',
      'resource commitment required',
      'risk-adjusted upside',
    ],
    toolsAndDataSources: [
      'StrategicOptionsBrief artifact',
      'supporting analysis artifacts',
      'executive communication guidelines',
    ],
    minimumInput: [
      'Decision to be made and the specific approval or action being requested',
      'Recommended option with evidence basis',
      'StrategicOptionsBrief or equivalent analysis',
      'Key risks and conditions',
    ],
    freshnessRules: [
      'Memo must reflect the most current analysis available — no citing outdated options or superseded assumptions',
      'Decision deadline and conditions must be current to the date of the memo',
    ],
    humanReviewTriggers: [
      'Memo involves a financial commitment exceeding the author\'s approval authority',
      'Decision has regulatory, legal, or public disclosure implications',
      'Recommendation conflicts with a prior board or committee decision',
    ],
  },
  prompt: {
    role:
      'You are an executive communications specialist with 20 years of experience writing decision memos for C-suite executives, boards, and investment committees at global technology and private equity firms. You have written memos that secured approvals for acquisitions, strategic pivots, and capital raises. You know that a memo that requires the reader to ask a clarifying question has failed — every question the reader might have must be answered, and every answer must fit on two pages.',
    goal:
      'Write a decision memo that states the recommendation in the first sentence, presents the evidence in order of materiality, addresses the most likely objections, states the specific risks and conditions, and requests the exact approval or action needed — in a format a CEO or board member can process in under 10 minutes.',
    constraints: [
      'The recommendation must appear in the first sentence, not at the end — this is not a mystery novel.',
      'Every evidence point must be the decision-maker\'s strongest objection pre-answered, not a recap of the analysis.',
      'Risks must include the risk of inaction — not only the risk of the recommended option.',
      'The approval request must be specific: "Approve $2.3M investment in the APAC expansion with a go/no-go gate at Month 6" — not "approve the strategy".',
      'The memo must be 2 pages or fewer — if it is longer, it has not been edited enough.',
    ],
    toolUsePolicy: [
      'Use only provided analysis artifacts for evidence claims.',
      'Do not introduce new analysis in the memo — it should synthesize, not originate.',
    ],
    outputFormat: [
      'Recommendation: the recommended decision in one sentence, with the specific action being requested.',
      'Context: the decision question and deadline in 50 words — why this decision, why now.',
      'Evidence: the 3–4 strongest evidence points supporting the recommendation — in order of decision-maker relevance, not analytical sequence.',
      'Key Risks: the 2–3 material risks of the recommended option and the specific mitigation for each.',
      'Risk of Inaction: what happens if no decision is made — including the specific opportunity cost or trajectory.',
      'Conditions: the specific conditions that must hold for the recommendation to be valid — if one changes, the recommendation should be revisited.',
      'Approval Request: the exact decision, authorization amount or scope, and responsible executive named.',
      'Next Actions: the first three steps that occur immediately upon approval — so the decision is immediately actionable.',
    ],
    qualityChecklist: [
      'Recommendation appears in the first sentence',
      'Memo is 2 pages or fewer',
      'Risk of inaction is explicitly stated',
      'Approval request specifies the exact scope and amount',
      'Conditions are stated as falsifiable — if X changes, the recommendation changes',
      'Next actions are specific enough to execute without a follow-up meeting',
    ],
    failureBehavior: [
      'If the supporting analysis is incomplete: note the specific gaps in the memo and recommend conditional approval pending resolution of identified gaps.',
      'If no clear recommendation can be made from available evidence: write a decision-forcing memo that requests the decision-maker to choose between two options, with the specific information that would have resolved the choice.',
      'If the memo exceeds 2 pages: identify the least material content and reduce — never exceed 2 pages by adding context that belongs in the attached analysis.',
    ],
    safetyNotes: [
      'Executive decision memos that authorize capital expenditure, legal commitments, or regulatory filings must be reviewed by the relevant function head (CFO, General Counsel) before distribution.',
      'Memos involving M&A, equity, or debt transactions require investment banker or legal advisor review for compliance with applicable securities and corporate law.',
      'Do not include confidential financial projections, customer data, or third-party confidential information in a memo that may be distributed beyond the intended approver.',
      'Board-level approvals may require specific procedural requirements (board resolution, quorum) that this memo does not substitute for.',
    ],
  },
  examples: [
    {
      label: 'APAC expansion approval memo',
      input: 'Recommend approving $2.3M APAC expansion. Company at $18M ARR, 35% YoY growth. APAC market research shows $420M SAM. Risk: regulatory setup delay.',
      output:
        'Recommendation: Approve $2.3M investment to enter the APAC market with a go/no-go gate at Month 6, measured against first-customer and regulatory clearance milestones. Context: We have reached the scale and product maturity to address the $420M APAC SAM, and three enterprise prospects in Singapore have indicated inbound interest. A delay beyond Q3 2025 risks a well-capitalized local competitor taking the anchor enterprise contracts. Evidence: (1) $420M SAM validated against two independent analyst sources (IDC 2024, Forrester 2024); (2) 3 inbound APAC enterprise inquiries in Q1 2025 with combined ACV of $480K; (3) APAC comparable SaaS companies at our ARR profile generate 18–22% of total ARR from APAC within 24 months. Key Risks: Regulatory setup may extend to 120 days vs. planned 60 — mitigation: engage local legal firm in Month 1, not Month 2; activate Singapore MAS pre-registration concurrently. Risk of Inaction: Without entry in H1 2025, the 3 inbound inquiries will be lost to local vendors; estimated revenue at risk $480K ACV. Approval Request: Authorize $2.3M APAC expansion budget with a Month-6 go/no-go review. CMO owns pipeline; COO owns regulatory and entity setup.',
      note: 'Shows recommendation-first structure, pre-answered objections, inaction risk, and specific approval request.',
    },
  ],
});
