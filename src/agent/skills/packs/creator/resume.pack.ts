import { definePackSpec } from '../../../packs/registry.js';

export const CREATOR_RESUME_PACK_SPEC = definePackSpec({
  name: 'creator-resume-skills',
  description: 'Creator Resume skill pack.',
  domain: 'creator',
  category: 'resume',
  skillIds: [
    'resume-role-research',
    'resume-writer',
    'resume-ats-review',
    'resume-tailoring',
    'cover-letter-writer',
    'linkedin-profile-optimizer',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/creator/packs.md',
  examples: [
    'createSkillPackByName("creator-resume-skills")',
    'agent.use(createSkillPackByName("creator-resume-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("creator-resume-skills") })',
  ],
});
