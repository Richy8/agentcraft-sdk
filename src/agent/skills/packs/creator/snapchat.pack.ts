import { definePackSpec } from '../../../packs/registry.js';

export const CREATOR_SNAPCHAT_PACK_SPEC = definePackSpec({
  name: 'creator-snapchat-skills',
  description: 'Creator Snapchat skill pack.',
  domain: 'creator',
  category: 'snapchat',
  skillIds: [
    'snapchat-story-planner',
    'snapchat-short-copywriter',
    'snapchat-ar-filter-brief',
    'snapchat-youth-safety-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/creator/packs.md',
  examples: [
    'createSkillPackByName("creator-snapchat-skills")',
    'agent.use(createSkillPackByName("creator-snapchat-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("creator-snapchat-skills") })',
  ],
});
