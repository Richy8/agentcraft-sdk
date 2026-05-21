import { definePackSpec } from '../../../packs/registry.js';

export const LEGAL_CONTRACT_REVIEW_PACK_SPEC = definePackSpec({
  name: 'legal-contract-review-skills',
  description: 'Legal And Compliance Contract Review skill pack.',
  domain: 'legal',
  category: 'contract-review',
  skillIds: [
    'contract-summary',
    'contract-risk-review',
    'clause-comparison',
    'negotiation-issue-list',
    'legal-review-brief',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("legal-contract-review-skills")',
    'agent.use(createSkillPackByName("legal-contract-review-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("legal-contract-review-skills") })',
  ],
  humanReviewRequired: true,
});
