import { definePackSpec } from '../../../packs/registry.js';

export const BRAND_POSITIONING_PACK_SPEC = definePackSpec({
  name: 'brand-positioning-skills',
  description: 'Brand Positioning skill pack.',
  domain: 'brand',
  category: 'positioning',
  skillIds: [
    'brand-positioning',
    'brand-differentiation-map',
    'brand-promise-writer',
    'brand-narrative-brief',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("brand-positioning-skills")',
    'agent.use(createSkillPackByName("brand-positioning-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("brand-positioning-skills") })',
  ],
});
