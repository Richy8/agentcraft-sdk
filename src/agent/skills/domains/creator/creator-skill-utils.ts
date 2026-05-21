import { defineDomainSkillSpec } from '../__shared__/domain-skill-factory.js';
import type { DomainSkillDefinition } from '../__shared__/domain-skill-factory.js';
import type { SkillSpec } from '../../registries/skill-spec.js';

export type CreatorSkillDefinition = Omit<DomainSkillDefinition, 'domain'>;

export function defineCreatorSkillSpec(definition: CreatorSkillDefinition): SkillSpec {
  return defineDomainSkillSpec({ ...definition, domain: 'creator' });
}
