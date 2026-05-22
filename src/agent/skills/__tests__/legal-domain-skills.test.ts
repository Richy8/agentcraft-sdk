import { describe, expect, it } from 'vitest';
import { scoreSkillSpecQuality } from '../certification/scoring.js';
import {
  LEGAL_DOMAIN_SKILL_SPECS,
} from '../domains/legal/index.js';
import { createSkillByName, listSkillSpecs } from '../registries/skill-registry.js';

describe('legal domain skills', () => {
  it('exports a non-empty LEGAL_DOMAIN_SKILL_SPECS array', () => {
    expect(LEGAL_DOMAIN_SKILL_SPECS.length).toBeGreaterThan(0);
  });

  it('every spec has domain set to legal', () => {
    for (const spec of LEGAL_DOMAIN_SKILL_SPECS) {
      expect(spec.domain, `${spec.name} domain`).toBe('legal');
    }
  });

  it('registers legal specs in the global registry', () => {
    const registered = listSkillSpecs({ domain: 'legal' });
    expect(registered.length).toBeGreaterThanOrEqual(LEGAL_DOMAIN_SKILL_SPECS.length);
  });

  it('every spec carries domain intelligence with vocabulary and metrics', () => {
    for (const spec of LEGAL_DOMAIN_SKILL_SPECS) {
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
    for (const spec of LEGAL_DOMAIN_SKILL_SPECS) {
      expect(spec.prompt?.role, `${spec.name} role`).toBeTruthy();
      expect(spec.prompt?.goal, `${spec.name} goal`).toBeTruthy();
      expect(spec.prompt?.safetyNotes?.length, `${spec.name} safetyNotes`).toBeGreaterThan(0);
    }
  });

  it('legal skills carry disclaimers about not constituting legal advice', () => {
    for (const spec of LEGAL_DOMAIN_SKILL_SPECS) {
      const safetyText = (spec.prompt?.safetyNotes ?? []).join(' ');
      expect(
        safetyText,
        `${spec.name} should reference legal counsel or limitations`,
      ).toMatch(/counsel|attorney|lawyer|jurisdict|not legal advice|limitations|qualified/i);
    }
  });

  it('keeps every legal skill above the 9.5 production quality threshold', () => {
    for (const spec of LEGAL_DOMAIN_SKILL_SPECS) {
      const score = scoreSkillSpecQuality(spec);
      expect(
        score.score,
        `${spec.name} scored ${score.score}/${score.maxScore}; missing ${score.missingSignals.join(', ')}`,
      ).toBeGreaterThanOrEqual(95);
    }
  });

  it('creates a legal skill directly through the registry', () => {
    const skill = createSkillByName('contract-risk-review');
    const prompt =
      typeof skill.systemPromptExtension === 'function'
        ? skill.systemPromptExtension()
        : skill.systemPromptExtension;

    expect(skill.name).toBe('contract-risk-review');
    expect(skill.skillMetadata?.domain).toBe('legal');
    expect(prompt).toContain('Tool Use Policy');
  });

  it('includes expected core legal skills across categories', () => {
    const names = LEGAL_DOMAIN_SKILL_SPECS.map((s) => s.name);
    const coreNames = [
      'contract-risk-review',
      'compliance-checklist',
      'policy-draft-writer',
      'contract-summary',
    ];
    for (const name of coreNames) {
      expect(names, `missing ${name}`).toContain(name);
    }
  });

  it('spans contract-review, compliance, and policy-drafting categories', () => {
    const categories = new Set(LEGAL_DOMAIN_SKILL_SPECS.map((s) => s.category));
    expect(categories.size).toBeGreaterThanOrEqual(3);
  });
});
