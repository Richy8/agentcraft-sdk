import { definePackSpec } from '../../../packs/registry.js';

export const HEALTHCARE_MEDICAL_RESEARCH_PACK_SPEC = definePackSpec({
  name: 'healthcare-medical-research-skills',
  description: 'Healthcare Medical Research skill pack.',
  domain: 'healthcare',
  category: 'medical-research',
  skillIds: [
    'medical-literature-synthesis',
    'evidence-grade-review',
    'clinical-guideline-comparison',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("healthcare-medical-research-skills")',
    'agent.use(createSkillPackByName("healthcare-medical-research-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("healthcare-medical-research-skills") })',
  ],
  humanReviewRequired: true,
});
