import { definePackSpec } from '../../../packs/registry.js';

export const CREATOR_TIKTOK_PACK_SPEC = definePackSpec({
  name: 'creator-tiktok-skills',
  description: 'Creator Tiktok skill pack.',
  domain: 'creator',
  category: 'tiktok',
  skillIds: [
    'tiktok-trend-research',
    'tiktok-hook-writer',
    'tiktok-scriptwriter',
    'tiktok-shot-list',
    'tiktok-retention-review',
    'tiktok-safety-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/creator/packs.md',
  examples: [
    'createSkillPackByName("creator-tiktok-skills")',
    'agent.use(createSkillPackByName("creator-tiktok-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("creator-tiktok-skills") })',
  ],
});
