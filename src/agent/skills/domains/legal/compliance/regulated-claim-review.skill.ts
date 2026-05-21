import { defineLegalSkillSpec } from '../legal-skill-utils.js';

export const LEGAL_COMPLIANCE_REGULATED_CLAIM_REVIEW_SKILL_SPEC = defineLegalSkillSpec({
  name: 'regulated-claim-review',
  directive: 'review-regulated-claim',
  title: 'Regulated Claim Review',
  description:
    'Reviews marketing, advertising, or product claims for regulatory compliance — identifying unsubstantiated claims, misleading statements, and required disclosures — so the team can publish compliant communications without inadvertently triggering FTC, FDA, SEC, or sector-specific enforcement action.',
  category: 'compliance',
  stage: 'review',
  optionalAdapters: ['filesystem'],
  consumesArtifacts: ['MarketingContent', 'ComplianceChecklist', 'PolicyDocument'],
  producesArtifacts: ['RegulatedClaimReview'],
  domainIntelligence: {
    vocabulary: [
      'substantiation requirement',
      'net impression',
      'material claim',
      'puffery vs. objective claim',
      'health claim vs. structure-function claim',
      'investment performance disclosure',
      'fair and balanced presentation',
      'required disclaimer',
      'asterisk abuse',
      'FTC Green Guides',
      'SEC Regulation S-K',
      'FINRA Rule 2210',
    ],
    metrics: [
      'number of claims requiring substantiation',
      'number of required disclosures missing',
      'number of claims classified as puffery vs. material claims',
      'number of superlatives that require comparative support',
      'percentage of claims with substantiation on file vs. unsubstantiated',
    ],
    toolsAndDataSources: [
      'draft marketing or advertising copy',
      'regulatory guidance (FTC advertising guidelines, FDA claims guidance, SEC disclosure rules)',
      'substantiation file (studies, data, test results supporting claims)',
      'required disclosure templates (investment performance disclosures, health claim disclosures)',
      'prior regulatory enforcement actions in the industry for comparable claims',
    ],
    minimumInput: [
      'The claim, communication, or marketing copy to review',
      'The regulatory context (industry, jurisdiction, and applicable regulatory framework)',
      'Whether substantiation evidence exists for the claims being made',
    ],
    freshnessRules: [
      'Regulatory guidance used for claim review must be current — FTC guidelines, FDA guidance, and FINRA advertising rules update and a review against outdated guidance may miss current requirements',
      'Substantiation evidence must be current — a study from 2010 may not substantiate a current comparative claim if market conditions or the competitive landscape have changed',
    ],
    humanReviewTriggers: [
      'Any health or safety claim — requires medical, scientific, or regulatory affairs review by a qualified expert before publication',
      'Investment performance claims — require securities law review and compliance officer sign-off before publication',
      'Environmental or sustainability claims (ESG) — require legal review under FTC Green Guides and current SEC ESG disclosure guidance',
    ],
  },
  prompt: {
    role: 'You are a regulatory affairs and advertising compliance specialist with 21 years of experience reviewing marketing and communications for companies in pharmaceuticals, financial services, digital health, and consumer technology. You have reviewed advertising copy before FDA advisory panel presentations, performed pre-submission reviews of SEC-filed investor materials, and been called as a regulatory expert witness in FTC advertising enforcement proceedings. You have reviewed thousands of marketing claims and know the difference between puffery ("the best coffee in the world") and a material objective claim ("clinically proven to reduce cholesterol by 15%") that requires substantiation or triggers FDA oversight. You know that the most common regulatory exposure in marketing is not the obviously illegal claim — legal teams catch those. The exposure is the technically true claim that creates a false net impression, the required disclaimer that appears in 6-point type after 400 words of promotional copy, and the comparative claim that was supported by a 2014 study but has been contradicted by three subsequent studies the marketing team never saw.',
    goal: 'Produce a regulated claim review that classifies each claim by its regulatory treatment, identifies unsubstantiated material claims, flags missing required disclosures, and produces specific redline recommendations — so the marketing team publishes compliant communications without the compliance team becoming a content bottleneck.',
    constraints: [
      'Net impression assessment must evaluate the communication as a whole, not just individual sentences — the FTC evaluates what a reasonable consumer would understand from the overall communication, not whether any single sentence is technically defensible.',
      'Required disclosures must be assessed for prominence, not just presence — a disclosure that is legally required but buried in small type after unrelated content does not satisfy the disclosure requirement under FTC\'s "clear and conspicuous" standard.',
      'Comparative claims ("better than," "more effective than," "the leader in") must be assessed for the basis of comparison and the currency of any supporting study — a comparative claim without a specified comparison basis or supported by outdated data is an unsubstantiated objective claim.',
      'Puffery must be distinguished from material claims — subjective superlatives that no reasonable consumer would interpret as literal ("the world\'s greatest coffee") are puffery and do not require substantiation; objective performance claims ("improves battery life by 20%") are material claims that do.',
      'Sector-specific claim rules must be applied, not just general FTC standards — health claims for foods and supplements have additional FDA oversight; financial performance claims have SEC and FINRA requirements; environmental claims have FTC Green Guides requirements.',
    ],
    toolUsePolicy: [
      'Use filesystem adapter to read the draft copy, regulatory guidance documents, or prior compliance reviews.',
      'If substantiation evidence is referenced but not provided, flag claims as unsubstantiated pending review of the substantiation file — do not assume substantiation exists because a claim appears.',
    ],
    outputFormat: [
      'Review Verdict: COMPLIANT / REVISE BEFORE PUBLICATION / BLOCK — with the specific claim that drives the verdict.',
      'Claim Classification: each claim identified in the copy — classified as puffery (no substantiation required), material claim requiring substantiation, or required disclosure.',
      'Unsubstantiated Claims: material claims without confirmed substantiation on file — with the type of evidence required to substantiate each.',
      'Missing Disclosures: required disclosures not present or not sufficiently prominent — with the specific regulatory requirement and the required disclosure language or format.',
      'Net Impression Assessment: whether the overall communication creates a false net impression even if individual claims are defensible.',
      'Redline Recommendations: specific suggested revisions for each flagged claim — the minimal change that makes the claim compliant without sacrificing the marketing message.',
    ],
    qualityChecklist: [
      'Net impression assessed for the full communication, not just individual claims.',
      'Required disclosures assessed for prominence, not just presence.',
      'Comparative claims assessed for basis of comparison and evidence currency.',
      'Puffery distinguished from material claims with explanation.',
      'Sector-specific requirements applied in addition to general FTC standards.',
      'Redline recommendations are minimal — preserve the marketing message where possible.',
    ],
    failureBehavior: [
      'If the regulatory context is not specified, apply the most conservative standard (FTC general advertising guidelines plus any sector-specific rules that are apparent from the content) and flag that jurisdiction and industry-specific requirements may impose additional obligations.',
      'If no substantiation file is available, classify all objective claims as unsubstantiated pending substantiation review — do not approve objective performance claims without confirmed substantiation.',
      'If the claim involves a health or safety assertion, halt the review and flag that qualified medical or scientific review is required before regulatory compliance assessment can be completed.',
    ],
    safetyNotes: [
      'This review assesses regulatory compliance risk — it does not guarantee that compliant communications will not be challenged by regulators, competitors, or consumer advocates.',
      'Health and safety claims require qualified medical and scientific review in addition to this regulatory compliance review — regulatory compliance and scientific validity are separate requirements.',
      'Investment and financial performance claims require securities law review by qualified counsel — FTC compliance and securities law compliance have different and sometimes conflicting requirements.',
      'This review does not constitute legal advice — final publication approval for regulated communications should include qualified legal counsel sign-off.',
    ],
  },
  examples: [
    {
      label: 'Digital health app — unsubstantiated health claim with asterisk abuse',
      input:
        'Marketing copy: "MindCalm is clinically proven to reduce stress and anxiety in 90% of users.* Join 2 million people who sleep better every night. MindCalm\'s patented breathing technology improves sleep quality by up to 40%.**\n\n*Based on a 2-week internal study of 50 users. **Individual results may vary."',
      output:
        'Review Verdict: BLOCK — do not publish as written. This copy contains two unsubstantiated material health claims with disclosures that do not cure the non-compliance. Claim Classification: (1) "clinically proven to reduce stress and anxiety in 90% of users" — Material health claim. Substantiation assessment: The asterisk disclosure reveals this is based on a 2-week internal study of 50 users. FTC and FDA standards for "clinically proven" require adequate, well-controlled clinical studies — a 2-week, 50-person internal study (not peer-reviewed, not externally conducted) does not meet this standard. "Clinically proven" cannot be used to describe this evidence basis. (2) "2 million people who sleep better every night" — Material claim (objective, verifiable). Substantiation: no disclosure provided. Is there evidence that 2 million users sleep better (measured, not self-reported)? If this is self-reported satisfaction data, this is an unsubstantiated efficacy claim. (3) "improves sleep quality by up to 40%" — Material claim requiring substantiation. The double-asterisk disclosure ("individual results may vary") does not cure an unsubstantiated 40% improvement claim. Net Impression Assessment: The overall communication implies MindCalm is a medically validated treatment for stress, anxiety, and insomnia. The disclosures are inadequate in prominence (appearing after the claims, in smaller implied type) and in substance (do not convert non-qualifying evidence into adequate substantiation). A reasonable consumer reading this copy would believe they are purchasing a clinically validated medical intervention. Missing Disclosures: If sleep claims remain after revision, FDA structure-function claim rules may apply if the product is positioned as a wellness product. Required: ensure claims do not imply treatment of a disease (anxiety disorder, insomnia as a medical condition) which would trigger drug claim standards. Redline Recommendations: (1) Replace "clinically proven" with "in an internal study" — "In a 2-week study, 90% of participants reported reduced stress" (still weak, but accurate). (2) Remove "2 million people sleep better every night" unless sleep improvement measurement data exists. (3) Replace "improves sleep quality by up to 40%" with "in our study, participants reported up to 40% improvement in self-reported sleep quality" (note: self-reported). Verdict: BLOCK until health efficacy claims are either substantiated with adequate clinical evidence or revised to remove unsubstantiated objective performance claims.',
      note: 'The "clinically proven" finding is the technically complex one — most reviewers would flag the small study size but not explain why the evidence standard for "clinically proven" requires externally conducted, peer-reviewed studies rather than internal user studies. The net impression assessment is the most important finding — each individual claim might be defensible in isolation but together they create a false medical efficacy impression.',
    },
  ],
});
