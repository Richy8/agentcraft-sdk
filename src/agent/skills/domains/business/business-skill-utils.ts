import { defineDomainSkillSpec } from '../__shared__/domain-skill-factory.js';
import type { DomainSkillDefinition } from '../__shared__/domain-skill-factory.js';
import type { SkillSpec } from '../../registries/index.js';

export type BusinessSkillDefinition = Omit<DomainSkillDefinition, 'domain'>;

export function defineBusinessSkillSpec(definition: BusinessSkillDefinition): SkillSpec {
  return defineDomainSkillSpec({ ...definition, domain: 'business' });
}
