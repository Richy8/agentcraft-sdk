import { definePackSpec } from '../../../packs/registry.js';

export const DATA_ANALYTICS_REPORTING_PACK_SPEC = definePackSpec({
  name: 'data-analytics-reporting-skills',
  description: 'Data Analytics Reporting skill pack.',
  domain: 'data-analytics',
  category: 'reporting',
  skillIds: [
    'weekly-metric-summary',
    'executive-data-brief',
    'anomaly-investigation',
    'cohort-analysis-brief',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("data-analytics-reporting-skills")',
    'agent.use(createSkillPackByName("data-analytics-reporting-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("data-analytics-reporting-skills") })',
  ],
});
