import { definePackSpec } from '../../../packs/registry.js';

export const SUPPORT_KNOWLEDGE_BASE_PACK_SPEC = definePackSpec({
  name: 'support-knowledge-base-skills',
  description: 'Support And Customer Success Knowledge Base skill pack.',
  domain: 'support',
  category: 'knowledge-base',
  skillIds: [
    'kb-gap-analysis',
    'kb-article-writer',
    'kb-freshness-review',
    'support-macro-writer',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("support-knowledge-base-skills")',
    'agent.use(createSkillPackByName("support-knowledge-base-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("support-knowledge-base-skills") })',
  ],
});
