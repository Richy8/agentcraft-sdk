export { LEGAL_COMPLIANCE_POLICY_GAP_ANALYSIS_SKILL_SPEC } from './policy-gap-analysis.skill.js';
export { LEGAL_COMPLIANCE_COMPLIANCE_CHECKLIST_SKILL_SPEC } from './compliance-checklist.skill.js';
export { LEGAL_COMPLIANCE_REGULATED_CLAIM_REVIEW_SKILL_SPEC } from './regulated-claim-review.skill.js';
export { LEGAL_COMPLIANCE_AUDIT_EVIDENCE_SUMMARY_SKILL_SPEC } from './audit-evidence-summary.skill.js';

import { LEGAL_COMPLIANCE_POLICY_GAP_ANALYSIS_SKILL_SPEC } from './policy-gap-analysis.skill.js';
import { LEGAL_COMPLIANCE_COMPLIANCE_CHECKLIST_SKILL_SPEC } from './compliance-checklist.skill.js';
import { LEGAL_COMPLIANCE_REGULATED_CLAIM_REVIEW_SKILL_SPEC } from './regulated-claim-review.skill.js';
import { LEGAL_COMPLIANCE_AUDIT_EVIDENCE_SUMMARY_SKILL_SPEC } from './audit-evidence-summary.skill.js';

export const LEGAL_COMPLIANCE_SKILL_SPECS = [
  LEGAL_COMPLIANCE_POLICY_GAP_ANALYSIS_SKILL_SPEC,
  LEGAL_COMPLIANCE_COMPLIANCE_CHECKLIST_SKILL_SPEC,
  LEGAL_COMPLIANCE_REGULATED_CLAIM_REVIEW_SKILL_SPEC,
  LEGAL_COMPLIANCE_AUDIT_EVIDENCE_SUMMARY_SKILL_SPEC,
] as const;
