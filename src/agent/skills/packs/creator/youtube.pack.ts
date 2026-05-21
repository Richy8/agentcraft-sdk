import { definePackSpec } from '../../../packs/registry.js';

export const CREATOR_YOUTUBE_PACK_SPEC = definePackSpec({
  name: 'creator-youtube-skills',
  description: 'Creator Youtube skill pack.',
  domain: 'creator',
  category: 'youtube',
  skillIds: [
    'youtube-topic-research',
    'youtube-title-thumbnail-brief',
    'youtube-thumbnail-brief',
    'youtube-scriptwriter',
    'youtube-retention-review',
    'youtube-chapter-writer',
    'youtube-description-tags-writer',
    'youtube-community-post-writer',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/creator/packs.md',
  examples: [
    'createSkillPackByName("creator-youtube-skills")',
    'agent.use(createSkillPackByName("creator-youtube-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("creator-youtube-skills") })',
  ],
});
