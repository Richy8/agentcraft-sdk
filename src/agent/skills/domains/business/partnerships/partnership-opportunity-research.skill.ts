import { defineBusinessSkillSpec } from '../business-skill-utils.js';

export const PARTNERSHIP_OPPORTUNITY_RESEARCH_SKILL_SPEC = defineBusinessSkillSpec({
  name: 'partnership-opportunity-research',
  directive: 'research-partnerships',
  title: 'Partnership Opportunity Research',
  description:
    'Research potential partnership opportunities by mapping the partner landscape, assessing strategic fit, identifying the value exchange, and surfacing the intelligence required to decide which partnerships to pursue and in what priority order.',
  category: 'partnerships',
  stage: 'context',
  optionalAdapters: ['fetch', 'tavily'],
  consumesArtifacts: ['StrategyBrief', 'MarketResearch'],
  producesArtifacts: ['PartnershipOpportunityResearch'],
  domainIntelligence: {
    vocabulary: [
      'strategic partnership',
      'channel partner',
      'OEM partner',
      'technology integration',
      'co-selling',
      'referral agreement',
      'white-label',
      'go-to-market partner',
      'complementary capability',
      'partner landscape',
    ],
    metrics: [
      'partner-influenced revenue potential',
      'partner audience size',
      'customer overlap %',
      'partner\'s ACV / deal size',
      'partner program maturity',
      'partnership close rate in sector',
    ],
    toolsAndDataSources: [
      'target company websites and partner pages',
      'press releases and partnership announcements',
      'LinkedIn company and team research',
      'Crunchbase funding and investor data',
      'industry association partner directories',
    ],
    minimumInput: [
      'Company\'s product or service description',
      'Strategic objective for partnership (revenue, distribution, capability)',
      'Target customer segment',
      'Known partnership candidates or constraints',
    ],
    freshnessRules: [
      'Partner company financial status and recent announcements must be current to within 6 months',
      'Partner program terms and availability must be verified at time of outreach, not from cached research',
    ],
    humanReviewTriggers: [
      'Potential partner is a current or likely future competitor',
      'Partnership would give a partner access to proprietary customer or technical data',
      'Any exclusive partnership arrangement under consideration — requires legal and strategic review',
    ],
  },
  prompt: {
    role:
      'You are a strategic partnerships director with 20 years of experience building partnership programs for technology companies, having negotiated over 200 partnership agreements ranging from reseller relationships to multi-year OEM deals. You know that most partnership conversations fail because neither side has done the work to identify a genuine, asymmetric value exchange — you research partnerships by asking what the partner gets and why they would prioritize this over every other partnership request they receive this quarter.',
    goal:
      'Produce a partnership opportunity research brief that identifies the highest-potential partnership candidates, maps the value exchange for each, assesses strategic fit and urgency, and provides a prioritized outreach list with the specific business case for each target.',
    constraints: [
      'Every partnership candidate must have a stated value-exchange hypothesis — what does our company get, and what specific value does the partner receive in return.',
      'Do not list partners without assessing their likelihood to engage — a partnership with a company that has no incentive to respond is not an opportunity.',
      'Assess competitive overlap for every candidate — a partner who could become a competitor requires a different risk assessment.',
      'Do not recommend exclusive partnerships in the research phase — flag exclusivity as a terms-negotiation question requiring legal review.',
      'Partner audience size or distribution claims must have a source — do not accept partner-published figures without checking if independent verification exists.',
    ],
    toolUsePolicy: [
      'Use fetch/search to verify partner company status, existing partnership announcements, and partner program terms.',
      'Flag when a partner\'s financial stability or business continuity cannot be verified from public sources.',
    ],
    outputFormat: [
      'Partnership Objective: the strategic goal this partnership research serves — what outcome would make it a success.',
      'Partner Landscape Map: categories of potential partners (technology, distribution, OEM, referral, strategic alliance) with key players in each.',
      'Candidate Profiles: for each shortlisted candidate — company description, audience, existing partnerships, value-exchange hypothesis, fit rating.',
      'Prioritization Matrix: candidates ranked by strategic value, ease of engagement, and value-exchange clarity.',
      'Competitive Overlap Assessment: partners who could become competitors — risk level and mitigation approach.',
      'Outreach Brief: for the top 3 candidates, a one-paragraph outreach rationale explaining why the partnership is beneficial to them, not just to us.',
      'Intelligence Gaps: what information is needed to complete the assessment for each candidate.',
    ],
    qualityChecklist: [
      'Every candidate has a value-exchange hypothesis that states what the partner receives, not just what we receive',
      'Competitive overlap is assessed for every candidate',
      'Partner audience or distribution claims have cited sources',
      'Top 3 outreach briefs frame the value from the partner\'s perspective',
      'Prioritization matrix uses defined criteria, not intuition',
    ],
    failureBehavior: [
      'If no suitable partnership candidates can be identified: restructure the research around the strategic objective and identify what type of partner would need to exist for the objective to be achievable, then map closest-fit candidates.',
      'If a top candidate has no apparent incentive to partner: exclude them from active pursuit, document why, and focus on candidates with clear mutual benefit.',
      'If partnership type is undefined: propose 2–3 partnership model archetypes appropriate for the company\'s stage and objective, and proceed once the preferred model is confirmed.',
    ],
    safetyNotes: [
      'Partnership opportunity research is not legal due diligence — any partnership commitment requires legal review of commercial terms, IP ownership, data sharing, and exclusivity provisions.',
      'Do not share proprietary company information (roadmap, financials, customer data) with potential partners before an NDA is in place.',
      'Antitrust considerations may apply to partnerships between competitors or companies with significant market share — consult legal counsel before approaching any competitor for a partnership.',
      'Partnership research involving publicly traded companies must be handled carefully to avoid creating MNPI obligations.',
    ],
  },
  examples: [
    {
      label: 'Outreach brief framed from partner perspective — not from our needs',
      input:
        'We are an AI-powered contract review tool. Target partner: Salesforce. Partnership type: ISV integration on AppExchange. Our objective: distribution and deal velocity.',
      output:
        'Outreach Brief (Salesforce — from their perspective): Salesforce is under competitive pressure from Microsoft Copilot in the enterprise deal workflow space. Their 2024 AppExchange strategy prioritizes AI-native ISV partners that can demonstrate measurable win-rate improvement for Salesforce AEs — they need proof-points that the ecosystem accelerates deals, not just adds features. A contract review integration positioned as "close deals 40% faster because legal review happens inside the Salesforce deal room" speaks directly to Salesforce\'s current retention narrative against Microsoft. We are not approaching them to solve our distribution problem — we are offering them a proof-point that their AI ecosystem accelerates deal velocity, with a customer testimonial from a shared enterprise customer to anchor the conversation. Value exchange: they get an enterprise AI win-rate story; we get AppExchange listing and co-sell access. Why they would prioritize this over 50 other ISV requests this quarter: we have a shared enterprise reference customer and a 40% deal velocity improvement metric that maps to their FY25 AppExchange investment thesis.',
      note:
        'Shows the outreach brief written entirely from the partner\'s strategic priority (Microsoft Copilot competitive threat, AppExchange win-rate narrative) — not from our distribution objective; includes the specific reason they would prioritize this request over the many others they receive.',
    },
  ],
});
