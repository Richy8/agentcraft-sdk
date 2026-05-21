import { definePackSpec } from '../../../packs/registry.js';

export const CREATOR_NEWSLETTER_PACK_SPEC = definePackSpec({
  name: 'creator-newsletter-skills',
  description: 'Creator Newsletter skill pack.',
  domain: 'creator',
  category: 'newsletter',
  skillIds: [
    'newsletter-audience-research',
    'newsletter-issue-planner',
    'newsletter-writer',
    'newsletter-subject-line-review',
    'newsletter-sponsorship-copy-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/creator/packs.md',
  examples: [
    'createSkillPackByName("creator-newsletter-skills")',
    'agent.use(createSkillPackByName("creator-newsletter-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("creator-newsletter-skills") })',
  ],
});
