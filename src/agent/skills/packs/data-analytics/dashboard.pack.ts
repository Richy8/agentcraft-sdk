import { definePackSpec } from '../../../packs/registry.js';

export const DATA_ANALYTICS_DASHBOARD_PACK_SPEC = definePackSpec({
  name: 'data-analytics-dashboard-skills',
  description: 'Data Analytics Dashboard skill pack.',
  domain: 'data-analytics',
  category: 'dashboard',
  skillIds: [
    'dashboard-requirements-writer',
    'metric-definition-review',
    'dashboard-insight-writer',
    'data-quality-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("data-analytics-dashboard-skills")',
    'agent.use(createSkillPackByName("data-analytics-dashboard-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("data-analytics-dashboard-skills") })',
  ],
});
