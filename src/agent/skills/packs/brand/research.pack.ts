import { definePackSpec } from '../../../packs/registry.js';

export const BRAND_RESEARCH_PACK_SPEC = definePackSpec({
  name: 'brand-research-skills',
  description: 'Brand Research skill pack.',
  domain: 'brand',
  category: 'research',
  skillIds: [
    'brand-research',
    'audience-insight-research',
    'voice-of-customer-mining',
    'competitor-brand-scan',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("brand-research-skills")',
    'agent.use(createSkillPackByName("brand-research-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("brand-research-skills") })',
  ],
});
