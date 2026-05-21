import { describe, expect, it } from 'vitest';
import {
  BRAND_DOMAIN_SKILL_SPECS,
  DATA_ANALYTICS_DOMAIN_SKILL_SPECS,
  ENGINEERING_DOMAIN_SKILL_SPECS,
  FINANCE_DOMAIN_SKILL_SPECS,
  HEALTHCARE_DOMAIN_SKILL_SPECS,
  LEGAL_DOMAIN_SKILL_SPECS,
  PERSONAL_PRODUCTIVITY_DOMAIN_SKILL_SPECS,
  PRODUCT_DOMAIN_SKILL_SPECS,
  SALES_DOMAIN_SKILL_SPECS,
  SUPPORT_DOMAIN_SKILL_SPECS,
  createSkillByName,
  listSkillSpecs,
} from '../index.js';

const domainSpecs = {
  brand: BRAND_DOMAIN_SKILL_SPECS,
  sales: SALES_DOMAIN_SKILL_SPECS,
  finance: FINANCE_DOMAIN_SKILL_SPECS,
  'personal-productivity': PERSONAL_PRODUCTIVITY_DOMAIN_SKILL_SPECS,
  product: PRODUCT_DOMAIN_SKILL_SPECS,
  engineering: ENGINEERING_DOMAIN_SKILL_SPECS,
  support: SUPPORT_DOMAIN_SKILL_SPECS,
  legal: LEGAL_DOMAIN_SKILL_SPECS,
  healthcare: HEALTHCARE_DOMAIN_SKILL_SPECS,
  'data-analytics': DATA_ANALYTICS_DOMAIN_SKILL_SPECS,
} as const;

const expectedCounts = {
  brand: 17,
  sales: 23,
  finance: 24,
  'personal-productivity': 16,
  product: 23,
  engineering: 23,
  support: 14,
  legal: 12,
  healthcare: 11,
  'data-analytics': 12,
} as const;

const directSkillSamples = [
  'brand-positioning',
  'prospect-research',
  'equity-research-brief',
  'weekly-plan-writer',
  'prd-writer',
  'architecture-review',
  'support-response-writer',
  'contract-risk-review',
  'patient-education-writer',
  'ab-test-analysis',
] as const;

describe('active non-creator domain skills', () => {
  it('exports the planned concrete skill specs for each active domain', () => {
    for (const [domain, specs] of Object.entries(domainSpecs)) {
      expect(specs).toHaveLength(expectedCounts[domain as keyof typeof expectedCounts]);
      expect(new Set(specs.map((spec) => spec.name)).size).toBe(specs.length);
      expect(specs.every((spec) => spec.domain === domain)).toBe(true);
    }
  });

  it('registers all active domain specs with domain intelligence and quality prompt sections', () => {
    for (const [domain, specs] of Object.entries(domainSpecs)) {
      const registered = listSkillSpecs({ domain });
      for (const spec of specs) {
        expect(registered.map((item) => item.name)).toContain(spec.name);
        expect(spec.domainIntelligence?.vocabulary?.length).toBeGreaterThanOrEqual(8);
        expect(spec.domainIntelligence?.metricsAndSignals?.length).toBeGreaterThanOrEqual(5);
        expect(spec.domainIntelligence?.antiStuffingNotes?.join(' ')).toMatch(/stuff|jargon|vocabulary/i);
        expect(spec.prompt?.toolUsePolicy.length ?? 0).toBeGreaterThanOrEqual(2);
        expect([...(spec.prompt?.failureBehavior ?? []), ...(spec.prompt?.safetyNotes ?? [])].join(' ')).toMatch(
          /Failure mode to avoid|If\b|Never fabricate|Do not/i,
        );
      }
    }
  });

  it('creates direct skills through the registry without requiring packs', () => {
    for (const skillName of directSkillSamples) {
      const skill = createSkillByName(skillName);
      const prompt =
        typeof skill.systemPromptExtension === 'function'
          ? skill.systemPromptExtension()
          : skill.systemPromptExtension;

      expect(skill.name).toBe(skillName);
      expect(skill.skillMetadata?.promptVersion).toBe('2026-05-18');
      expect(prompt).toContain('Tool Use Policy');
      expect(prompt).toContain('Output Format');
      expect(prompt).toMatch(/Do not invent|Failure mode to avoid|Failure Behavior|If .*missing|If .*unavailable/i);
    }
  });

  it('registers brand skills with audience-aware brand domain intelligence', () => {
    expect(BRAND_DOMAIN_SKILL_SPECS.map((spec) => spec.name)).toEqual(
      expect.arrayContaining([
        'brand-research',
        'audience-insight-research',
        'voice-of-customer-mining',
        'brand-positioning',
        'messaging-framework-writer',
        'brand-voice-profile',
        'brand-consistency-review',
      ]),
    );

    const audienceSkill = createSkillByName('audience-insight-research');
    const prompt =
      typeof audienceSkill.systemPromptExtension === 'function'
        ? audienceSkill.systemPromptExtension()
        : audienceSkill.systemPromptExtension;

    expect(BRAND_DOMAIN_SKILL_SPECS.find((spec) => spec.name === 'audience-insight-research')?.domain).toBe('brand');
    expect(prompt).toContain('Segment map');
    expect(prompt).toContain('language bank');
    expect(prompt).toMatch(/Do not invent demographic details|Never fabricate audience quotes|Failure mode to avoid/i);
  });
});
