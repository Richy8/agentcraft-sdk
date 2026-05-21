import { definePackSpec } from '../../../packs/registry.js';

export const DATA_ANALYTICS_EXPERIMENT_ANALYSIS_PACK_SPEC = definePackSpec({
  name: 'data-analytics-experiment-analysis-skills',
  description: 'Data Analytics Experiment Analysis skill pack.',
  domain: 'data-analytics',
  category: 'experiment-analysis',
  skillIds: [
    'experiment-design-review',
    'ab-test-analysis',
    'causality-risk-review',
    'experiment-readout-writer',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("data-analytics-experiment-analysis-skills")',
    'agent.use(createSkillPackByName("data-analytics-experiment-analysis-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("data-analytics-experiment-analysis-skills") })',
  ],
});
