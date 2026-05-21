import { describe, expect, it } from 'vitest';
import {
  BUSINESS_BUSINESS_PLAN_SKILL_SPECS,
  BUSINESS_DOMAIN_SKILL_SPECS,
  BUSINESS_INVESTMENTS_SKILL_SPECS,
  BUSINESS_MARKET_EXPANSION_SKILL_SPECS,
  BUSINESS_OPERATIONS_SKILL_SPECS,
  BUSINESS_PARTNERSHIPS_SKILL_SPECS,
  BUSINESS_STRATEGY_SKILL_SPECS,
  createSkillByName,
  listSkillSpecs,
} from '../index.js';

const expectedBusinessSkillNames = [
  'business-investment-opportunity-research',
  'business-investment-thesis-writer',
  'business-due-diligence-brief',
  'business-valuation-review',
  'business-investment-risk-review',
  'business-exit-scenario-analysis',
  'business-model-analysis',
  'market-entry-strategy',
  'competitive-moat-review',
  'strategic-options-brief',
  'executive-decision-memo',
  'business-process-analysis',
  'operating-model-design',
  'cost-optimization-brief',
  'business-kpi-review',
  'business-risk-register',
  'partnership-opportunity-research',
  'partnership-proposal-writer',
  'partner-fit-analysis',
  'partnership-risk-review',
  'business-plan-research',
  'business-plan-writer',
  'financial-projection-narrative',
  'go-to-market-plan-review',
  'investor-pitch-review',
  'new-market-research',
  'country-expansion-brief',
  'market-sizing-review',
  'localization-risk-review',
  'expansion-readiness-review',
] as const;

describe('business domain skills', () => {
  it('exports one concrete skill spec for every planned business skill', () => {
    expect(BUSINESS_DOMAIN_SKILL_SPECS.map((spec) => spec.name).sort()).toEqual(
      [...expectedBusinessSkillNames].sort(),
    );
    expect(BUSINESS_INVESTMENTS_SKILL_SPECS).toHaveLength(6);
    expect(BUSINESS_STRATEGY_SKILL_SPECS).toHaveLength(5);
    expect(BUSINESS_OPERATIONS_SKILL_SPECS).toHaveLength(5);
    expect(BUSINESS_PARTNERSHIPS_SKILL_SPECS).toHaveLength(4);
    expect(BUSINESS_BUSINESS_PLAN_SKILL_SPECS).toHaveLength(5);
    expect(BUSINESS_MARKET_EXPANSION_SKILL_SPECS).toHaveLength(5);
  });

  it('registers business specs with domain intelligence and decision-quality prompts', () => {
    const registered = listSkillSpecs({ domain: 'business' }).filter((spec) =>
      expectedBusinessSkillNames.includes(spec.name as (typeof expectedBusinessSkillNames)[number]),
    );

    expect(registered).toHaveLength(expectedBusinessSkillNames.length);
    for (const spec of BUSINESS_DOMAIN_SKILL_SPECS) {
      expect(spec.domain).toBe('business');
      expect(spec.category).toBeTruthy();
      expect(spec.domainIntelligence?.vocabulary?.length).toBeGreaterThanOrEqual(8);
      expect(spec.domainIntelligence?.metricsAndSignals?.length).toBeGreaterThanOrEqual(5);
      expect(spec.domainIntelligence?.antiStuffingNotes?.join(' ')).toMatch(/stuff|vocabulary/i);
      expect(spec.prompt?.constraints.join(' ')).toMatch(
        /Do not invent revenue|market size|valuation|confidence|management|quantified|return projections|specific|savings|evidence/i,
      );
      expect([...(spec.prompt?.failureBehavior ?? []), ...(spec.prompt?.safetyNotes ?? [])].join(' ')).toMatch(
        /Failure mode to avoid|If\b|must not|Do not|review/i,
      );
    }
  });

  it('creates direct business skills through the registry without requiring a pack', () => {
    const skill = createSkillByName('business-due-diligence-brief');
    const prompt =
      typeof skill.systemPromptExtension === 'function'
        ? skill.systemPromptExtension()
        : skill.systemPromptExtension;

    expect(skill.name).toBe('business-due-diligence-brief');
    expect(skill.skillMetadata?.promptVersion).toBe('2026-05-18');
    expect(prompt).toContain('Tool Use Policy');
    expect(prompt).toContain('Output Format');
    expect(prompt).toMatch(/financial|revenue|customer concentration/i);
    expect(prompt).toMatch(/Do not invent revenue|management-asserted|source/i);
  });
});
