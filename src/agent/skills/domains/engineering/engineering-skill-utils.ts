import { defineDomainSkillSpec } from '../__shared__/domain-skill-factory.js';
import type { DomainSkillDefinition } from '../__shared__/domain-skill-factory.js';
import type { SkillSpec } from '../../registries/index.js';

export type EngineeringSkillDefinition = Omit<DomainSkillDefinition, 'domain'>;

export function defineEngineeringSkillSpec(definition: EngineeringSkillDefinition): SkillSpec {
  return defineDomainSkillSpec({ ...definition, domain: 'engineering' });
}