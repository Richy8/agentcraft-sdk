import { definePackSpec } from '../../../packs/registry.js';

export const CREATOR_BLOG_PACK_SPEC = definePackSpec({
  name: 'creator-blog-skills',
  description: 'Creator Blog skill pack.',
  domain: 'creator',
  category: 'blog',
  skillIds: [
    'blog-topic-research',
    'blog-research',
    'blog-serp-research',
    'blog-brief',
    'blog-writer',
    'blog-seo-review',
    'blog-fact-check',
    'blog-citation',
    'blog-refresh-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/creator/packs.md',
  examples: [
    'createSkillPackByName("creator-blog-skills")',
    'agent.use(createSkillPackByName("creator-blog-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("creator-blog-skills") })',
  ],
});
