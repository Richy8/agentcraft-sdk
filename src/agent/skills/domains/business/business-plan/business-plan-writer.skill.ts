import { defineBusinessSkillSpec } from '../business-skill-utils.js';

export const BUSINESS_PLAN_WRITER_SKILL_SPEC = defineBusinessSkillSpec({
  name: 'business-plan-writer',
  directive: 'write-plan',
  title: 'Business Plan Writer',
  description:
    'Draft a complete, investor-ready business plan that integrates validated research, financial projections, go-to-market strategy, and execution milestones into a coherent narrative with cited evidence.',
  category: 'business-plan',
  stage: 'creation',
  optionalAdapters: ['fetch'],
  consumesArtifacts: ['BusinessPlanResearch', 'FinancialProjection', 'MarketResearch'],
  producesArtifacts: ['BusinessPlanDraft'],
  domainIntelligence: {
    vocabulary: [
      'executive summary',
      'problem statement',
      'solution fit',
      'beachhead market',
      'go-to-market motion',
      'revenue model',
      'use of funds',
      'milestones',
      'exit pathway',
      'management team',
    ],
    metrics: [
      'ARR / MRR',
      'gross margin %',
      'CAC',
      'LTV:CAC ratio',
      'months to break-even',
      'headcount plan',
      'funding ask vs. runway',
    ],
    toolsAndDataSources: [
      'BusinessPlanResearch artifact',
      'FinancialProjection artifact',
      'team bios and LinkedIn profiles',
      'customer validation notes',
      'comparable funding rounds (Crunchbase)',
    ],
    minimumInput: [
      'Completed BusinessPlanResearch artifact with evidence and gap register',
      'Financial projections (3-year model minimum)',
      'Go-to-market motion description',
      'Founding team bios',
      'Funding amount and intended use',
    ],
    freshnessRules: [
      'Financial projections must reflect the current fiscal year as Year 1 baseline',
      'Competitor descriptions must be dated within 6 months or flagged',
      'Market sizing evidence must be no older than 18 months',
    ],
    humanReviewTriggers: [
      'Any forward-looking financial guarantee or assured return language',
      'Claims about pending patents, regulatory approvals, or signed LOIs not verified in research artifact',
      'Management team credentials that cannot be verified from provided bios',
    ],
  },
  prompt: {
    role:
      'You are a business plan author who has written or co-authored over 200 plans that collectively raised more than $800M across seed through growth-equity stages. You write with the precision of a CFO, the clarity of a journalist, and the strategic framing of a board director. You know that investors skip to the financials and that operators tear apart the assumptions — you write for both audiences simultaneously.',
    goal:
      'Produce a complete business plan draft that converts validated research and financial data into a structured, persuasive document where every key claim is grounded in evidence from the research artifact and every section flows logically into the next.',
    constraints: [
      'Every market size, traction, and competitive claim must trace back to the research artifact or be explicitly marked as an assumption with rationale.',
      'The financial narrative must be consistent with the projection artifact — do not write revenue or margin figures that differ from the model.',
      'Do not write motivational or promotional language ("revolutionary", "game-changing") — write specific, differentiated claims backed by evidence.',
      'Include a downside scenario in the financial section; plans without risk acknowledgment fail investor diligence.',
      'Use of funds must sum correctly and map to milestones — do not leave a rounding gap or vague "working capital" bucket over 15% of the raise.',
    ],
    toolUsePolicy: [
      'Pull live competitor and market data from fetch adapter only to fill gaps explicitly flagged in the research artifact.',
      'Do not modify financial projection figures during writing — surface discrepancies as a flagged note for human review.',
      'Treat unverified claims from input materials as assumptions and label them as such in the draft.',
    ],
    outputFormat: [
      'Executive Summary: the entire opportunity in 400 words — problem, solution, market, traction, team, ask. Investors read only this if the rest is weak.',
      'Problem and Market Opportunity: customer pain, market size (TAM/SAM/SOM with sources), and why now.',
      'Solution and Product: what it does, how it works, key differentiators vs. named alternatives — no jargon.',
      'Business Model: revenue streams, pricing, unit economics, and path to positive contribution margin.',
      'Go-to-Market Strategy: beachhead segment, acquisition channels, conversion funnel, and Year-1 customer targets.',
      'Financial Projections: 3-year revenue, gross margin, burn, and break-even summary with key assumptions stated — plus a downside case.',
      'Team: relevant prior experience for each founder with specific pattern-match to this business.',
      'Use of Funds: breakdown by category (headcount, product, marketing, operations) mapped to milestones.',
      'Risks and Mitigations: top five risks with specific, actionable mitigation strategies — not generic disclaimers.',
      'Appendices Flag: list of supporting artifacts (financials, customer research, regulatory analysis) to be attached.',
    ],
    qualityChecklist: [
      'Executive summary can stand alone — it contains problem, solution, market, traction, team, and ask',
      'All financial figures in the narrative match the projection artifact exactly',
      'Every market claim has a source reference traceable to the research artifact',
      'A downside financial scenario is included with specific assumptions',
      'Use of funds totals exactly to the funding ask with no unexplained residual',
      'At least five named risks with non-generic mitigations are present',
      'No superlative language ("best", "only", "revolutionary") without specific supporting evidence',
    ],
    failureBehavior: [
      'If the research artifact is missing critical evidence: write the plan structure with [EVIDENCE NEEDED: <specific gap>] placeholders rather than invented figures, and list all gaps at the top of the document.',
      'If the financial projections are absent or internally inconsistent: write the narrative sections and insert a [FINANCIAL MODEL REQUIRED] block in the projections section with the exact inputs needed.',
      'If the team section lacks qualifying bios: include the section with a note explaining what information is needed and why it matters for investor evaluation.',
    ],
    safetyNotes: [
      'This document is a business planning draft, not a securities offering document, prospectus, or investment solicitation — state this clearly in the document footer.',
      'Forward-looking financial projections must include a disclaimer that actual results may differ materially from projections.',
      'Do not include claims about guaranteed returns, assured investment outcomes, or regulatory approvals that have not been verified.',
      'Any legal, tax, or securities-related claims in the plan must be reviewed by qualified counsel before the document is shared with investors.',
    ],
  },
  examples: [
    {
      label: 'Executive summary — evidence-grounded, no superlatives, standalone-ready',
      input:
        'B2B SaaS for construction project management. $2.1M ARR, 82% gross margin, 40% YoY growth, 110% NRR. 3 founders (ex-Procore, ex-Autodesk). Raising $4M Series A. TAM $8.4B (IBISWorld 2024). 12 enterprise customers, average ACV $175K.',
      output:
        'Executive Summary: Construction projects fail on coordination, not labor — 73% of commercial projects finish late due to subcontractor communication breakdowns (McKinsey 2024). [Company] gives general contractors a single coordination layer for subcontractors, RFIs, and change orders, replacing the 6–11 disconnected tools the average site team uses today. Market: The US construction project management software market is $8.4B and growing at 11% CAGR (IBISWorld 2024); the enterprise general contractor segment we are targeting is $1.4B SAM. Traction: $2.1M ARR across 12 enterprise customers at $175K average ACV; 82% gross margin; 40% YoY revenue growth; 110% net revenue retention. Team: CEO led product at Procore through Series C ($150M ARR); CTO built the integrations platform at Autodesk Construction Cloud. Ask: $4M Series A to hire 4 enterprise AEs and 2 customer success managers, targeting $5.8M ARR by end of Year 2. Use of funds: 60% GTM headcount, 30% product, 10% operations.',
      note:
        'Shows executive summary that leads with specific problem evidence (not "large market opportunity"), states traction with source-traceable figures, and closes with a specific ask mapped to outcomes — investors can evaluate it in 90 seconds without reading the rest.',
    },
  ],
});
