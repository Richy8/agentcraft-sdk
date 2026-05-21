import { definePackSpec } from '../../../packs/registry.js';

export const CREATOR_PODCAST_PACK_SPEC = definePackSpec({
  name: 'creator-podcast-skills',
  description: 'Creator Podcast skill pack.',
  domain: 'creator',
  category: 'podcast',
  skillIds: [
    'podcast-topic-research',
    'podcast-outline-writer',
    'podcast-interview-question-writer',
    'podcast-show-notes-writer',
    'podcast-clip-repurposing',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/creator/packs.md',
  examples: [
    'createSkillPackByName("creator-podcast-skills")',
    'agent.use(createSkillPackByName("creator-podcast-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("creator-podcast-skills") })',
  ],
});
