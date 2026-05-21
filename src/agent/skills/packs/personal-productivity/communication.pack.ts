import { definePackSpec } from '../../../packs/registry.js';

export const PERSONAL_PRODUCTIVITY_COMMUNICATION_PACK_SPEC = definePackSpec({
  name: 'personal-productivity-communication-skills',
  description: 'Personal Productivity And Life Admin Communication skill pack.',
  domain: 'personal-productivity',
  category: 'communication',
  skillIds: [
    'personal-email-draft',
    'difficult-conversation-planner',
    'followup-message-writer',
    'decision-journal-entry',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("personal-productivity-communication-skills")',
    'agent.use(createSkillPackByName("personal-productivity-communication-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("personal-productivity-communication-skills") })',
  ],
});
