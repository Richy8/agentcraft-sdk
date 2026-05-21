import { definePackSpec } from '../../../packs/registry.js';

export const CREATOR_INSTAGRAM_PACK_SPEC = definePackSpec({
  name: 'creator-instagram-skills',
  description: 'Creator Instagram skill pack.',
  domain: 'creator',
  category: 'instagram',
  skillIds: [
    'instagram-caption-writer',
    'instagram-carousel-brief',
    'instagram-reel-scriptwriter',
    'instagram-hashtag-review',
    'instagram-visual-direction',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/creator/packs.md',
  examples: [
    'createSkillPackByName("creator-instagram-skills")',
    'agent.use(createSkillPackByName("creator-instagram-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("creator-instagram-skills") })',
  ],
});
