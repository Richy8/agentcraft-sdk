import { definePackSpec } from '../../../packs/registry.js';

export const CREATOR_LINKEDIN_PACK_SPEC = definePackSpec({
  name: 'creator-linkedin-skills',
  description: 'Creator Linkedin skill pack.',
  domain: 'creator',
  category: 'linkedin',
  skillIds: [
    'linkedin-audience-research',
    'linkedin-ideation',
    'linkedin-post-writer',
    'linkedin-carousel-brief',
    'linkedin-hook-review',
    'linkedin-calendar',
    'linkedin-performance-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/creator/packs.md',
  examples: [
    'createSkillPackByName("creator-linkedin-skills")',
    'agent.use(createSkillPackByName("creator-linkedin-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("creator-linkedin-skills") })',
  ],
});
