import { defineDomainSkillSpec } from '../__shared__/domain-skill-factory.js';
import type { DomainSkillDefinition } from '../__shared__/domain-skill-factory.js';
import type { SkillSpec } from '../../registries/index.js';

export type HealthcareSkillDefinition = Omit<DomainSkillDefinition, 'domain'>;

export function defineHealthcareSkillSpec(definition: HealthcareSkillDefinition): SkillSpec {
  return defineDomainSkillSpec({ ...definition, domain: 'healthcare' });
}