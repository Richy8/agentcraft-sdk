import { definePackSpec } from '../../../packs/registry.js';

export const CREATOR_X_TWITTER_PACK_SPEC = definePackSpec({
  name: 'creator-x-twitter-skills',
  description: 'Creator X Twitter skill pack.',
  domain: 'creator',
  category: 'x-twitter',
  skillIds: [
    'x-topic-research',
    'x-post-writer',
    'x-thread-writer',
    'x-hook-review',
    'x-community-reply-writer',
    'x-trend-risk-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/creator/packs.md',
  examples: [
    'createSkillPackByName("creator-x-twitter-skills")',
    'agent.use(createSkillPackByName("creator-x-twitter-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("creator-x-twitter-skills") })',
  ],
});
