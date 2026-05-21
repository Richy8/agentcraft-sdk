export { PATIENT_EDUCATION_WRITER_SKILL_SPEC } from './patient-education-writer.skill.js';
export { MEDICAL_PLAIN_LANGUAGE_REVIEW_SKILL_SPEC } from './medical-plain-language-review.skill.js';
export { CARE_INSTRUCTION_SUMMARY_SKILL_SPEC } from './care-instruction-summary.skill.js';
export { HEALTH_CLAIM_RISK_REVIEW_SKILL_SPEC } from './health-claim-risk-review.skill.js';

import { PATIENT_EDUCATION_WRITER_SKILL_SPEC } from './patient-education-writer.skill.js';
import { MEDICAL_PLAIN_LANGUAGE_REVIEW_SKILL_SPEC } from './medical-plain-language-review.skill.js';
import { CARE_INSTRUCTION_SUMMARY_SKILL_SPEC } from './care-instruction-summary.skill.js';
import { HEALTH_CLAIM_RISK_REVIEW_SKILL_SPEC } from './health-claim-risk-review.skill.js';

export const HEALTHCARE_PATIENT_EDUCATION_SKILL_SPECS = [
  PATIENT_EDUCATION_WRITER_SKILL_SPEC,
  MEDICAL_PLAIN_LANGUAGE_REVIEW_SKILL_SPEC,
  CARE_INSTRUCTION_SUMMARY_SKILL_SPEC,
  HEALTH_CLAIM_RISK_REVIEW_SKILL_SPEC,
] as const;
