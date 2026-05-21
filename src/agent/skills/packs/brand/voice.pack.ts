import { definePackSpec } from '../../../packs/registry.js';

export const BRAND_VOICE_PACK_SPEC = definePackSpec({
  name: 'brand-voice-skills',
  description: 'Brand Voice skill pack.',
  domain: 'brand',
  category: 'voice',
  skillIds: [
    'brand-voice-profile',
    'tone-of-voice-guide',
    'brand-guideline-writer',
    'brand-consistency-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("brand-voice-skills")',
    'agent.use(createSkillPackByName("brand-voice-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("brand-voice-skills") })',
  ],
});
