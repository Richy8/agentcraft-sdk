import { defineDomainSkillSpec } from '../__shared__/domain-skill-factory.js';
import type { DomainSkillDefinition } from '../__shared__/domain-skill-factory.js';
import type { SkillSpec } from '../../registries/index.js';

export type FinanceSkillDefinition = Omit<DomainSkillDefinition, 'domain'>;

export function defineFinanceSkillSpec(definition: FinanceSkillDefinition): SkillSpec {
  return defineDomainSkillSpec({ ...definition, domain: 'finance' });
}
