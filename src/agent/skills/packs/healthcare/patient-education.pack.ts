import { definePackSpec } from '../../../packs/registry.js';

export const HEALTHCARE_PATIENT_EDUCATION_PACK_SPEC = definePackSpec({
  name: 'healthcare-patient-education-skills',
  description: 'Healthcare Patient Education skill pack.',
  domain: 'healthcare',
  category: 'patient-education',
  skillIds: [
    'patient-education-writer',
    'medical-plain-language-review',
    'care-instruction-summary',
    'health-claim-risk-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("healthcare-patient-education-skills")',
    'agent.use(createSkillPackByName("healthcare-patient-education-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("healthcare-patient-education-skills") })',
  ],
  humanReviewRequired: true,
});
