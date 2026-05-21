import { definePackSpec } from '../../../packs/registry.js';

export const BUSINESS_MARKET_EXPANSION_PACK_SPEC = definePackSpec({
  name: 'business-market-expansion-skills',
  description: 'Business Market Expansion skill pack.',
  domain: 'business',
  category: 'market-expansion',
  skillIds: [
    'new-market-research',
    'country-expansion-brief',
    'market-sizing-review',
    'localization-risk-review',
    'expansion-readiness-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("business-market-expansion-skills")',
    'agent.use(createSkillPackByName("business-market-expansion-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("business-market-expansion-skills") })',
  ],
  humanReviewRequired: true,
});
