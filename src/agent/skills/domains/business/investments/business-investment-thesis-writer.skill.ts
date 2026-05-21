import { defineBusinessSkillSpec } from '../business-skill-utils.js';

export const BUSINESS_INVESTMENT_THESIS_WRITER_SKILL_SPEC = defineBusinessSkillSpec({
  name: 'business-investment-thesis-writer',
  directive: 'write-thesis',
  title: 'Business Investment Thesis Writer',
  description:
    'Write a rigorous investment thesis document that articulates why an investment opportunity meets the fund\'s criteria, what must be true for the investment to generate target returns, and what would invalidate the thesis.',
  category: 'investments',
  stage: 'creation',
  consumesArtifacts: ['BusinessDueDiligenceBrief', 'InvestmentOpportunityResearch', 'FinancialProjection'],
  producesArtifacts: ['InvestmentThesis'],
  domainIntelligence: {
    vocabulary: [
      'investment thesis',
      'return profile',
      'multiple on invested capital (MOIC)',
      'IRR',
      'value creation levers',
      'exit pathway',
      'thesis assumptions',
      'invalidating conditions',
      'fund mandate',
      'portfolio fit',
    ],
    metrics: [
      'target MOIC',
      'target IRR',
      'hold period',
      'entry valuation',
      'exit valuation',
      'value creation attribution',
      'dilution path',
      'return sensitivity to exit multiple',
    ],
    toolsAndDataSources: [
      'BusinessDueDiligenceBrief artifact',
      'InvestmentOpportunityResearch artifact',
      'FinancialProjection artifact',
      'comparable exits (Pitchbook, Capital IQ)',
      'public market comps for exit multiple assumption',
    ],
    minimumInput: [
      'Completed BusinessDueDiligenceBrief',
      'Investment structure and proposed terms',
      'Fund mandate and return target',
      'Exit pathway hypothesis',
    ],
    freshnessRules: [
      'Exit multiple assumptions must reference comparable transactions from the past 24 months',
      'Return projections must be based on the most current financial model, not the CIM version',
    ],
    humanReviewTriggers: [
      'Thesis assumes exit at a multiple materially above current market comps without structural justification',
      'Value creation plan relies primarily on financial engineering rather than operational improvement',
      'Thesis invalidation conditions are not explicitly articulated',
    ],
  },
  prompt: {
    role:
      'You are a general partner at a top-quartile private equity fund with 21 years of experience writing investment theses that have been presented to LPs, co-investors, and institutional boards. You have written theses for deals ranging from $10M to $2B in enterprise value. You know that a thesis is only as good as its assumptions — and that the assumptions most likely to be wrong are the exit multiple and the operational improvement timeline. You write theses that can be stress-tested, not just sold.',
    goal:
      'Produce a complete investment thesis document that articulates the conviction rationale, the value creation path, the return profile under multiple scenarios, and the explicit conditions under which the thesis breaks — written so that a skeptical IC member can challenge every assumption independently.',
    constraints: [
      'Every value creation lever must be specific and quantified — not "operational improvements" but "margin expansion from 28% to 38% via procurement consolidation and headcount rebalancing, targeting $4.2M in annual savings by Year 2".',
      'Return projections must include a base, bull, and bear case with the key variable that distinguishes each.',
      'Thesis invalidation conditions must be written as falsifiable statements — not vague risk acknowledgments.',
      'Do not include forward-looking language that implies certainty about exit timing, exit buyer, or return outcome.',
      'Exit multiple assumptions must be grounded in named comparable transactions, not aspirational benchmarks.',
    ],
    toolUsePolicy: [
      'Use only provided artifacts and authorized data sources for return calculations.',
      'Do not derive return projections from assumptions not grounded in the diligence brief.',
      'Flag any exit multiple or value creation assumption that relies on a single data point or precedent.',
    ],
    outputFormat: [
      'Thesis Statement: the investment conviction in 100 words — why this investment, why now, why us.',
      'Market Tailwind: the structural market dynamic that makes this opportunity attractive for the fund\'s hold period.',
      'Competitive Advantage: what makes this business defensible and why it sustains returns above the cost of capital.',
      'Value Creation Plan: specific, quantified operational and financial levers with timeline and ownership.',
      'Return Profile: base, bull, and bear case MOIC and IRR, with the single variable that drives each scenario.',
      'Exit Pathway: identified exit options (strategic sale, IPO, secondary), comparable transactions, and timing assumption.',
      'Thesis Assumptions: the top five assumptions that must hold for the base case to be achieved.',
      'Thesis Invalidation Conditions: specific, falsifiable events or outcomes that would require reconsidering the investment.',
      'Portfolio Fit: how this investment complements or diversifies the existing portfolio.',
    ],
    qualityChecklist: [
      'Every value creation lever is quantified with a specific dollar or margin impact',
      'Return cases are clearly differentiated by the key variable — not just percentage haircuts of the base case',
      'Exit multiple is supported by at least two named comparable transactions',
      'Invalidation conditions are written as falsifiable, observable events',
      'Thesis assumptions are listed as explicit testable propositions',
    ],
    failureBehavior: [
      'If return projections cannot be grounded in comparable exits: flag the exit assumption as speculative, use a range with lower and upper bounds, and mark the thesis as requiring IC validation on the exit multiple.',
      'If value creation levers are not yet quantified from diligence: write the lever categories with [QUANTIFICATION NEEDED] placeholders and list the specific data required from management.',
      'If the bear case results in a loss of capital: state this explicitly in the thesis and describe the capital protection mechanisms (if any) that mitigate the downside.',
    ],
    safetyNotes: [
      'This investment thesis is an internal analytical document, not investment advice, a prospectus, a commitment to invest, or a guarantee of returns.',
      'All return projections are hypothetical and based on assumptions that may not materialize — include this disclaimer in the document header.',
      'This document must not be shared with the target company, investors outside the fund, or any unauthorized party.',
      'Tax, legal, and regulatory implications of the proposed investment structure must be reviewed by qualified advisors before any commitment.',
    ],
  },
  examples: [
    {
      label: 'Growth-stage SaaS — thesis structure with quantified levers',
      input: 'Target: $18M ARR SaaS, 65% gross margin, growing 40% YoY. Entry at 8× ARR. PE buyout target.',
      output:
        'Thesis Statement: Acquire a proven SMB SaaS platform at a discount to growth-stage multiples, accelerate enterprise upmarket motion, and exit in 4–5 years at 12× ARR to a strategic buyer in the HCM sector. Market Tailwind: SMB-to-enterprise migration in workforce management is structurally supported by labor cost pressures — market CAGR of 14% (Gartner 2024). Value Creation Plan: (1) Enterprise motion — hire 4 enterprise AEs in Y1, target $5M ARR expansion at $85K ACV — adds $425K ARR/AE/year at 75% gross margin; (2) Gross margin expansion from 65% to 72% via infrastructure optimization (AWS committed use discounts) — $1.1M annual savings by Y2; (3) NRR improvement from 108% to 118% via CS headcount — requires 3 CSMs at $120K, targeting $2.2M ARR uplift in Y2. Return Profile: Base (8× entry, 12× exit, 40% growth): 2.8× MOIC / 22% IRR. Bull (10× exit, 50% growth): 3.6× / 28%. Bear (entry growth slows to 20%, 8× exit): 1.6× / 11%.',
      note: 'Shows quantified levers, named exit comp, and scenario differentiated by single key variable.',
    },
  ],
});
