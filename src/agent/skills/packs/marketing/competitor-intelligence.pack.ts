import { definePackSpec } from '../../../packs/registry.js';

export const MARKETING_COMPETITOR_INTELLIGENCE_PACK_SPEC = definePackSpec({
  name: 'marketing-competitor-intelligence-skills',
  description: 'Marketing Competitor Intelligence skill pack.',
  domain: 'marketing',
  category: 'competitor-intelligence',
  skillIds: [
    'competitor-content-analysis',
    'competitor-positioning-map',
    'competitor-offer-review',
    'competitor-gap-synthesis',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("marketing-competitor-intelligence-skills")',
    'agent.use(createSkillPackByName("marketing-competitor-intelligence-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("marketing-competitor-intelligence-skills") })',
  ],
});
