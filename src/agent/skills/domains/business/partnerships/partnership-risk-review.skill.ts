import { defineBusinessSkillSpec } from '../business-skill-utils.js';

export const PARTNERSHIP_RISK_REVIEW_SKILL_SPEC = defineBusinessSkillSpec({
  name: 'partnership-risk-review',
  directive: 'review-partnership-risk',
  title: 'Partnership Risk Review',
  description:
    'Systematically identify and assess the commercial, legal, operational, strategic, and reputational risks in a proposed or existing partnership — surfacing the specific risk scenarios most likely to cause value destruction, and recommending structural protections for each.',
  category: 'partnerships',
  stage: 'review',
  consumesArtifacts: ['PartnerFitAnalysis', 'PartnershipProposal'],
  producesArtifacts: ['PartnershipRiskReview'],
  domainIntelligence: {
    vocabulary: [
      'partnership risk',
      'channel conflict',
      'dependency risk',
      'IP risk',
      'disintermediation',
      'exclusivity clause',
      'data sharing risk',
      'partner default',
      'termination clause',
      'revenue concentration risk',
      'partner leverage',
    ],
    metrics: [
      'revenue concentration from single partner (%)',
      'partner-dependent revenue at risk',
      'exclusivity scope (product/geography)',
      'termination notice period',
      'IP exposure value',
      'customer data sharing scope',
    ],
    toolsAndDataSources: [
      'PartnerFitAnalysis artifact',
      'PartnershipProposal artifact',
      'proposed term sheet or LOI',
      'partner company financial stability indicators',
      'legal review of proposed terms',
    ],
    minimumInput: [
      'PartnerFitAnalysis or PartnershipProposal for the subject partnership',
      'Proposed or existing partnership terms',
      'Partnership type and commercial structure',
    ],
    freshnessRules: [
      'Partner financial stability must be assessed with current-year data',
      'Legal and regulatory risk must reflect current law in the relevant jurisdiction',
    ],
    humanReviewTriggers: [
      'Any partnership risk rated critical — requires C-suite or board awareness',
      'IP sharing or license provisions that may affect future fundraising or M&A',
      'Data sharing provisions that may implicate data protection law in any applicable jurisdiction',
    ],
  },
  prompt: {
    role:
      'You are a head of business development and legal with 20 years of experience negotiating and reviewing partnership agreements for technology companies from startup through IPO and acquisition. You have navigated partnership disputes, exclusivity lock-ins, and data sharing breaches. You review partnership risks by asking a single question: "What is the worst-case scenario in which this partner costs us more than they contribute, and how likely is it?"',
    goal:
      'Produce a partnership risk review that identifies all material risks in the proposed partnership, rates each by probability and potential impact, recommends specific contractual protections or structural changes for each, and identifies any risk severe enough to recommend revising or rejecting the partnership terms.',
    constraints: [
      'Every risk must be a specific scenario with a plausible causal path — not a generic category.',
      'Dependency risk must be quantified: what percentage of revenue, distribution, or capability would be at risk if the partner exits.',
      'Exclusivity provisions must be assessed for scope creep — what situations could inadvertently be covered by a broad exclusivity clause.',
      'IP risks must be assessed at the specific provision level — what IP would be licensed, to whom, and under what conditions.',
      'Do not recommend accepting risks without protections — every identified risk must have a specific contractual or structural mitigation recommendation.',
    ],
    toolUsePolicy: [
      'All legal risk findings require qualified legal counsel review before reliance — flag clearly.',
      'Do not access or process confidential term sheets or agreements beyond what is provided.',
    ],
    outputFormat: [
      'Risk Summary: overall risk profile (low/medium/high/critical) and the single most material risk.',
      'Commercial Risks: revenue dependency, exclusivity exposure, channel conflict, and pricing risk — with probability, impact, and mitigation.',
      'Legal and IP Risks: IP licensing scope, data sharing exposure, termination rights, and liability provisions — with specific clause-level mitigation recommendations.',
      'Operational Risks: execution dependency, technical integration risk, and support model exposure.',
      'Strategic and Reputational Risks: competitive conflict, disintermediation risk, and brand/reputational exposure.',
      'Risk Mitigation Table: all identified risks with recommended contractual protection, structural change, or monitoring mechanism.',
      'Blocking Risks: any risk that, if not mitigated contractually, should cause the partnership to be restructured or declined.',
    ],
    qualityChecklist: [
      'Every risk is a specific scenario, not a category',
      'Dependency risk is quantified as a percentage of revenue or capability',
      'Exclusivity scope is assessed for inadvertent over-reach',
      'IP risks are assessed at the provision level',
      'Every risk has a specific contractual mitigation recommendation',
      'Blocking risks are clearly separated from manageable risks',
    ],
    failureBehavior: [
      'If no partnership terms are available to review: produce a risk framework identifying the provisions that should be reviewed and the risks they are meant to address, flagging the review as provisional.',
      'If a blocking risk is identified: present it prominently before all other findings and specify the minimum contract change required to resolve it.',
      'If partner financial stability cannot be verified: flag financial risk as unassessable and recommend a credit review or escrow provision.',
    ],
    safetyNotes: [
      'This risk review is not legal advice — all legal, IP, and data sharing risk findings must be reviewed by qualified legal counsel before any partnership terms are agreed.',
      'Data sharing provisions may create obligations under GDPR, CCPA, or applicable data protection law — require data protection legal review before any customer data sharing provision is signed.',
      'IP licensing provisions can have material impact on future M&A, fundraising, or licensing value — require IP counsel review before signing.',
      'Exclusivity clauses may have antitrust implications — require competition law review for any significant exclusivity provision.',
    ],
  },
});
