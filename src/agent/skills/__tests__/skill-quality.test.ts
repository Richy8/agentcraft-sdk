import { describe, expect, it } from 'vitest';
import { createSkillByName, listSkillSpecs } from '../index.js';
import { scoreSkillSpecQuality } from '../certification/index.js';

const activeQualityDomains = new Set([
  'brand',
  'business',
  'creator',
  'data-analytics',
  'engineering',
  'finance',
  'healthcare',
  'legal',
  'marketing',
  'personal-productivity',
  'product',
  'sales',
  'support',
]);

const externalAdapters = new Set(['browser', 'calendar', 'email', 'fetch', 'firecrawl', 'github', 'sheets', 'tavily']);

function activeDomainSpecs() {
  return listSkillSpecs().filter((spec) => spec.domain !== undefined && activeQualityDomains.has(spec.domain));
}

describe('skill quality gates', () => {
  it('keeps practitioner posture specific enough to beat generic assistant prompts', () => {
    for (const spec of activeDomainSpecs()) {
      const role = spec.prompt?.role ?? '';
      expect(role.length, `${spec.name} role is too thin`).toBeGreaterThanOrEqual(180);
      expect(role, `${spec.name} role should not lead with generic helper language`).not.toMatch(
        /^(you help|you assist|you support)\b/i,
      );
    }
  });

  it('requires action directives instead of repeating the skill name', () => {
    for (const spec of activeDomainSpecs()) {
      expect(spec.directive, `${spec.name} must declare a directive`).toBeTruthy();
      expect(spec.directive, `${spec.name} directive should not repeat the skill name`).not.toBe(spec.name);
    }
  });

  it('keeps output sections prescriptive instead of label-only', () => {
    for (const spec of activeDomainSpecs()) {
      const labelOnlySections = (spec.prompt?.outputFormat ?? []).filter(
        (section) => !section.includes(':') && !section.startsWith('Calibrate depth'),
      );
      expect(labelOnlySections, `${spec.name} has label-only output sections`).toEqual([]);
    }
  });

  it('keeps failure modes and minimum input explicit', () => {
    for (const spec of activeDomainSpecs()) {
      const failureSignals = [
        ...(spec.prompt?.constraints ?? []),
        ...(spec.prompt?.failureBehavior ?? []),
        ...(spec.prompt?.safetyNotes ?? []),
      ].filter((note) => /Failure mode to avoid:|^If\b|Do not (invent|fabricate|manufacture|bury|smooth|overstate)/i.test(note));
      expect(failureSignals.length, `${spec.name} needs at least 2 failure/recovery signals`).toBeGreaterThanOrEqual(2);
      expect(spec.domainIntelligence?.minimumInput?.length ?? 0, `${spec.name} needs minimum input`).toBeGreaterThanOrEqual(
        1,
      );
    }
  });

  it('does not mark externally enabled skills as side-effect free', () => {
    for (const spec of activeDomainSpecs()) {
      const usesExternalAdapter = (spec.optionalAdapters ?? []).some((adapter) => externalAdapters.has(adapter));
      if (!usesExternalAdapter) continue;
      expect(spec.sideEffectRisk, `${spec.name} uses external adapters and cannot be side-effect free`).not.toBe('none');
    }
  });

  it('keeps examples bounded while allowing senior problem-solving depth', () => {
    for (const spec of listSkillSpecs().filter((item) => (item.examples?.length ?? 0) > 0)) {
      for (const example of spec.examples ?? []) {
        const wordCount = `${example.input} ${example.output} ${example.note ?? ''}`.split(/\s+/).filter(Boolean).length;
        expect(wordCount, `${spec.name}/${example.label} example is too thin`).toBeGreaterThanOrEqual(35);
        expect(wordCount, `${spec.name}/${example.label} example is too long`).toBeLessThanOrEqual(650);
      }
    }
  });

  it('certifies quality coverage for every active domain', () => {
    const scored = activeDomainSpecs().map((spec) => ({ spec, score: scoreSkillSpecQuality(spec) }));
    const scoresByDomain = new Map<string, number[]>();

    for (const { spec, score } of scored) {
      if (!spec.domain) continue;
      scoresByDomain.set(spec.domain, [...(scoresByDomain.get(spec.domain) ?? []), score.score]);
    }

    expect(new Set(scoresByDomain.keys())).toEqual(activeQualityDomains);
    for (const domain of activeQualityDomains) {
      const domainScores = scoresByDomain.get(domain) ?? [];
      expect(domainScores.length, `${domain} must have certifiable active skills`).toBeGreaterThan(0);
      expect(Math.max(...domainScores), `${domain} must have at least one 95+ reference skill`).toBeGreaterThanOrEqual(95);
    }

    const uncertified = scored.filter(({ score }) => !score.passed);
    expect(
      uncertified.map(({ spec, score }) => ({
        skill: spec.name,
        domain: spec.domain,
        category: spec.category,
        score: score.score,
        missingSignals: score.missingSignals,
      })),
      'active domain skills should meet the baseline certification pass mark',
    ).toEqual([]);

    const belowProductionTier = scored.filter(({ score }) => !score.productionPassed);
    expect(
      belowProductionTier.map(({ spec, score }) => ({
        skill: spec.name,
        domain: spec.domain,
        category: spec.category,
        score: score.score,
        productionThreshold: score.productionThreshold,
        missingSignals: score.missingSignals,
      })),
      'active domain skills should meet the 95% production certification tier',
    ).toEqual([]);
  });

  it('builds stable system prompts for repeated skill creation', () => {
    for (const skillName of ['brand-positioning', 'prospect-research', 'equity-research-brief', 'blog-brief']) {
      const first = createSkillByName(skillName).systemPromptExtension;
      const second = createSkillByName(skillName).systemPromptExtension;
      const firstPrompt = typeof first === 'function' ? first() : first;
      const secondPrompt = typeof second === 'function' ? second() : second;
      expect(secondPrompt, `${skillName} prompt should be stable across creation`).toBe(firstPrompt);
    }
  });
});
