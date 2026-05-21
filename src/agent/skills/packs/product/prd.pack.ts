import { definePackSpec } from '../../../packs/registry.js';

export const PRODUCT_PRD_PACK_SPEC = definePackSpec({
  name: 'product-prd-skills',
  description: 'Product Prd skill pack.',
  domain: 'product',
  category: 'prd',
  skillIds: [
    'prd-discovery',
    'prd-writer',
    'user-story-writer',
    'acceptance-criteria-review',
    'prd-risk-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("product-prd-skills")',
    'agent.use(createSkillPackByName("product-prd-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("product-prd-skills") })',
  ],
});
