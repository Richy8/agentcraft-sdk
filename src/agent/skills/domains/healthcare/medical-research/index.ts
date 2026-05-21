export { MEDICAL_LITERATURE_SYNTHESIS_SKILL_SPEC } from './medical-literature-synthesis.skill.js';
export { EVIDENCE_GRADE_REVIEW_SKILL_SPEC } from './evidence-grade-review.skill.js';
export { CLINICAL_GUIDELINE_COMPARISON_SKILL_SPEC } from './clinical-guideline-comparison.skill.js';

import { MEDICAL_LITERATURE_SYNTHESIS_SKILL_SPEC } from './medical-literature-synthesis.skill.js';
import { EVIDENCE_GRADE_REVIEW_SKILL_SPEC } from './evidence-grade-review.skill.js';
import { CLINICAL_GUIDELINE_COMPARISON_SKILL_SPEC } from './clinical-guideline-comparison.skill.js';

export const HEALTHCARE_MEDICAL_RESEARCH_SKILL_SPECS = [
  MEDICAL_LITERATURE_SYNTHESIS_SKILL_SPEC,
  EVIDENCE_GRADE_REVIEW_SKILL_SPEC,
  CLINICAL_GUIDELINE_COMPARISON_SKILL_SPEC,
] as const;
