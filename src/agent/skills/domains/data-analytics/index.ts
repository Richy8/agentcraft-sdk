import { registerSkillSpecs } from '../../registries/index.js';
import { DATA_ANALYTICS_DASHBOARD_SKILL_SPECS } from './dashboard/index.js';
import { DATA_ANALYTICS_EXPERIMENT_ANALYSIS_SKILL_SPECS } from './experiment-analysis/index.js';
import { DATA_ANALYTICS_REPORTING_SKILL_SPECS } from './reporting/index.js';

export { defineDataAnalyticsSkillSpec } from './data-analytics-skill-utils.js';
export type { DataAnalyticsSkillDefinition } from './data-analytics-skill-utils.js';

export const DATA_ANALYTICS_DOMAIN_SKILL_SPECS = [
  ...DATA_ANALYTICS_DASHBOARD_SKILL_SPECS,
  ...DATA_ANALYTICS_EXPERIMENT_ANALYSIS_SKILL_SPECS,
  ...DATA_ANALYTICS_REPORTING_SKILL_SPECS,
] as const;

registerSkillSpecs(DATA_ANALYTICS_DOMAIN_SKILL_SPECS);
