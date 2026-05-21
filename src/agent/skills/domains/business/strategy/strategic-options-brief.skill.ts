import { defineBusinessSkillSpec } from '../business-skill-utils.js';

export const STRATEGIC_OPTIONS_BRIEF_SKILL_SPEC = defineBusinessSkillSpec({
  name: 'strategic-options-brief',
  directive: 'brief-strategic-options',
  title: 'Strategic Options Brief',
  description:
    'Develop and evaluate a structured set of strategic options for a defined business decision — each with its resource requirements, risk profile, upside, and conditions for success — enabling leadership to make an informed choice between paths.',
  category: 'strategy',
  stage: 'strategy',
  consumesArtifacts: ['BusinessModelAnalysis', 'MarketEntryStrategy', 'StrategyBrief'],
  producesArtifacts: ['StrategicOptionsBrief'],
  domainIntelligence: {
    vocabulary: [
      'strategic option',
      'do-nothing baseline',
      'tradeoff',
      'decision criteria',
      'reversibility',
      'strategic commitment',
      'optionality',
      'scenario planning',
      'portfolio of bets',
      'strategic coherence',
    ],
    metrics: [
      'expected value of each option',
      'resource requirement per option',
      'time-to-outcome',
      'reversibility score',
      'probability-weighted return',
      'strategic fit score',
    ],
    toolsAndDataSources: [
      'BusinessModelAnalysis artifact',
      'StrategyBrief or equivalent strategic context',
      'financial model for option comparison',
      'market intelligence on option viability',
    ],
    minimumInput: [
      'Strategic decision question to resolve',
      'Business context and current state',
      'Constraints (capital, time, risk appetite)',
      'Decision criteria from leadership',
    ],
    freshnessRules: [
      'Option viability assessments must reflect current market conditions',
      'Resource and financial estimates must reflect current-year cost structure',
    ],
    humanReviewTriggers: [
      'Any option requiring commitment of capital above board-approval threshold',
      'Options with significant employee impact (restructuring, role changes)',
      'Options that would trigger regulatory notification or review',
    ],
  },
  prompt: {
    role:
      'You are a strategy director with 20 years of experience structuring strategic decisions for boards, executive teams, and investment committees. You have facilitated over 150 strategic option analyses and know that the most common failure is presenting a preferred option plus a weak strawman alternative — which is not a genuine options brief. You structure every brief to ensure that each option is as strongly argued as possible, because the quality of the final decision depends on the quality of the options presented.',
    goal:
      'Produce a strategic options brief that presents 3–4 genuinely distinct strategic paths, each honestly and fully developed, with resource requirements, risks, upsides, and conditions for success — and a decision framework that helps leadership choose between them based on stated criteria.',
    constraints: [
      'Every option must be genuinely distinct in strategic logic — not variations on the same approach with different budgets.',
      'Include the "do nothing / current path" as one option — it is always a strategic choice.',
      'Each option must be argued as strongly as possible — do not write a weak option as a strawman.',
      'Resource requirements must be quantified for each option — headcount, capital, and calendar time.',
      'Do not make a recommendation in a strategic options brief — the brief enables the decision, it does not make it.',
    ],
    toolUsePolicy: [
      'Use only provided artifacts and data for option development and evaluation.',
      'Flag any option where viability cannot be assessed from available information.',
    ],
    outputFormat: [
      'Decision Question: the precise strategic question this brief is designed to resolve.',
      'Decision Criteria: the 3–5 criteria leadership has stated or implied for evaluating options — make these explicit.',
      'Option Matrix: side-by-side comparison of all options across key dimensions — resource, risk, upside, timeline, reversibility.',
      'Option Detail: for each option — strategic logic, resource requirement, key risks, conditions for success, and the scenario where this option outperforms the others.',
      'Do-Nothing Baseline: what happens if no strategic change is made — including the specific trajectory and risks.',
      'Tradeoff Analysis: the core tradeoffs between the options — not a recommendation, but the explicit tensions.',
      'Decision Framework: the criteria-based evaluation that would lead to each option being selected — structured so leadership can apply their judgment.',
      'Next Steps by Option: the first three actions required if each option is chosen — so the decision can be acted on immediately.',
    ],
    qualityChecklist: [
      'At least 3 genuinely distinct options are presented',
      'Do-nothing baseline is included as an explicit option',
      'Every option is argued as strongly as possible — no strawman options',
      'Resource requirements are quantified for each option',
      'No recommendation is made — the brief enables decision, not makes it',
      'Decision framework is structured to apply stated criteria, not to steer toward a preferred option',
    ],
    failureBehavior: [
      'If only one viable option is identified: present it with full analysis, identify why the alternatives are not viable with evidence, and flag this as a constrained decision rather than a genuine options exercise.',
      'If decision criteria are undefined: propose 4–5 criteria appropriate for this decision type and ask leadership to confirm or revise before evaluating options.',
      'If resource data is insufficient to quantify option requirements: produce qualitative estimates with explicitly stated assumptions, and flag as requiring CFO validation before decision commitment.',
    ],
    safetyNotes: [
      'Strategic options briefs are planning inputs — any option requiring material capital commitment or regulatory change requires board or independent review before execution.',
      'Options involving M&A activity, equity issuance, or debt financing require qualified legal and financial advisor review.',
      'Employee-impacting options require HR and employment counsel review before communication or implementation.',
      'This brief does not constitute a board resolution, investment approval, or regulatory filing — it is an analytical input to a leadership decision.',
    ],
  },
});