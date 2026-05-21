import { definePackSpec } from '../../../packs/registry.js';

export const MARKETING_CAMPAIGN_PACK_SPEC = definePackSpec({
  name: 'marketing-campaign-skills',
  description: 'Marketing Campaign skill pack.',
  domain: 'marketing',
  category: 'campaign',
  skillIds: [
    'campaign-strategy',
    'campaign-calendar',
    'campaign-brief',
    'campaign-asset-planner',
    'campaign-performance-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("marketing-campaign-skills")',
    'agent.use(createSkillPackByName("marketing-campaign-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("marketing-campaign-skills") })',
  ],
});
