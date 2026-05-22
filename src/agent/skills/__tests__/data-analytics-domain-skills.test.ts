import { describe, expect, it } from 'vitest';
import { scoreSkillSpecQuality } from '../certification/scoring.js';
import {
  DATA_ANALYTICS_DOMAIN_SKILL_SPECS,
} from '../domains/data-analytics/index.js';
import { createSkillByName, listSkillSpecs } from '../registries/skill-registry.js';

describe('data-analytics domain skills', () => {
  it('exports a non-empty DATA_ANALYTICS_DOMAIN_SKILL_SPECS array', () => {
    expect(DATA_ANALYTICS_DOMAIN_SKILL_SPECS.length).toBeGreaterThan(0);
  });

  it('every spec has domain set to data-analytics', () => {
    for (const spec of DATA_ANALYTICS_DOMAIN_SKILL_SPECS) {
      expect(spec.domain, `${spec.name} domain`).toBe('data-analytics');
    }
  });

  it('registers data-analytics specs in the global registry', () => {
    const registered = listSkillSpecs({ domain: 'data-analytics' });
    expect(registered.length).toBeGreaterThanOrEqual(DATA_ANALYTICS_DOMAIN_SKILL_SPECS.length);
  });

  it('every spec carries domain intelligence with vocabulary and metrics', () => {
    for (const spec of DATA_ANALYTICS_DOMAIN_SKILL_SPECS) {
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
    for (const spec of DATA_ANALYTICS_DOMAIN_SKILL_SPECS) {
      expect(spec.prompt?.role, `${spec.name} role`).toBeTruthy();
      expect(spec.prompt?.goal, `${spec.name} goal`).toBeTruthy();
      expect(spec.prompt?.safetyNotes?.length, `${spec.name} safetyNotes`).toBeGreaterThan(0);
    }
  });

  it('keeps every data-analytics skill above the 9.5 production quality threshold', () => {
    for (const spec of DATA_ANALYTICS_DOMAIN_SKILL_SPECS) {
      const score = scoreSkillSpecQuality(spec);
      expect(
        score.score,
        `${spec.name} scored ${score.score}/${score.maxScore}; missing ${score.missingSignals.join(', ')}`,
      ).toBeGreaterThanOrEqual(95);
    }
  });

  it('creates a data-analytics skill directly through the registry', () => {
    const skill = createSkillByName('ab-test-analysis');
    const prompt =
      typeof skill.systemPromptExtension === 'function'
        ? skill.systemPromptExtension()
        : skill.systemPromptExtension;

    expect(skill.name).toBe('ab-test-analysis');
    expect(skill.skillMetadata?.domain).toBe('data-analytics');
    expect(prompt).toContain('Tool Use Policy');
  });

  it('includes expected core data-analytics skills', () => {
    const names = DATA_ANALYTICS_DOMAIN_SKILL_SPECS.map((s) => s.name);
    const coreNames = [
      'ab-test-analysis',
      'anomaly-investigation',
      'executive-data-brief',
      'dashboard-insight-writer',
    ];
    for (const name of coreNames) {
      expect(names, `missing ${name}`).toContain(name);
    }
  });

  it('spans dashboard, experiment-analysis, and reporting categories', () => {
    const categories = new Set(DATA_ANALYTICS_DOMAIN_SKILL_SPECS.map((s) => s.category));
    expect(categories.size).toBeGreaterThanOrEqual(3);
  });
});
