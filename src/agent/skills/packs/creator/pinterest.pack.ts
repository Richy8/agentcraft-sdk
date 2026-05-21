import { definePackSpec } from '../../../packs/registry.js';

export const CREATOR_PINTEREST_PACK_SPEC = definePackSpec({
  name: 'creator-pinterest-skills',
  description: 'Creator Pinterest skill pack.',
  domain: 'creator',
  category: 'pinterest',
  skillIds: [
    'pinterest-keyword-research',
    'pinterest-pin-title-description-writer',
    'pinterest-board-planner',
    'pinterest-visual-brief',
    'pinterest-seasonality-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/creator/packs.md',
  examples: [
    'createSkillPackByName("creator-pinterest-skills")',
    'agent.use(createSkillPackByName("creator-pinterest-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("creator-pinterest-skills") })',
  ],
});
