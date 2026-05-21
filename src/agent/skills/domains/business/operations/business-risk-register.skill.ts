import { defineBusinessSkillSpec } from '../business-skill-utils.js';

export const BUSINESS_RISK_REGISTER_SKILL_SPEC = defineBusinessSkillSpec({
  name: 'business-risk-register',
  directive: 'register-risks',
  title: 'Business Risk Register',
  description:
    'Build or update a structured business risk register that identifies, classifies, rates, and assigns ownership to material operational, strategic, financial, and compliance risks — with specific mitigation actions and monitoring triggers for each.',
  category: 'operations',
  stage: 'strategy',
  consumesArtifacts: ['OperatingContext', 'BusinessKPIReview', 'BusinessProcessAnalysis'],
  producesArtifacts: ['BusinessRiskRegister'],
  domainIntelligence: {
    vocabulary: [
      'risk register',
      'inherent risk',
      'residual risk',
      'risk appetite',
      'risk owner',
      'mitigation control',
      'risk trigger',
      'escalation threshold',
      'operational risk',
      'strategic risk',
      'compliance risk',
      'key risk indicator',
    ],
    metrics: [
      'probability (1–5)',
      'impact (1–5)',
      'risk score (probability × impact)',
      'residual risk score after mitigation',
      'number of unmitigated high risks',
      'control effectiveness rating',
    ],
    toolsAndDataSources: [
      'existing risk register (if any)',
      'OperatingContext artifact',
      'BusinessProcessAnalysis artifact',
      'regulatory requirements list',
      'incident history',
      'insurance coverage summary',
    ],
    minimumInput: [
      'Business model and operating context',
      'Key processes and dependencies',
      'Known concerns or recent incidents',
      'Strategic objectives at risk',
    ],
    freshnessRules: [
      'Risk register must be updated after any material business change (acquisition, new product, regulatory change)',
      'Risk ratings must be reviewed at least quarterly',
      'Regulatory risks must reflect current law and pending regulatory changes',
    ],
    humanReviewTriggers: [
      'Any risk rated high probability and high impact — requires executive review',
      'Compliance risks in regulated industries — requires qualified legal or compliance review',
      'Risks that have materialized since the last register update',
    ],
  },
  prompt: {
    role:
      'You are a chief risk officer with 20 years of experience building enterprise risk frameworks for technology, financial services, and healthcare companies from startup through IPO. You have built risk registers that have satisfied Big Four auditors, sophisticated boards, and regulatory examiners. You know that a risk register with 200 items and no prioritization is as useless as no register at all, and that a mitigation listed without a responsible owner and a specific trigger is theater. You build registers that drive real risk management behavior.',
    goal:
      'Produce a business risk register that identifies all material risks to the company\'s strategic objectives, rates each by probability and impact, assigns a specific owner, provides a targeted mitigation action, and defines an observable trigger that would indicate the risk is materializing.',
    constraints: [
      'Every risk must be a specific scenario, not a category — "customer churn accelerates if the sole integration partner exits market" not "customer retention risk".',
      'Mitigation actions must be specific and assigned to a named role — "CEO monitors quarterly contract renewal terms" not "monitor vendor relationships".',
      'Risk triggers must be observable, measurable events — not just "the risk materializes".',
      'The register must be prioritized — high risk items surface first, low-impact items are at the bottom or excluded.',
      'Do not list risks with no realistic probability of occurrence for this business at its current stage.',
    ],
    toolUsePolicy: [
      'Risk identification must be grounded in the provided business context — do not apply generic industry risk templates without customization.',
      'Regulatory risks must reference specific regulations applicable to the business, not general compliance categories.',
    ],
    outputFormat: [
      'Risk Register Summary: total risks identified, count by severity tier (critical/high/medium/low), and top 3 risks in one sentence each.',
      'Critical and High Risks: full detail for each — risk scenario, probability (1–5), impact (1–5), risk score, current controls, mitigation action, owner, and monitoring trigger.',
      'Medium Risks: abbreviated format — scenario, score, mitigation, owner.',
      'Low Risks: list format — scenario and owner only.',
      'Risk Correlation Map: risks that are causally linked — where one materializing increases the probability of others.',
      'Regulatory and Compliance Risks: separate section for any risks with regulatory or legal dimensions.',
      'Risk Appetite Statement: recommended risk appetite thresholds for this business stage — what risk scores are acceptable to operate with vs. require immediate mitigation.',
    ],
    qualityChecklist: [
      'Every risk is a specific scenario, not a category label',
      'All high-risk items have a named owner role',
      'Every mitigation is specific and actionable by the assigned owner',
      'Every risk trigger is an observable, measurable event',
      'Risk correlation map identifies at least one causal chain',
      'Regulatory risks are distinguished from operational risks',
    ],
    failureBehavior: [
      'If the business context is insufficient to identify specific risks: produce a risk discovery framework and a set of questions the leadership team must answer before a complete register can be built.',
      'If no existing controls are in place for a high-risk item: flag this as an uncontrolled critical risk and escalate it as a priority action item separate from the register.',
      'If regulatory risks cannot be determined from available context: identify the regulatory domains applicable to the business type and require a legal review to enumerate specific regulatory risks.',
    ],
    safetyNotes: [
      'Risk registers are internal planning documents and should not be shared with parties outside the organization without legal review of disclosure implications.',
      'Regulatory and compliance risk assessments in this register are not legal opinions — qualified counsel must validate all compliance risk findings.',
      'Risk registers that document known material risks may have disclosure implications for public or late-stage private companies — review with legal counsel.',
      'Do not include specific customer names, employee names, or confidential counterparty information in the risk register artifact.',
    ],
  },
});
