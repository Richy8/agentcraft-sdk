import { definePackSpec } from '../../../packs/registry.js';

export const HEALTHCARE_CLINICAL_ADMIN_PACK_SPEC = definePackSpec({
  name: 'healthcare-clinical-admin-skills',
  description: 'Healthcare Clinical Admin skill pack.',
  domain: 'healthcare',
  category: 'clinical-admin',
  skillIds: [
    'clinical-note-summary',
    'intake-summary',
    'referral-letter-draft',
    'care-plan-summary',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("healthcare-clinical-admin-skills")',
    'agent.use(createSkillPackByName("healthcare-clinical-admin-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("healthcare-clinical-admin-skills") })',
  ],
  humanReviewRequired: true,
});
