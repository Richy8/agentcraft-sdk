import { definePackSpec } from '../../../packs/registry.js';

export const PRODUCT_PRODUCT_RESEARCH_PACK_SPEC = definePackSpec({
  name: 'product-product-research-skills',
  description: 'Product Product Research skill pack.',
  domain: 'product',
  category: 'product-research',
  skillIds: [
    'user-problem-research',
    'jtbd-synthesis',
    'competitor-feature-analysis',
    'user-feedback-clustering',
    'opportunity-solution-tree',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("product-product-research-skills")',
    'agent.use(createSkillPackByName("product-product-research-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("product-product-research-skills") })',
  ],
});
