import { describe, expect, it } from 'vitest';
import { scoreSkillSpecQuality } from '../certification/scoring.js';
import {
  BRAND_DOMAIN_SKILL_SPECS,
} from '../domains/brand/index.js';
import { createSkillByName, listSkillSpecs } from '../registries/skill-registry.js';

const expectedBrandSkillNames = [
  'brand-research',
  'voice-of-customer-mining',
  'competitor-brand-scan',
  'audience-insight-research',
  'brand-positioning',
  'brand-differentiation-map',
  'brand-promise-writer',
  'brand-narrative-brief',
  'brand-voice-profile',
  'tone-of-voice-guide',
] as const;

describe('brand domain skills', () => {
  it('exports a non-empty BRAND_DOMAIN_SKILL_SPECS array', () => {
    expect(BRAND_DOMAIN_SKILL_SPECS.length).toBeGreaterThan(0);
  });

  it('every spec has domain set to brand', () => {
    for (const spec of BRAND_DOMAIN_SKILL_SPECS) {
      expect(spec.domain, `${spec.name} domain`).toBe('brand');
    }
  });

  it('registers brand specs in the global registry', () => {
    const registered = listSkillSpecs({ domain: 'brand' });
    expect(registered.length).toBeGreaterThanOrEqual(BRAND_DOMAIN_SKILL_SPECS.length);
  });

  it('every spec carries domain intelligence with vocabulary and metrics', () => {
    for (const spec of BRAND_DOMAIN_SKILL_SPECS) {
      expect(
        (spec.domainIntelligence?.vocabulary?.length ?? 0),
        `${spec.name} vocabulary`,
      ).toBeGreaterThanOrEqual(5);
      expect(
        (spec.domainIntelligence?.metricsAndSignals?.length ?? 0),
        `${spec.name} metrics`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it('every spec has production prompt sections', () => {
    for (const spec of BRAND_DOMAIN_SKILL_SPECS) {
      expect(spec.prompt?.role, `${spec.name} role`).toBeTruthy();
      expect(spec.prompt?.goal, `${spec.name} goal`).toBeTruthy();
      expect(spec.prompt?.safetyNotes?.length, `${spec.name} safetyNotes`).toBeGreaterThan(0);
    }
  });

  it('keeps every brand skill above the 9.5 production quality threshold', () => {
    for (const spec of BRAND_DOMAIN_SKILL_SPECS) {
      const score = scoreSkillSpecQuality(spec);
      expect(
        score.score,
        `${spec.name} scored ${score.score}/${score.maxScore}; missing ${score.missingSignals.join(', ')}`,
      ).toBeGreaterThanOrEqual(95);
    }
  });

  it('creates a brand skill directly through the registry', () => {
    const skill = createSkillByName('brand-positioning');
    const prompt =
      typeof skill.systemPromptExtension === 'function'
        ? skill.systemPromptExtension()
        : skill.systemPromptExtension;

    expect(skill.name).toBe('brand-positioning');
    expect(skill.skillMetadata?.domain).toBe('brand');
    expect(prompt).toContain('Tool Use Policy');
  });

  it('includes expected core brand skills', () => {
    const names = BRAND_DOMAIN_SKILL_SPECS.map((s) => s.name);
    const coreNames = ['brand-research', 'brand-positioning', 'brand-voice-profile'];
    for (const name of coreNames) {
      expect(names, `missing ${name}`).toContain(name);
    }
  });
});
