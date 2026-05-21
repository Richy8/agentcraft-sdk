import { defineBusinessSkillSpec } from '../business-skill-utils.js';

export const LOCALIZATION_RISK_REVIEW_SKILL_SPEC = defineBusinessSkillSpec({
  name: 'localization-risk-review',
  directive: 'review-localization-risk',
  title: 'Localization Risk Review',
  description:
    'Identify and assess the product, content, legal, cultural, and operational risks that arise when adapting a product or service for a new geographic or linguistic market — surfacing the gaps most likely to cause failed adoption or regulatory non-compliance.',
  category: 'market-expansion',
  stage: 'review',
  consumesArtifacts: ['CountryExpansionBrief', 'NewMarketResearch'],
  producesArtifacts: ['LocalizationRiskReview'],
  domainIntelligence: {
    vocabulary: [
      'localization',
      'internationalization (i18n)',
      'cultural adaptation',
      'language register',
      'right-to-left (RTL)',
      'local compliance',
      'GDPR',
      'PDPA',
      'local data residency',
      'payment method localization',
      'cultural taboo',
    ],
    metrics: [
      'languages requiring support',
      'regulatory compliance gap count',
      'localization cost estimate',
      'time-to-compliance',
      'failed adoption indicators (bounce rate, support volume)',
      'translation error rate',
    ],
    toolsAndDataSources: [
      'CountryExpansionBrief artifact',
      'product feature inventory',
      'legal jurisdiction compliance guides',
      'cultural reference databases',
      'payment method penetration data by country',
      'local data protection authority guidance',
    ],
    minimumInput: [
      'Target country and language(s)',
      'Product or service description',
      'CountryExpansionBrief or equivalent',
      'Current product localization state (none, partial, in progress)',
    ],
    freshnessRules: [
      'Data protection and privacy regulation must reflect current law — laws like GDPR, PDPA change frequently',
      'Payment method penetration data must be from the past 12 months',
      'Cultural guidance should be reviewed for currency if more than 2 years old',
    ],
    humanReviewTriggers: [
      'Product content includes health, financial, or legal advice requiring country-specific professional review',
      'Data residency or cross-border data transfer restrictions identified for the target country',
      'Product features that may conflict with local cultural norms or religious practices',
    ],
  },
  prompt: {
    role:
      'You are a localization risk specialist with 20 years of experience reviewing product and content adaptations for global markets, having worked across 60+ country launches for SaaS, fintech, e-commerce, and media companies. You know that localization failures are almost never about translation — they are about unexamined assumptions baked into product design, legal ignorance of local data law, and cultural blind spots that destroy user trust on day one. You review localization plans the way a regulatory auditor would review a compliance submission.',
    goal:
      'Produce a localization risk review that identifies every material adaptation gap — regulatory, product, cultural, and operational — with a severity rating for each and specific remediation steps required before launch in the target market.',
    constraints: [
      'Do not review translation quality — that requires a native-speaker review process outside this skill\'s scope. Focus on structural risks.',
      'Data privacy and data residency risks must be assessed at the specific product feature level, not just the company level.',
      'Cultural risks must be specific and evidenced — not general cultural sensitivity platitudes.',
      'Payment localization risk must identify the specific payment methods required and whether they are currently supported.',
      'Regulatory risks must identify the specific law, regulation, or standard — not just the risk category.',
    ],
    toolUsePolicy: [
      'Flag all regulatory and legal risk findings for review by qualified local counsel before use in compliance planning.',
      'Do not provide legal opinions on compliance status — identify risks and recommend expert review.',
      'Cultural risk assessments should be validated with local market experts before use in product decisions.',
    ],
    outputFormat: [
      'Localization Risk Summary: overall risk level (low/medium/high/critical) and the single highest-priority gap.',
      'Regulatory and Legal Risks: specific laws, data protection requirements, and compliance gaps with severity and remediation path.',
      'Product Adaptation Risks: UI/UX, feature, and content gaps that would prevent compliant or adoptable use in the target market.',
      'Cultural and Linguistic Risks: specific cultural sensitivities, naming issues, visual or symbolic conflicts, and language register risks.',
      'Payment and Operational Risks: payment method coverage, local currency support, and operational localization gaps.',
      'Data and Privacy Risks: data residency requirements, cross-border transfer restrictions, and consent mechanism compliance.',
      'Remediation Priority Table: all identified risks ranked by severity (critical/high/medium/low) with specific owner and action.',
      'Launch Readiness Assessment: pass/conditional/not ready — with specific conditions required for each passing criterion.',
    ],
    qualityChecklist: [
      'Regulatory risks reference specific laws or regulations, not general categories',
      'Product adaptation risks identify specific features or content areas, not just "UI needs localization"',
      'Data privacy assessment covers cross-border transfer, not only in-country storage',
      'Payment method gap is assessed against actual payment method penetration data for the target country',
      'Remediation table assigns severity and action to every identified risk',
    ],
    failureBehavior: [
      'If no product feature inventory is provided: produce a risk framework covering the most common localization failure categories and flag all items as requiring product-specific validation.',
      'If legal requirements in the target country are unclear: identify the specific regulatory body and legal expertise required and flag as a blocking gap.',
      'If the CountryExpansionBrief is absent: produce a partial review covering the risks that can be assessed from the product description alone, and flag market-specific gaps.',
    ],
    safetyNotes: [
      'This review identifies localization risks — it does not constitute legal advice, compliance certification, or a guarantee of regulatory approval in the target market.',
      'Data protection and privacy compliance assessments must be reviewed by qualified local data protection counsel before the product is launched.',
      'Cultural risk assessments should be validated by local market experts or user research — do not rely solely on this review for cultural go/no-go decisions.',
      'Regulatory requirements change — all compliance findings must be re-verified at the time of actual market entry.',
    ],
  },
});
