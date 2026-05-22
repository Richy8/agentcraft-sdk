import { describe, expect, it } from 'vitest';
import { scoreSkillSpecQuality } from '../certification/scoring.js';
import {
  HEALTHCARE_DOMAIN_SKILL_SPECS,
} from '../domains/healthcare/index.js';
import { createSkillByName, listSkillSpecs } from '../registries/skill-registry.js';

describe('healthcare domain skills', () => {
  it('exports a non-empty HEALTHCARE_DOMAIN_SKILL_SPECS array', () => {
    expect(HEALTHCARE_DOMAIN_SKILL_SPECS.length).toBeGreaterThan(0);
  });

  it('every spec has domain set to healthcare', () => {
    for (const spec of HEALTHCARE_DOMAIN_SKILL_SPECS) {
      expect(spec.domain, `${spec.name} domain`).toBe('healthcare');
    }
  });

  it('registers healthcare specs in the global registry', () => {
    const registered = listSkillSpecs({ domain: 'healthcare' });
    expect(registered.length).toBeGreaterThanOrEqual(HEALTHCARE_DOMAIN_SKILL_SPECS.length);
  });

  it('every spec carries domain intelligence with vocabulary and metrics', () => {
    for (const spec of HEALTHCARE_DOMAIN_SKILL_SPECS) {
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
    for (const spec of HEALTHCARE_DOMAIN_SKILL_SPECS) {
      expect(spec.prompt?.role, `${spec.name} role`).toBeTruthy();
      expect(spec.prompt?.goal, `${spec.name} goal`).toBeTruthy();
      expect(spec.prompt?.safetyNotes?.length, `${spec.name} safetyNotes`).toBeGreaterThan(0);
    }
  });

  it('healthcare skills enforce elevated safety notes (medical context)', () => {
    for (const spec of HEALTHCARE_DOMAIN_SKILL_SPECS) {
      const safetyText = (spec.prompt?.safetyNotes ?? []).join(' ');
      expect(
        safetyText,
        `${spec.name} should reference professional oversight or limitations`,
      ).toMatch(/professional|physician|clinician|provider|specialist|methodologist|regulatory|clinical|limitations|not a substitute|consult|must not be used/i);
    }
  });

  it('keeps every healthcare skill above the 9.5 production quality threshold', () => {
    for (const spec of HEALTHCARE_DOMAIN_SKILL_SPECS) {
      const score = scoreSkillSpecQuality(spec);
      expect(
        score.score,
        `${spec.name} scored ${score.score}/${score.maxScore}; missing ${score.missingSignals.join(', ')}`,
      ).toBeGreaterThanOrEqual(95);
    }
  });

  it('creates a healthcare skill directly through the registry', () => {
    const skill = createSkillByName('patient-education-writer');
    const prompt =
      typeof skill.systemPromptExtension === 'function'
        ? skill.systemPromptExtension()
        : skill.systemPromptExtension;

    expect(skill.name).toBe('patient-education-writer');
    expect(skill.skillMetadata?.domain).toBe('healthcare');
    expect(prompt).toContain('Tool Use Policy');
  });

  it('includes expected core healthcare skills', () => {
    const names = HEALTHCARE_DOMAIN_SKILL_SPECS.map((s) => s.name);
    const coreNames = ['patient-education-writer', 'clinical-note-summary', 'medical-literature-synthesis'];
    for (const name of coreNames) {
      expect(names, `missing ${name}`).toContain(name);
    }
  });

  it('spans patient-education, clinical-admin, and medical-research categories', () => {
    const categories = new Set(HEALTHCARE_DOMAIN_SKILL_SPECS.map((s) => s.category));
    expect(categories.size).toBeGreaterThanOrEqual(3);
  });
});
