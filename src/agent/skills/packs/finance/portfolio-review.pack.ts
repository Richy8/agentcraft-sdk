import { definePackSpec } from '../../../packs/registry.js';

export const FINANCE_PORTFOLIO_REVIEW_PACK_SPEC = definePackSpec({
  name: 'finance-portfolio-review-skills',
  description: 'Finance Portfolio Review skill pack.',
  domain: 'finance',
  category: 'portfolio-review',
  skillIds: [
    'portfolio-exposure-analysis',
    'portfolio-risk-review',
    'allocation-drift-review',
    'portfolio-fit-brief',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("finance-portfolio-review-skills")',
    'agent.use(createSkillPackByName("finance-portfolio-review-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("finance-portfolio-review-skills") })',
  ],
  humanReviewRequired: true,
});
