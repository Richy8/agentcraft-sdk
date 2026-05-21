import { definePackSpec } from '../../../packs/registry.js';

export const PRODUCT_ROADMAP_PACK_SPEC = definePackSpec({
  name: 'product-roadmap-skills',
  description: 'Product Roadmap skill pack.',
  domain: 'product',
  category: 'roadmap',
  skillIds: [
    'roadmap-prioritization',
    'rice-score-review',
    'dependency-map',
    'roadmap-narrative-writer',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("product-roadmap-skills")',
    'agent.use(createSkillPackByName("product-roadmap-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("product-roadmap-skills") })',
  ],
});
