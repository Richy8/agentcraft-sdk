import { definePackSpec } from '../../../packs/registry.js';

export const CREATOR_FACEBOOK_PACK_SPEC = definePackSpec({
  name: 'creator-facebook-skills',
  description: 'Creator Facebook skill pack.',
  domain: 'creator',
  category: 'facebook',
  skillIds: [
    'facebook-audience-research',
    'facebook-post-writer',
    'facebook-group-post-writer',
    'facebook-adjacent-content-review',
    'facebook-community-engagement-planner',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/creator/packs.md',
  examples: [
    'createSkillPackByName("creator-facebook-skills")',
    'agent.use(createSkillPackByName("creator-facebook-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("creator-facebook-skills") })',
  ],
});
