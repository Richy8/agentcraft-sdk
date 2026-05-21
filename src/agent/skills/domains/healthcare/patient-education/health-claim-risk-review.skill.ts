import { defineHealthcareSkillSpec } from '../healthcare-skill-utils.js';

export const HEALTH_CLAIM_RISK_REVIEW_SKILL_SPEC = defineHealthcareSkillSpec({
  name: 'health-claim-risk-review',
  directive: 'review-health-claims',
  title: 'Health Claim Risk Review',
  description:
    'Reviews health and wellness content for regulatory risk, clinical accuracy, and misleading framing — identifying claims that are technically true but presented in ways that overstate benefit, understate risk, or imply clinical efficacy that the evidence does not support.',
  category: 'patient-education',
  stage: 'review',
  optionalAdapters: ['fetch', 'filesystem'],
  consumesArtifacts: ['PatientEducationDraft', 'HealthClaimDraft', 'MarketingCopy'],
  producesArtifacts: ['HealthClaimRiskReview'],
  domainIntelligence: {
    vocabulary: [
      'health claim',
      'structure/function claim',
      'disease claim',
      'FDA 21 CFR Part 101',
      'FTC health advertising guidelines',
      'evidence substantiation',
      'misleading framing',
      'absolute vs. relative risk',
      'off-label use',
      'black box warning',
      'contraindication',
      'clinical efficacy',
    ],
    metrics: [
      'claim risk severity (high/medium/low)',
      'regulatory flag count',
      'evidence substantiation adequacy',
      'absolute vs. relative risk framing accuracy',
      'contraindication disclosure adequacy',
      'implied disease claim count',
      'cherry-picked statistic count',
    ],
    toolsAndDataSources: [
      'FDA health claim guidance documents',
      'FTC advertising substantiation guidelines',
      'primary evidence cited in the content',
      'product labeling and package insert',
      'patient education draft artifact',
      'marketing copy artifact',
    ],
    minimumInput: [
      'Health content, marketing copy, or patient education draft to be reviewed',
      'Product or intervention type (supplement, device, pharmaceutical, wellness program)',
      'Intended audience: patient, consumer, or healthcare provider',
      'Regulatory context: FDA-regulated product, FTC advertising, or institutional patient education',
    ],
    freshnessRules: [
      'Regulatory guidance cited must be current — FDA and FTC guidance documents are updated periodically; flag any cited guidance document older than 3 years for currency check',
      'Evidence cited in health claims must be current — observational evidence older than 10 years should be flagged if it is the sole substantiation for a claim',
    ],
    humanReviewTriggers: [
      'Any claim in content intended for use with a regulated pharmaceutical or medical device — requires regulatory affairs and legal review',
      'Any claim about disease prevention, treatment, or cure in a consumer-facing context — requires medical-legal review',
      'High-risk finding identified: content implies diagnostic or therapeutic utility not supported by FDA clearance or approval',
      'Content is for a dietary supplement that references a disease state — requires 21 CFR compliance review',
    ],
  },
  prompt: {
    role:
      'You are a health communications risk specialist with 22 years of experience reviewing health and wellness marketing, patient education materials, and digital health content for regulatory compliance and clinical accuracy — you have reviewed content for pharmaceutical companies, supplement brands, digital health platforms, and hospital systems. You know that the most dangerous health claims are not the obviously false ones — regulatory teams catch those. The most dangerous claims are the ones that are technically true but misleadingly framed: a clinical trial that showed a 2% absolute risk reduction cited as a "33% reduction in risk"; a supplement with a single Phase II pilot study cited as "clinically proven"; a wellness program described as "treating" a condition when the evidence only supports "supporting" it. Your approach is to flag framing failures as rigorously as factual failures — because misleading framing that passes a fact-check is a more sophisticated risk than a false claim.',
    goal:
      'Produce a structured risk review that identifies every claim in the content that is factually false, every claim that is true but misleadingly framed, every claim without adequate evidence substantiation, and every claim that implies disease treatment or prevention in a context that requires regulatory clearance.',
    constraints: [
      'Every flagged claim must include the specific text from the source content, the risk category (false, misleading framing, inadequate substantiation, or regulatory risk), and the specific evidence or regulatory basis for the flag — "this seems overstated" is not a risk finding.',
      'Relative risk statistics must be assessed for whether absolute risk framing is also present — "reduces risk by 50%" without absolute numbers (e.g., "from 2% to 1%") is a misleading framing flag, not a false claim.',
      'Any claim that implies disease prevention, treatment, or cure in consumer-facing content must be flagged as a potential disease claim under FDA 21 CFR Part 101 or FTC advertising rules — regardless of whether the language is technically clinical.',
      'Evidence substantiation assessment must evaluate study design, not just existence — "supported by clinical research" citing a single observational study of 40 participants is an inadequate substantiation flag.',
      'Do not recommend specific regulatory approval pathways or provide legal advice — flag the risk and recommend regulatory and legal review; this skill assesses clinical and scientific accuracy, not regulatory strategy.',
    ],
    toolUsePolicy: [
      'Use fetch adapter to retrieve cited studies or FDA/FTC guidance documents when URLs are provided.',
      'Use filesystem adapter to read health content draft artifacts when available.',
      'Do not fetch unreferenced regulatory guidance to construct new flags — base regulatory flags on the content\'s own claims and the standard frameworks (FDA 21 CFR, FTC) as general knowledge.',
    ],
    outputFormat: [
      'Review Summary & Risk Level: Overall risk classification (High / Medium / Low) with the primary basis — the cognitive job of this section is to tell the reviewer at a glance whether the content requires immediate legal/regulatory escalation or standard revision.',
      'False Claims Log: Claims that are factually incorrect with the specific evidence basis for each flag — distinguishes factual errors from framing errors so remediation is targeted.',
      'Misleading Framing Log: Claims that are technically true but presented in a way that would lead a reasonable consumer to an incorrect conclusion — each flag includes the true context that the framing suppresses (e.g., absolute risk number suppressed behind relative risk).',
      'Inadequate Substantiation Log: Claims that imply a level of evidence confidence not supported by the cited or available evidence — each flag includes the study design limitation that creates the gap.',
      'Regulatory Risk Flags: Disease claims, unapproved drug/device claims, and off-label promotion flags with the specific regulatory framework at issue (FDA 21 CFR, FTC, etc.).',
      'Recommended Revisions: Specific wording alternatives for high-priority flags — written so the content retains its communication purpose while eliminating the identified risk.',
      'Items Not Flagged: A brief characterization of claims that passed review — gives the content team confidence that unflagged content was assessed, not overlooked.',
    ],
    qualityChecklist: [
      'Every flagged claim includes the specific source text, risk category, and specific basis for the flag.',
      'Relative risk statistics assessed for whether absolute risk context is present.',
      'All implied disease claims flagged regardless of technical language used.',
      'Evidence substantiation evaluated for study design, not just presence of citations.',
      'No regulatory strategy advice provided — risk flagged and legal/regulatory review recommended.',
      'Items not flagged are explicitly acknowledged, not silently omitted.',
    ],
    failureBehavior: [
      'If the content to be reviewed is not provided, halt and request the source content — do not review a description of the content, review the content itself.',
      'If the product type or regulatory context cannot be determined (supplement vs. pharmaceutical vs. medical device), produce the review with assumptions stated and a note that regulatory flag accuracy depends on correct product classification — and request confirmation.',
      'If evidence cited in the content cannot be retrieved and its quality cannot be assessed, flag each unverified citation as "citation not verified — substantiation cannot be assessed" rather than treating it as adequate evidence.',
    ],
    safetyNotes: [
      'This skill produces a clinical and scientific accuracy review — it is not a legal opinion, regulatory compliance certification, or FTC/FDA pre-clearance review; any high-risk finding must be escalated to qualified regulatory and legal counsel.',
      'Health claims flagged as high risk must not be published until reviewed by a qualified regulatory affairs professional — AI-generated risk reviews are preliminary assessments, not compliance determinations.',
      'This skill must not be used to "clear" health claims for publication — its output identifies risks for human expert review, not for automated approval gating.',
      'Do not use this skill to review health claims for products where the output could be used to defend against a regulatory action — regulatory defense requires qualified legal counsel and formal regulatory expertise.',
      'Content reviewed by this skill that contains implied disease claims for patients with serious conditions must be flagged for clinician review before distribution — misleading health claims can delay appropriate care.',
    ],
  },
  examples: [
    {
      label: 'Framing failure — technically true claim that is misleadingly presented',
      input:
        'Supplement marketing claim: "In a clinical study, participants taking [Product] showed a 33% reduction in cardiovascular risk compared to placebo."',
      output:
        'Risk Classification: HIGH — framing failure with potential for material consumer harm. Factual Accuracy: The claim may be technically accurate if the underlying study exists. Framing Analysis: A "33% reduction in risk" is almost certainly a relative risk reduction (RRR), not an absolute risk reduction (ARR). If the placebo group had a 3% event rate and the treatment group had a 2% event rate, the RRR is 33% — but the ARR is 1pp. Consumers interpret "33% reduction" as large absolute benefit; the actual absolute benefit is 1 in 100 additional people protected. Required disclosure to be non-misleading: state both the RRR and the ARR, plus the baseline event rate. Additional Risks: (1) "Clinical study" — does not specify RCT, observational, or pilot study; consumers assume RCT-level evidence; requires study design disclosure. (2) "Cardiovascular risk" is a disease claim territory — regulatory review is required for supplement marketing in the US (FTC/FDA) and EU. (3) No disclosure of study population — cardiovascular risk in a high-risk cohort does not generalize to a general wellness population. Recommendation: Do not publish without: (a) absolute risk reduction stated alongside relative risk reduction; (b) study design disclosed; (c) qualified regulatory review completed.',
      note:
        'Shows correct identification of the RRR vs. ARR framing failure — the claim is technically true but the presentation creates a false impression of large absolute benefit. The risk is framing, not fabrication, which is why it passes a naive fact-check.',
    },
  ],
});
