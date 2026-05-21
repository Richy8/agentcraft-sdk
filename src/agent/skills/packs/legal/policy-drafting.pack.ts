import { definePackSpec } from '../../../packs/registry.js';

export const LEGAL_POLICY_DRAFTING_PACK_SPEC = definePackSpec({
  name: 'legal-policy-drafting-skills',
  description: 'Legal And Compliance Policy Drafting skill pack.',
  domain: 'legal',
  category: 'policy-drafting',
  skillIds: [
    'policy-draft-writer',
    'policy-plain-language-review',
    'policy-change-summary',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("legal-policy-drafting-skills")',
    'agent.use(createSkillPackByName("legal-policy-drafting-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("legal-policy-drafting-skills") })',
  ],
  humanReviewRequired: true,
});
