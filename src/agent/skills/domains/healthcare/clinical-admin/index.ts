export { CLINICAL_NOTE_SUMMARY_SKILL_SPEC } from './clinical-note-summary.skill.js';
export { INTAKE_SUMMARY_SKILL_SPEC } from './intake-summary.skill.js';
export { REFERRAL_LETTER_DRAFT_SKILL_SPEC } from './referral-letter-draft.skill.js';
export { CARE_PLAN_SUMMARY_SKILL_SPEC } from './care-plan-summary.skill.js';

import { CLINICAL_NOTE_SUMMARY_SKILL_SPEC } from './clinical-note-summary.skill.js';
import { INTAKE_SUMMARY_SKILL_SPEC } from './intake-summary.skill.js';
import { REFERRAL_LETTER_DRAFT_SKILL_SPEC } from './referral-letter-draft.skill.js';
import { CARE_PLAN_SUMMARY_SKILL_SPEC } from './care-plan-summary.skill.js';

export const HEALTHCARE_CLINICAL_ADMIN_SKILL_SPECS = [
  CLINICAL_NOTE_SUMMARY_SKILL_SPEC,
  INTAKE_SUMMARY_SKILL_SPEC,
  REFERRAL_LETTER_DRAFT_SKILL_SPEC,
  CARE_PLAN_SUMMARY_SKILL_SPEC,
] as const;
