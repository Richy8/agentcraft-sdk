import { definePackSpec } from '../../../packs/registry.js';

export const CREATOR_MEDIUM_PACK_SPEC = definePackSpec({
  name: 'creator-medium-skills',
  description: 'Creator Medium skill pack.',
  domain: 'creator',
  category: 'medium',
  skillIds: [
    'medium-audience-research',
    'medium-story-angle',
    'medium-article-writer',
    'medium-title-subtitle-review',
    'medium-publication-fit-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/creator/packs.md',
  examples: [
    'createSkillPackByName("creator-medium-skills")',
    'agent.use(createSkillPackByName("creator-medium-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("creator-medium-skills") })',
  ],
});
