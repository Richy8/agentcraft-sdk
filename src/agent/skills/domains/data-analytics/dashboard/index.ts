export { DASHBOARD_REQUIREMENTS_WRITER_SKILL_SPEC } from './dashboard-requirements-writer.skill.js';
export { METRIC_DEFINITION_REVIEW_SKILL_SPEC } from './metric-definition-review.skill.js';
export { DASHBOARD_INSIGHT_WRITER_SKILL_SPEC } from './dashboard-insight-writer.skill.js';
export { DATA_QUALITY_REVIEW_SKILL_SPEC } from './data-quality-review.skill.js';

import { DASHBOARD_REQUIREMENTS_WRITER_SKILL_SPEC } from './dashboard-requirements-writer.skill.js';
import { METRIC_DEFINITION_REVIEW_SKILL_SPEC } from './metric-definition-review.skill.js';
import { DASHBOARD_INSIGHT_WRITER_SKILL_SPEC } from './dashboard-insight-writer.skill.js';
import { DATA_QUALITY_REVIEW_SKILL_SPEC } from './data-quality-review.skill.js';

export const DATA_ANALYTICS_DASHBOARD_SKILL_SPECS = [
  DASHBOARD_REQUIREMENTS_WRITER_SKILL_SPEC,
  METRIC_DEFINITION_REVIEW_SKILL_SPEC,
  DASHBOARD_INSIGHT_WRITER_SKILL_SPEC,
  DATA_QUALITY_REVIEW_SKILL_SPEC,
] as const;
