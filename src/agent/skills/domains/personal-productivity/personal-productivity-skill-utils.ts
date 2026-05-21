import { defineDomainSkillSpec } from '../__shared__/domain-skill-factory.js';
import type { DomainSkillDefinition } from '../__shared__/domain-skill-factory.js';
import type { SkillSpec } from '../../registries/skill-spec.js';

export type PersonalProductivitySkillDefinition = Omit<DomainSkillDefinition, 'domain'>;

export function definePersonalProductivitySkillSpec(definition: PersonalProductivitySkillDefinition): SkillSpec {
  return defineDomainSkillSpec({ ...definition, domain: 'personal-productivity' });
}
