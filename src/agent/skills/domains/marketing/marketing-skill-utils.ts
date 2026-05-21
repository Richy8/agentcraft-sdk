import { defineDomainSkillSpec } from '../__shared__/domain-skill-factory.js';
import type { DomainSkillDefinition } from '../__shared__/domain-skill-factory.js';
import type { SkillSpec } from '../../registries/skill-spec.js';

export type MarketingSkillDefinition = Omit<DomainSkillDefinition, 'domain'>;

export function defineMarketingSkillSpec(definition: MarketingSkillDefinition): SkillSpec {
  return defineDomainSkillSpec({
    ...definition,
    domain: 'marketing',
  });
}
