import { definePackSpec } from '../../../packs/registry.js';

export const SALES_OBJECTION_HANDLING_PACK_SPEC = definePackSpec({
  name: 'sales-objection-handling-skills',
  description: 'Sales Objection Handling skill pack.',
  domain: 'sales',
  category: 'objection-handling',
  skillIds: [
    'objection-research',
    'objection-response-writer',
    'competitive-objection-review',
    'sales-call-coach',
  ],
  defaultConfig: { skillActivation: 'auto', toolSelection: 'auto', readOnlyByDefault: true },
  docsPath: 'docs/packs/industry.md',
  examples: [
    'createSkillPackByName("sales-objection-handling-skills")',
    'agent.use(createSkillPackByName("sales-objection-handling-skills"))',
    'agent.run({ prompt: "/...", use: createSkillPackByName("sales-objection-handling-skills") })',
  ],
});
