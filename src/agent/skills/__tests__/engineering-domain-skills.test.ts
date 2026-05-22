import { describe, expect, it } from 'vitest';
import { scoreSkillSpecQuality } from '../certification/scoring.js';
import {
  ENGINEERING_DOMAIN_SKILL_SPECS,
} from '../domains/engineering/index.js';
import { createSkillByName, listSkillSpecs } from '../registries/skill-registry.js';

describe('engineering domain skills', () => {
  it('exports a non-empty ENGINEERING_DOMAIN_SKILL_SPECS array', () => {
    expect(ENGINEERING_DOMAIN_SKILL_SPECS.length).toBeGreaterThan(0);
  });

  it('every spec has domain set to engineering', () => {
    for (const spec of ENGINEERING_DOMAIN_SKILL_SPECS) {
      expect(spec.domain, `${spec.name} domain`).toBe('engineering');
    }
  });

  it('registers engineering specs in the global registry', () => {
    const registered = listSkillSpecs({ domain: 'engineering' });
    expect(registered.length).toBeGreaterThanOrEqual(ENGINEERING_DOMAIN_SKILL_SPECS.length);
  });

  it('every spec carries domain intelligence with vocabulary and metrics', () => {
    for (const spec of ENGINEERING_DOMAIN_SKILL_SPECS) {
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
    for (const spec of ENGINEERING_DOMAIN_SKILL_SPECS) {
      expect(spec.prompt?.role, `${spec.name} role`).toBeTruthy();
      expect(spec.prompt?.goal, `${spec.name} goal`).toBeTruthy();
      expect(spec.prompt?.safetyNotes?.length, `${spec.name} safetyNotes`).toBeGreaterThan(0);
    }
  });

  it('keeps every engineering skill above the 9.5 production quality threshold', () => {
    for (const spec of ENGINEERING_DOMAIN_SKILL_SPECS) {
      const score = scoreSkillSpecQuality(spec);
      expect(
        score.score,
        `${spec.name} scored ${score.score}/${score.maxScore}; missing ${score.missingSignals.join(', ')}`,
      ).toBeGreaterThanOrEqual(95);
    }
  });

  it('creates an engineering skill directly through the registry', () => {
    const skill = createSkillByName('code-review');
    const prompt =
      typeof skill.systemPromptExtension === 'function'
        ? skill.systemPromptExtension()
        : skill.systemPromptExtension;

    expect(skill.name).toBe('code-review');
    expect(skill.skillMetadata?.domain).toBe('engineering');
    expect(prompt).toContain('Tool Use Policy');
  });

  it('includes expected core engineering skills across categories', () => {
    const names = ENGINEERING_DOMAIN_SKILL_SPECS.map((s) => s.name);
    const coreNames = ['code-review', 'security-code-review', 'deployment-risk-review'];
    for (const name of coreNames) {
      expect(names, `missing ${name}`).toContain(name);
    }
  });

  it('includes both code-review and devops skill categories', () => {
    const categories = new Set(ENGINEERING_DOMAIN_SKILL_SPECS.map((s) => s.category));
    expect(categories.size).toBeGreaterThanOrEqual(3);
  });
});
