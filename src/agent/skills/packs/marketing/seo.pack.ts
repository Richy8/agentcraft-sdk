import { definePackSpec } from '../../../packs/registry.js';

export const MARKETING_SEO_PACK_SPEC = definePackSpec({
  name: 'marketing-seo-skills',
  description: 'Marketing Seo skill pack.',
  domain: 'marketing',
  category: 'seo',
  skillIds: [
    'seo-keyword-research',
    'seo-serp-analysis',
    'seo-content-brief',
    'seo-technical-audit',
    'seo-internal-link-planner',
    'seo-content-refresh-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("marketing-seo-skills")',
    'agent.use(createSkillPackByName("marketing-seo-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("marketing-seo-skills") })',
  ],
});
