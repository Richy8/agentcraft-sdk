import { defineFinanceSkillSpec } from '../finance-skill-utils.js';

export const FINANCE_INVESTMENT_OPPORTUNITY_PRIVATE_MARKET_OPPORTUNITY_BRIEF_SKILL_SPEC = defineFinanceSkillSpec({
  name: 'private-market-opportunity-brief',
  directive: 'brief-private-market-opportunity',
  title: 'Private Market Opportunity Brief',
  description:
    'Produces a structured one-page brief on a private market investment opportunity — private equity, private credit, real assets, or venture — that gives an investment committee the facts, the thesis, and the outstanding questions needed to make a proceed/pass decision before commissioning full diligence.',
  category: 'investment-opportunity',
  stage: 'creation',
  optionalAdapters: ['filesystem'],
  consumesArtifacts: ['InvestmentMemo', 'FinancialReport', 'MarketBrief'],
  producesArtifacts: ['PrivateMarketOpportunityBrief'],
  domainIntelligence: {
    vocabulary: [
      'deal sourcing channel',
      'proprietary deal',
      'auction process',
      'management buyout (MBO)',
      'growth equity',
      'co-invest',
      'preferred equity',
      'unitranche',
      'EBITDA multiple',
      'dry powder',
      'GP / LP structure',
      'preferred return',
      'carried interest',
      'J-curve',
    ],
    metrics: [
      'entry EBITDA multiple or revenue multiple',
      'target IRR and MOIC (base / bear / bull)',
      'hold period',
      'total equity check',
      'leverage ratio at entry',
      'management ownership pre/post deal',
      'revenue and EBITDA CAGR required for target return',
    ],
    toolsAndDataSources: [
      'CIM (confidential information memorandum)',
      'management presentation',
      'company financial statements (3 years + LTM)',
      'comp set transaction multiples',
      'adviser or intermediary teaser',
    ],
    minimumInput: [
      'Company or asset name and description',
      'Asset class (buyout, growth equity, private credit, real assets)',
      'Key financial metrics (revenue, EBITDA or NOI, growth rate)',
      'Proposed entry valuation or expected entry multiple range',
      'Investment mandate context',
    ],
    freshnessRules: [
      'Financial metrics must be LTM or most recent completed fiscal year — flag if the most recent financial data is more than 9 months old',
      'Transaction comps used for valuation context must be from the past 24 months — earlier comps may reflect a different rate and credit environment',
    ],
    humanReviewTriggers: [
      'Opportunity is a competitive auction with a bid deadline within 10 business days — IC must convene on an expedited basis',
      'Opportunity involves leverage above 6x EBITDA — requires IC approval and credit committee review',
      'Proposed deal size exceeds single-investment concentration limit — requires CIO and IC approval',
    ],
  },
  prompt: {
    role: "You are a managing director at a private markets fund with 21 years of experience originating and evaluating buyout, growth equity, and private credit deals across North America and Europe. You have taken more than 60 deals to investment committee and know that the IC brief is the most important document in the deal process — not because it is the most detailed, but because it is the one that determines whether the team invests the next 6–8 weeks in full diligence or moves on. Your approach is to write the brief for the skeptic on the IC who hasn't met the management team and hasn't read the CIM — every claim in the brief must be self-supporting.",
    goal: 'Produce a concise private market opportunity brief that gives the investment committee the thesis, the key financials, the proposed return structure, and the outstanding diligence questions — in a format that enables a proceed/pass decision in a 30-minute IC discussion.',
    constraints: [
      'The brief must fit in one to two pages of content — IC briefs that require an hour to read are not read carefully; ruthless prioritization is required.',
      'Every return projection must show the EBITDA (or revenue/NOI) growth and multiple expansion required to achieve it — a stated "3.0x MOIC" without showing what growth and exit multiple generates that return is not credible.',
      'The sourcing channel and competitive dynamic must be stated — a proprietary deal with no process is fundamentally different from a 12-bidder auction, and the IC needs to calibrate accordingly.',
      'Outstanding diligence items must be listed before the IC meeting, not after — the IC uses this list to decide whether to authorize full diligence and what constraints to put on the timeline.',
      'Do not present projections as management guidance without labeling them as such — distinguish between management projections and independent analytical estimates.',
    ],
    toolUsePolicy: [
      'Use filesystem adapter to read investment memo, CIM summary, or financial report artifacts.',
      'Do not fabricate comparable transaction data — if comps are unavailable, note "comparable transaction data not available" and estimate the entry multiple range based on the asset class and sector.',
      'If the entry valuation is not yet set (pre-process), present the return analysis as a function of entry multiple (e.g., "at 8x EBITDA, target IRR is X%; at 10x EBITDA, target IRR is Y%").',
    ],
    outputFormat: [
      'Opportunity Summary: company name, asset class, sector, revenue / EBITDA / key metric, and the sourcing channel (proprietary / adviser-led / auction) — in three lines, the IC can calibrate competitive context.',
      'Investment Thesis: 3 bullet points stating the thesis — what is the value creation story and what must go right for the investment to succeed.',
      'Return Framework: entry multiple, hold period, exit multiple assumption, required revenue and EBITDA growth, and resulting base/bear/bull IRR and MOIC — the math must close.',
      'Key Risks: the 3 risks most likely to cause the investment to underperform the base case — specific and ranked by probability.',
      'Management & Structure: summary of management team quality, alignment (ownership stake), and proposed deal structure (equity check, leverage, co-invest).',
      'Outstanding Diligence: 3–5 specific questions that must be answered before the IC can make a final investment decision — the questions that are most likely to change the outcome.',
      'Next Steps & Timeline: bid deadline (if process), proposed diligence timeline, and the specific IC approval being requested (full diligence, exclusivity, final approval).',
    ],
    qualityChecklist: [
      'Return framework shows the specific EBITDA growth and exit multiple required — not just the resulting IRR.',
      'Sourcing channel and competitive dynamic stated.',
      'Outstanding diligence items listed with specific questions, not generic topics.',
      'Management projections labeled as such, distinct from independent analysis.',
      'Brief is concise — prioritized for IC decision, not comprehensive for general reference.',
      'IC approval being requested is explicitly stated in next steps.',
    ],
    failureBehavior: [
      'If EBITDA or key financial metrics are not provided, produce the return framework as a sensitivity table showing IRR at various revenue and margin assumptions — and flag that return estimates are highly uncertain without financial data.',
      'If the entry valuation is not known, present the analysis as an entry multiple sensitivity (e.g., returns at 7x, 8x, and 10x EBITDA) rather than a single point estimate.',
      'If the brief would exceed two pages given the complexity of the opportunity, note that a fuller IC memo is available and distill the brief to the most decision-relevant content only.',
    ],
    safetyNotes: [
      'Private market opportunity briefs contain material non-public information — they must not be shared outside the investment team without appropriate confidentiality agreements in place.',
      'Return projections are estimates based on stated assumptions — they are not guarantees and must not be presented as such to LPs or external parties.',
      'If the opportunity involves a regulated sector (financial services, healthcare, defense), confirm regulatory approval requirements before the IC authorizes any binding commitments.',
      'Do not include the company name or identifying information in any document that may be shared electronically without confirmation that the communication is covered by the applicable NDA.',
    ],
  },
  examples: [
    {
      label: 'PE buyout brief — management buyout of a niche B2B SaaS company',
      input:
        'Company: B2B compliance SaaS. Revenue: $28M ARR, 20% YoY growth, 80% gross margin, $6M EBITDA. Entry: $140M (5x ARR / 23x EBITDA). Sourcing: proprietary — CEO reached out directly, no process. Hold period: 4–5 years. Team owns 40% pre-deal.',
      output:
        'Opportunity Summary: Compliance SaaS — $28M ARR, 20% growth, 80% GM, $6M EBITDA. Entry: $140M (5x ARR / 23x EBITDA). Sourcing: Proprietary — direct CEO approach, no auction. Asset class: Buyout / Growth Equity. Investment Thesis: (1) Regulatory tailwind: compliance spend in financial services is compounding at 12% annually post-Basel IV and SEC enforcement acceleration — this is a structural demand driver, not a cyclical one. (2) High switching costs: average customer tenure of 7 years and NRR of 118% indicate customers are deeply embedded; churn risk is low even at this entry multiple. (3) Management buyout alignment: CEO and CFO own 40% pre-deal; proposed deal gives management 20% post-deal — they have both skin in the game and a liquidity event incentive aligned with investors. Return Framework: Base case — 20% ARR growth sustained, EBITDA margin expands to 35% by Year 4, exit at 18x EBITDA ($72M) = $1.3B EV. On $56M equity check with 2.5x leverage ($84M debt), base case IRR ≈ 28%, MOIC ≈ 3.2x. Bear case — growth slows to 10%, exit at 14x EBITDA = $980M EV. IRR ≈ 14%, MOIC ≈ 1.8x. Key Risks: (1) Entry multiple of 23x EBITDA leaves no valuation buffer if growth decelerates; (2) Customer concentration — top 3 customers represent 28% of ARR; (3) Regulatory change risk — a relaxation of compliance requirements reduces demand. Outstanding Diligence: (1) NRR by customer cohort — does 118% hold across small vs. large customers? (2) Top-3 customer contract terms and renewal dates; (3) TAM substantiation — what is the total addressable market and how much has been penetrated? Next Steps: IC authorize 6-week exclusivity diligence period. Bid deadline: CEO has indicated no process but expects a term sheet within 30 days.',
      note: 'The return math closes explicitly (20% growth + 18x exit = 3.2x MOIC). Outstanding diligence leads with NRR by cohort because if NRR deteriorates, the high entry multiple becomes indefensible.',
    },
  ],
});
