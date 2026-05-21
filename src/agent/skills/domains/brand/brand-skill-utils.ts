import { defineDomainSkillSpec } from '../__shared__/domain-skill-factory.js';
import type { DomainSkillDefinition } from '../__shared__/domain-skill-factory.js';
import type { SkillSpec } from '../../registries/index.js';

export type BrandSkillDefinition = Omit<DomainSkillDefinition, 'domain'>;

export function defineBrandSkillSpec(definition: BrandSkillDefinition): SkillSpec {
  return defineDomainSkillSpec({ ...definition, domain: 'brand' });
}

