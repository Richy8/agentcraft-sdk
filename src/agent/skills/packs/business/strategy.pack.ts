import { definePackSpec } from '../../../packs/registry.js';

export const BUSINESS_STRATEGY_PACK_SPEC = definePackSpec({
  name: 'business-strategy-skills',
  description: 'Business Strategy skill pack.',
  domain: 'business',
  category: 'strategy',
  skillIds: [
    'business-model-analysis',
    'market-entry-strategy',
    'competitive-moat-review',
    'strategic-options-brief',
    'executive-decision-memo',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("business-strategy-skills")',
    'agent.use(createSkillPackByName("business-strategy-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("business-strategy-skills") })',
  ],
});
