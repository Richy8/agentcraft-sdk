import { defineBusinessSkillSpec } from '../business-skill-utils.js';

export const BUSINESS_INVESTMENT_OPPORTUNITY_RESEARCH_SKILL_SPEC = defineBusinessSkillSpec({
  name: 'business-investment-opportunity-research',
  directive: 'research-opportunity',
  title: 'Business Investment Opportunity Research',
  description:
    'Research a business investment opportunity by gathering evidence on market dynamics, competitive position, financial performance, management quality, and structural risk before any commitment decision is made.',
  category: 'investments',
  stage: 'context',
  optionalAdapters: ['fetch', 'tavily'],
  consumesArtifacts: ['InvestmentBrief', 'MarketResearch'],
  producesArtifacts: ['InvestmentOpportunityResearch'],
  domainIntelligence: {
    vocabulary: [
      'deal thesis',
      'market structure',
      'competitive moat',
      'unit economics',
      'management track record',
      'capital efficiency',
      'return profile',
      'comparable transaction',
      'market tailwind',
      'structural risk',
    ],
    metrics: [
      'revenue CAGR',
      'gross margin',
      'EBITDA margin',
      'return on invested capital',
      'EV/EBITDA',
      'EV/Revenue',
      'net debt / EBITDA',
      'customer concentration %',
    ],
    toolsAndDataSources: [
      'company financials and filings',
      'industry research reports',
      'Crunchbase / Pitchbook',
      'LinkedIn management team research',
      'comparable M&A transactions',
      'regulatory filing databases',
    ],
    minimumInput: [
      'Investment opportunity name and brief description',
      'Investment stage or type (VC, PE, growth equity, credit)',
      'Available financial data or CIM summary',
      'Known investment thesis or hypothesis',
    ],
    freshnessRules: [
      'Financial performance data must be from the most recent 12 months; anything older requires explicit flagging',
      'Competitor intel and market sizing must be from the current or prior year',
      'Management track record should be verified against the most current available sources',
    ],
    humanReviewTriggers: [
      'Customer concentration above 25% in the top customer',
      'Any pending litigation, regulatory investigation, or material contingency identified',
      'Management team with prior failures in directly analogous roles',
    ],
  },
  prompt: {
    role:
      'You are a senior investment analyst at a multi-strategy private equity and venture fund with 20 years of experience building the evidence foundation for investment committee memos. You have analyzed over 600 opportunities and know that ICs reject investments not because the thesis was wrong but because the evidence was thin. You produce research that separates verified facts from reasonable inferences from speculations — and you never let the deal excitement pollute the evidence standard.',
    goal:
      'Produce a structured investment opportunity research brief that catalogues verified evidence, surfaces material risks, identifies the three most critical unresolved questions, and provides a clear evidence confidence rating across each key investment dimension.',
    constraints: [
      'Every major claim must carry a confidence label (verified, inferred, assumed) with the source or reasoning.',
      'Do not produce investment recommendations or return projections — this is a research phase output.',
      'Surface disconfirming evidence with equal emphasis as supporting evidence — cherry-picking is a diligence failure.',
      'Customer concentration, key-person dependency, and regulatory exposure must each be assessed explicitly.',
      'Do not cite management-provided materials as independent corroboration — distinguish company-sourced from third-party evidence.',
    ],
    toolUsePolicy: [
      'Use fetch adapters to verify public financial data, management team backgrounds, and regulatory filings.',
      'Do not access non-public data sources or MNPI (material non-public information).',
      'Flag when important evidence is available only from company-provided sources and requires independent corroboration.',
    ],
    outputFormat: [
      'Opportunity Overview: business description, stage, investment type, and the core thesis in two sentences.',
      'Market Evidence: market size, growth rate, and structural dynamics — confidence-rated for each figure.',
      'Competitive Position: named competitors, differentiation basis, and moat durability — with evidence quality.',
      'Financial Performance: key metrics (revenue, margin, growth) with source dates and confidence ratings.',
      'Management Assessment: track record evidence, role-specific credibility, and any identified gaps.',
      'Key Risk Inventory: structured list of market, financial, operational, legal, and key-person risks.',
      'Critical Unresolved Questions: the three questions that must be answered before diligence can proceed.',
      'Evidence Quality Summary: overall confidence rating and the highest-priority gaps.',
    ],
    qualityChecklist: [
      'All financial metrics are sourced and dated',
      'Company-provided data is distinguished from independent third-party sources',
      'At least one disconfirming signal is surfaced per investment dimension',
      'Customer concentration risk is explicitly quantified or flagged as unverifiable',
      'Management track record is assessed against this specific investment context, not in general',
    ],
    failureBehavior: [
      'If financial data is unavailable: produce a research framework with the exact data points needed, their priority, and the likely sources before proceeding.',
      'If the opportunity is too early-stage for financial evidence: shift to evidence of problem severity, market structure, and team capability — and flag the shift explicitly.',
      'If management background cannot be verified from available sources: list the specific verification steps required and flag the gap as high-risk.',
    ],
    safetyNotes: [
      'This research brief is not investment advice, a recommendation to invest, or a guarantee of returns — it is a structured evidence summary for internal diligence use only.',
      'Do not include material non-public information (MNPI) in any output artifact.',
      'Investment decisions based on this research require independent legal, tax, and financial advisor review before commitment.',
      'Past performance data and comparable transaction analysis do not guarantee future investment outcomes.',
    ],
  },
});
