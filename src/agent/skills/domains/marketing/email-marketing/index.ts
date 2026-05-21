export { EMAIL_SEQUENCE_PLANNER_SKILL_SPEC } from './email-sequence-planner.skill.js';
export { EMAIL_COPYWRITER_SKILL_SPEC } from './email-copywriter.skill.js';
export { EMAIL_SUBJECT_LINE_REVIEW_SKILL_SPEC } from './email-subject-line-review.skill.js';
export { EMAIL_SEGMENTATION_ANALYSIS_SKILL_SPEC } from './email-segmentation-analysis.skill.js';
export { EMAIL_PERFORMANCE_REVIEW_SKILL_SPEC } from './email-performance-review.skill.js';

import { EMAIL_SEQUENCE_PLANNER_SKILL_SPEC } from './email-sequence-planner.skill.js';
import { EMAIL_COPYWRITER_SKILL_SPEC } from './email-copywriter.skill.js';
import { EMAIL_SUBJECT_LINE_REVIEW_SKILL_SPEC } from './email-subject-line-review.skill.js';
import { EMAIL_SEGMENTATION_ANALYSIS_SKILL_SPEC } from './email-segmentation-analysis.skill.js';
import { EMAIL_PERFORMANCE_REVIEW_SKILL_SPEC } from './email-performance-review.skill.js';

export const MARKETING_EMAIL_MARKETING_SKILL_SPECS = [
  EMAIL_SEQUENCE_PLANNER_SKILL_SPEC,
  EMAIL_COPYWRITER_SKILL_SPEC,
  EMAIL_SUBJECT_LINE_REVIEW_SKILL_SPEC,
  EMAIL_SEGMENTATION_ANALYSIS_SKILL_SPEC,
  EMAIL_PERFORMANCE_REVIEW_SKILL_SPEC,
] as const;
