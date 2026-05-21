import { definePackSpec } from '../../../packs/registry.js';

export const MARKETING_ADS_PACK_SPEC = definePackSpec({
  name: 'marketing-ads-skills',
  description: 'Marketing Ads skill pack.',
  domain: 'marketing',
  category: 'ads',
  skillIds: [
    'ad-audience-research',
    'ad-angle-generator',
    'ad-copywriter',
    'ad-creative-brief',
    'ad-compliance-review',
    'ad-variant-analysis',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("marketing-ads-skills")',
    'agent.use(createSkillPackByName("marketing-ads-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("marketing-ads-skills") })',
  ],
});
