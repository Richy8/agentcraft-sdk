import { definePackSpec } from '../../../packs/registry.js';

export const CREATOR_SHORT_VIDEO_PACK_SPEC = definePackSpec({
  name: 'creator-short-video-skills',
  description: 'Creator Short Video skill pack.',
  domain: 'creator',
  category: 'short-video',
  skillIds: [
    'short-video-ideation',
    'short-video-scriptwriter',
    'short-video-shot-list',
    'short-video-caption-writer',
    'short-video-platform-adapter',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/creator/packs.md',
  examples: [
    'createSkillPackByName("creator-short-video-skills")',
    'agent.use(createSkillPackByName("creator-short-video-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("creator-short-video-skills") })',
  ],
});
