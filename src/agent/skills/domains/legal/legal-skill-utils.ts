import { defineDomainSkillSpec } from '../__shared__/domain-skill-factory.js';
import type { DomainSkillDefinition } from '../__shared__/domain-skill-factory.js';
import type { SkillSpec } from '../../registries/index.js';

export type LegalSkillDefinition = Omit<DomainSkillDefinition, 'domain'>;

export function defineLegalSkillSpec(definition: LegalSkillDefinition): SkillSpec {
  return defineDomainSkillSpec({ ...definition, domain: 'legal' });
}