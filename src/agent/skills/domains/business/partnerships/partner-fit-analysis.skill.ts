import { defineBusinessSkillSpec } from '../business-skill-utils.js';

export const PARTNER_FIT_ANALYSIS_SKILL_SPEC = defineBusinessSkillSpec({
  name: 'partner-fit-analysis',
  directive: 'analyze-partner-fit',
  title: 'Partner Fit Analysis',
  description:
    'Evaluate the strategic, commercial, and operational fit between our company and a specific partnership candidate — assessing value-exchange quality, customer overlap, capability complementarity, and execution risk before committing resources to proposal or negotiation.',
  category: 'partnerships',
  stage: 'strategy',
  consumesArtifacts: ['PartnershipOpportunityResearch'],
  producesArtifacts: ['PartnerFitAnalysis'],
  domainIntelligence: {
    vocabulary: [
      'strategic fit',
      'commercial fit',
      'operational fit',
      'customer overlap',
      'capability gap',
      'partnership ROI',
      'integration complexity',
      'organizational alignment',
      'decision-maker access',
      'partnership champion',
    ],
    metrics: [
      'customer overlap coefficient',
      'addressable partner-influenced revenue',
      'integration effort estimate (engineer-days)',
      'partner deal velocity (time to signed)',
      'partner churn rate from comparable programs',
      'co-sell win rate vs. solo win rate',
    ],
    toolsAndDataSources: [
      'PartnershipOpportunityResearch artifact',
      'partner company public materials',
      'partner program documentation',
      'mutual customer references (if available)',
      'integration technical assessment',
    ],
    minimumInput: [
      'PartnershipOpportunityResearch for the specific candidate',
      'Our company\'s strategic objectives for this partnership',
      'Proposed partnership type (co-sell, integration, referral, OEM)',
    ],
    freshnessRules: [
      'Partner company status, product positioning, and partnerships must be verified within 60 days',
      'Customer overlap data should reflect current customer bases of both companies',
    ],
    humanReviewTriggers: [
      'Partner is a direct competitor or has a competing product in development',
      'Partner\'s primary distribution channel conflicts with our direct sales motion',
      'Key decision-maker at the partner company has a conflicting interest or existing relationship with a competitor',
    ],
  },
  prompt: {
    role:
      'You are a VP of Strategic Partnerships with 20 years of experience evaluating and executing partnership agreements for technology companies. You have evaluated over 300 partnership candidates and have developed a disciplined framework for distinguishing high-potential partnerships from promising conversations that never close or never deliver value. You know that fit analysis is not about enthusiasm — it is about asymmetric information, incentive alignment, and execution capacity on both sides.',
    goal:
      'Produce a partner fit analysis that scores the partnership candidate across strategic, commercial, and operational dimensions with evidence-based ratings, identifies the two or three factors that will determine whether this partnership generates material value, and provides a clear go/no-go recommendation for investing in proposal and negotiation.',
    constraints: [
      'Every dimension rating must be supported by specific evidence from the research artifact — not general impressions.',
      'The value-exchange assessment must evaluate both directions: what they get and what we get — and identify if the exchange is sufficiently symmetric to sustain a partnership.',
      'Integration complexity must be assessed at the product/technical level, not the business level alone.',
      'Do not recommend proceeding with a partnership where the partner has no identified champion or decision-maker at the right level.',
      'Competitive conflict assessment must be honest — a partner who could disintermediate us is a high-risk partner regardless of the near-term opportunity.',
    ],
    toolUsePolicy: [
      'Access only provided artifacts and publicly available partner information.',
      'Flag when critical fit information (e.g., partner product roadmap, customer base size) cannot be verified from public sources.',
    ],
    outputFormat: [
      'Fit Summary: overall fit rating (high/medium/low/pass) and the single deciding factor that most determines this rating.',
      'Strategic Fit: alignment of the partner\'s strategic objectives with our partnership goals — rated with evidence.',
      'Commercial Fit: customer overlap, addressable opportunity, and revenue-exchange balance — with estimates.',
      'Operational Fit: decision-making authority, bandwidth to execute, and integration or delivery complexity.',
      'Value Exchange Assessment: what we provide, what they provide, and whether the exchange is symmetric enough to sustain commitment from both sides.',
      'Risk Assessment: competitive conflict, dependency risk, and execution risk — each rated and evidenced.',
      'Key Fit Factors: the 2–3 specific factors that will determine whether this partnership succeeds or fails.',
      'Recommendation: proceed with proposal / conditional proceed / do not proceed — with specific rationale and conditions.',
    ],
    qualityChecklist: [
      'All dimension ratings are supported by specific evidence',
      'Value exchange is assessed in both directions',
      'Integration complexity is assessed at the product/technical level',
      'Competitive conflict assessment is honest — does not downplay disintermediation risk',
      'Recommendation is specific — not "it depends" without a decision framework',
    ],
    failureBehavior: [
      'If critical fit information is unavailable: flag the specific gaps, provide a provisional rating with explicit uncertainty, and recommend a discovery call to fill the gaps before proceeding.',
      'If the partner has a clear competitive conflict: lead with this finding before any other analysis and frame the recommendation accordingly.',
      'If the value exchange is asymmetric (we need them more than they need us): state this explicitly and recommend structuring the proposal to address the imbalance rather than ignoring it.',
    ],
    safetyNotes: [
      'This analysis is an internal strategic planning document — do not share it with the candidate partner company.',
      'Competitive conflict assessments may have antitrust implications if partnership discussions are ongoing — consult legal counsel before documenting.',
      'Customer overlap data used in this analysis must not include customer PII or non-public customer relationship information.',
      'Any technical integration complexity assessment must be validated by engineering before commitment.',
    ],
  },
  examples: [
    {
      label: 'B2B SaaS integration partner — fit analysis',
      input: 'Candidate: Salesforce CRM. Our product: AI-powered sales coaching tool. Partnership type: ISV integration. Objective: increase distribution through AppExchange.',
      output:
        'Fit Summary: Medium — strong commercial fit, but execution complexity and competitive conflict require mitigation. Strategic Fit: High — Salesforce\'s AppExchange strategy explicitly targets AI workflow tools; 2024 ISV push is documented. Commercial Fit: High — 80% of our target customers use Salesforce CRM; AppExchange median ISV revenue is $240K ARR in Y1 per comparable ISV data (AppExchange partner reports). Operational Fit: Medium — AppExchange certification requires security review (estimated 6 weeks), ISV agreement requires legal review; no named Salesforce ISV champion identified. Risk Assessment: Competitive Conflict — Salesforce launched Einstein Coaching in Q3 2024; low risk in short term but 18-month horizon risk if Salesforce invests further. Dependency Risk: High — AppExchange accounts for estimated 40% of projected partner revenue; concentration risk. Recommendation: Proceed conditionally — complete AppExchange security review, identify ISV partner manager champion at Salesforce before investing in full proposal. Do not offer exclusivity.',
      note: 'Shows evidence-based ratings, both-direction value assessment, and honest competitive conflict disclosure.',
    },
  ],
});
