import { definePackSpec } from '../../../packs/registry.js';

export const CREATOR_BOOK_PACK_SPEC = definePackSpec({
  name: 'creator-book-skills',
  description: 'Creator Book skill pack.',
  domain: 'creator',
  category: 'book',
  skillIds: [
    'book-positioning',
    'book-outline-writer',
    'book-chapter-writer',
    'book-continuity-review',
    'book-developmental-edit',
    'book-citation-review',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/creator/packs.md',
  examples: [
    'createSkillPackByName("creator-book-skills")',
    'agent.use(createSkillPackByName("creator-book-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("creator-book-skills") })',
  ],
});
