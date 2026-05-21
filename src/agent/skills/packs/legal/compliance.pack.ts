import { definePackSpec } from '../../../packs/registry.js';

export const LEGAL_COMPLIANCE_PACK_SPEC = definePackSpec({
  name: 'legal-compliance-skills',
  description: 'Legal And Compliance Compliance skill pack.',
  domain: 'legal',
  category: 'compliance',
  skillIds: [
    'policy-gap-analysis',
    'compliance-checklist',
    'regulated-claim-review',
    'audit-evidence-summary',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("legal-compliance-skills")',
    'agent.use(createSkillPackByName("legal-compliance-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("legal-compliance-skills") })',
  ],
  humanReviewRequired: true,
});
