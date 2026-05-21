export { WEEKLY_METRIC_SUMMARY_SKILL_SPEC } from './weekly-metric-summary.skill.js';
export { EXECUTIVE_DATA_BRIEF_SKILL_SPEC } from './executive-data-brief.skill.js';
export { ANOMALY_INVESTIGATION_SKILL_SPEC } from './anomaly-investigation.skill.js';
export { COHORT_ANALYSIS_BRIEF_SKILL_SPEC } from './cohort-analysis-brief.skill.js';

import { WEEKLY_METRIC_SUMMARY_SKILL_SPEC } from './weekly-metric-summary.skill.js';
import { EXECUTIVE_DATA_BRIEF_SKILL_SPEC } from './executive-data-brief.skill.js';
import { ANOMALY_INVESTIGATION_SKILL_SPEC } from './anomaly-investigation.skill.js';
import { COHORT_ANALYSIS_BRIEF_SKILL_SPEC } from './cohort-analysis-brief.skill.js';

export const DATA_ANALYTICS_REPORTING_SKILL_SPECS = [
  WEEKLY_METRIC_SUMMARY_SKILL_SPEC,
  EXECUTIVE_DATA_BRIEF_SKILL_SPEC,
  ANOMALY_INVESTIGATION_SKILL_SPEC,
  COHORT_ANALYSIS_BRIEF_SKILL_SPEC,
] as const;
