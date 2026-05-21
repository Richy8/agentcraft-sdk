import { definePackSpec } from '../../../packs/registry.js';

export const BRAND_MESSAGING_PACK_SPEC = definePackSpec({
  name: 'brand-messaging-skills',
  description: 'Brand Messaging skill pack.',
  domain: 'brand',
  category: 'messaging',
  skillIds: [
    'messaging-framework-writer',
    'tagline-options-writer',
    'value-proposition-writer',
    'brand-story-writer',
    'proof-point-mapper',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("brand-messaging-skills")',
    'agent.use(createSkillPackByName("brand-messaging-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("brand-messaging-skills") })',
  ],
});
