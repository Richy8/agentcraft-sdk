import { definePackSpec } from '../../../packs/registry.js';

export const CREATOR_WEBINAR_PACK_SPEC = definePackSpec({
  name: 'creator-webinar-skills',
  description: 'Creator Webinar skill pack.',
  domain: 'creator',
  category: 'webinar',
  skillIds: [
    'webinar-topic-research',
    'webinar-outline-writer',
    'webinar-slide-brief',
    'webinar-promo-copywriter',
    'webinar-followup-sequence',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/creator/packs.md',
  examples: [
    'createSkillPackByName("creator-webinar-skills")',
    'agent.use(createSkillPackByName("creator-webinar-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("creator-webinar-skills") })',
  ],
});
