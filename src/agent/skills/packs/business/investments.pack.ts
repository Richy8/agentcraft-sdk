import { definePackSpec } from '../../../packs/registry.js';

export const BUSINESS_INVESTMENTS_PACK_SPEC = definePackSpec({
  name: 'business-investments-skills',
  description: 'Business Investments skill pack.',
  domain: 'business',
  category: 'investments',
  skillIds: [
    'business-investment-opportunity-research',
    'business-investment-thesis-writer',
    'business-due-diligence-brief',
    'business-valuation-review',
    'business-investment-risk-review',
    'business-exit-scenario-analysis',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("business-investments-skills")',
    'agent.use(createSkillPackByName("business-investments-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("business-investments-skills") })',
  ],
  humanReviewRequired: true,
});
