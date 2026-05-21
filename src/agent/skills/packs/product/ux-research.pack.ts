import { definePackSpec } from '../../../packs/registry.js';

export const PRODUCT_UX_RESEARCH_PACK_SPEC = definePackSpec({
  name: 'product-ux-research-skills',
  description: 'Product Ux Research skill pack.',
  domain: 'product',
  category: 'ux-research',
  skillIds: [
    'interview-guide-writer',
    'research-note-synthesis',
    'usability-finding-review',
    'persona-profile-builder',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("product-ux-research-skills")',
    'agent.use(createSkillPackByName("product-ux-research-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("product-ux-research-skills") })',
  ],
});
