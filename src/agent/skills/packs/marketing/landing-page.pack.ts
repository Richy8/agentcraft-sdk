import { definePackSpec } from '../../../packs/registry.js';

export const MARKETING_LANDING_PAGE_PACK_SPEC = definePackSpec({
  name: 'marketing-landing-page-skills',
  description: 'Marketing Landing Page skill pack.',
  domain: 'marketing',
  category: 'landing-page',
  skillIds: [
    'landing-page-positioning',
    'landing-page-copywriter',
    'landing-page-wireframe-brief',
    'landing-page-conversion-review',
    'landing-page-claim-risk-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("marketing-landing-page-skills")',
    'agent.use(createSkillPackByName("marketing-landing-page-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("marketing-landing-page-skills") })',
  ],
});
