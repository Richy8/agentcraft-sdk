import { describe, expect, it } from 'vitest';
import { scoreSkillSpecQuality } from '../certification/scoring.js';
import {
  FINANCE_DOMAIN_SKILL_SPECS,
} from '../domains/finance/index.js';
import { createSkillByName, listSkillSpecs } from '../registries/skill-registry.js';

describe('finance domain skills', () => {
  it('exports a non-empty FINANCE_DOMAIN_SKILL_SPECS array', () => {
    expect(FINANCE_DOMAIN_SKILL_SPECS.length).toBeGreaterThan(0);
  });

  it('every spec has domain set to finance', () => {
    for (const spec of FINANCE_DOMAIN_SKILL_SPECS) {
      expect(spec.domain, `${spec.name} domain`).toBe('finance');
    }
  });

  it('registers finance specs in the global registry', () => {
    const registered = listSkillSpecs({ domain: 'finance' });
    expect(registered.length).toBeGreaterThanOrEqual(FINANCE_DOMAIN_SKILL_SPECS.length);
  });

  it('every spec carries domain intelligence with vocabulary and metrics', () => {
    for (const spec of FINANCE_DOMAIN_SKILL_SPECS) {
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
    for (const spec of FINANCE_DOMAIN_SKILL_SPECS) {
      expect(spec.prompt?.role, `${spec.name} role`).toBeTruthy();
      expect(spec.prompt?.goal, `${spec.name} goal`).toBeTruthy();
      expect(spec.prompt?.safetyNotes?.length, `${spec.name} safetyNotes`).toBeGreaterThan(0);
    }
  });

  it('keeps every finance skill above the 9.5 production quality threshold', () => {
    for (const spec of FINANCE_DOMAIN_SKILL_SPECS) {
      const score = scoreSkillSpecQuality(spec);
      expect(
        score.score,
        `${spec.name} scored ${score.score}/${score.maxScore}; missing ${score.missingSignals.join(', ')}`,
      ).toBeGreaterThanOrEqual(95);
    }
  });

  it('creates a finance skill directly through the registry', () => {
    const skill = createSkillByName('equity-research-brief');
    const prompt =
      typeof skill.systemPromptExtension === 'function'
        ? skill.systemPromptExtension()
        : skill.systemPromptExtension;

    expect(skill.name).toBe('equity-research-brief');
    expect(skill.skillMetadata?.domain).toBe('finance');
    expect(prompt).toContain('Tool Use Policy');
  });

  it('includes expected core finance skills across categories', () => {
    const names = FINANCE_DOMAIN_SKILL_SPECS.map((s) => s.name);
    const coreNames = [
      'equity-research-brief',
      'stock-screening',
      'portfolio-risk-review',
      'valuation-risk-review',
    ];
    for (const name of coreNames) {
      expect(names, `missing ${name}`).toContain(name);
    }
  });

  it('spans at least four finance categories', () => {
    const categories = new Set(FINANCE_DOMAIN_SKILL_SPECS.map((s) => s.category));
    expect(categories.size).toBeGreaterThanOrEqual(4);
  });
});
