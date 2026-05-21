import { defineDomainSkillSpec } from '../__shared__/domain-skill-factory.js';
import type { DomainSkillDefinition } from '../__shared__/domain-skill-factory.js';
import type { SkillSpec } from '../../registries/index.js';

export type DataAnalyticsSkillDefinition = Omit<DomainSkillDefinition, 'domain'>;

export function defineDataAnalyticsSkillSpec(definition: DataAnalyticsSkillDefinition): SkillSpec {
  return defineDomainSkillSpec({ ...definition, domain: 'data-analytics' });
}