import { definePackSpec } from '../../../packs/registry.js';

export const CREATOR_SUBSTACK_PACK_SPEC = definePackSpec({
  name: 'creator-substack-skills',
  description: 'Creator Substack skill pack.',
  domain: 'creator',
  category: 'substack',
  skillIds: [
    'substack-positioning',
    'substack-issue-writer',
    'substack-paid-free-strategy',
    'substack-community-thread-writer',
    'substack-retention-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/creator/packs.md',
  examples: [
    'createSkillPackByName("creator-substack-skills")',
    'agent.use(createSkillPackByName("creator-substack-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("creator-substack-skills") })',
  ],
});
