import { describe, expect, it } from 'vitest';
import {
  BLOG_DOMAIN_SKILL_SPECS,
  CREATOR_DOMAIN_SKILL_SPECS,
  COMPETITOR_OSS_SKILL_REVIEW_NOTES,
  DOMAIN_INTELLIGENCE_CHECKLIST,
  LIVE_PROVIDER_CERTIFICATION_PLAN,
  PROMPT_FAILURE_MODE_CHECKLIST,
  PROMPT_RESEARCH_TEMPLATES,
  PROVIDER_PROMPT_BEST_PRACTICE_CHECKLIST,
  SKILL_QUALITY_RUBRICS,
  formatSkillQualityCertificationReport,
  scoreSkillSpecQuality,
} from '../index.js';
import { createSkillFromSpec } from '../registries/index.js';

const highValueSpecs = [...CREATOR_DOMAIN_SKILL_SPECS];
const evalFixtures = highValueSpecs.map((spec) => ({
  skill: spec.name,
  flatPrompt: `Help with ${spec.category}.`,
  prompt: `Use ${spec.name} for a ${spec.domain}/${spec.category} workflow.`,
  expectedSignals: [
    spec.domainIntelligence?.vocabulary?.[0] ?? spec.domain,
    spec.domainIntelligence?.artifacts?.produces?.[0] ?? spec.category,
    spec.domainIntelligence?.riskBoundaries?.[0] ?? 'risk',
  ],
}));

describe('skill quality certification', () => {
  it('exposes prompt research templates, provider guidance, and review checklists', () => {
    expect(PROMPT_RESEARCH_TEMPLATES.map((template) => template.skillFamily)).toEqual(
      expect.arrayContaining(['creator', 'business-finance', 'technical']),
    );
    expect(COMPETITOR_OSS_SKILL_REVIEW_NOTES.join(' ')).toContain('activation');
    expect(PROVIDER_PROMPT_BEST_PRACTICE_CHECKLIST.join(' ')).toContain('output contracts');
    expect(PROMPT_FAILURE_MODE_CHECKLIST.join(' ')).toContain('Label-only output');
    expect(DOMAIN_INTELLIGENCE_CHECKLIST).toEqual(
      expect.arrayContaining(['domain vocabulary', 'domain artifacts', 'risk boundaries']),
    );
  });

  it('scores creator and industry specs against domain, anti-stuffing, slop, tool, and evidence rubrics', () => {
    const scores = highValueSpecs.map((spec) => scoreSkillSpecQuality(spec));

    expect(SKILL_QUALITY_RUBRICS.map((rubric) => rubric.name)).toEqual(
      ['domain-intelligence', 'anti-stuffing', 'ai-slop', 'tool-discipline', 'evidence-boundaries'],
    );
    expect(scores.every((score) => score.passed)).toBe(true);
    expect(scores.every((score) => score.productionPassed)).toBe(true);
    expect(formatSkillQualityCertificationReport(scores)).toContain('| Skill | Score | Tier | Missing signals |');
  });

  it('keeps eval fixtures and flat-prompt comparisons for every high-value spec-backed skill', () => {
    expect(evalFixtures.map((fixture) => fixture.skill).sort()).toEqual(
      highValueSpecs.map((spec) => spec.name).sort(),
    );

    for (const fixture of evalFixtures) {
      const spec = highValueSpecs.find((item) => item.name === fixture.skill)!;
      const skill = createSkillFromSpec(spec);
      const skillPrompt =
        typeof skill.systemPromptExtension === 'function'
          ? skill.systemPromptExtension()
          : skill.systemPromptExtension;
      const certifiedPromptText = createPromptText(spec);

      expect(skillPrompt?.length ?? 0).toBeGreaterThan(fixture.flatPrompt.length * 20);
      for (const signal of fixture.expectedSignals) {
        expect(certifiedPromptText.toLowerCase()).toContain(signal.toLowerCase());
      }
    }
  });

  it('enforces source boundaries on research-heavy skills', () => {
    const researchHeavy = highValueSpecs.filter((spec) =>
      /research|seo|fact-check|citation|market|literature|stock|finance|investment/i.test(spec.name),
    );

    expect(researchHeavy.length).toBeGreaterThan(0);

    for (const spec of researchHeavy) {
      const prompt = createPromptText(spec);
      expect(prompt).toMatch(/source|evidence|claim|fact|assumption|Do not invent/i);
      expect(prompt).toMatch(/separate|verify|primary|uncertainty|missing/i);
    }
  });

  it('requires approval and governance language for write-capable skills', () => {
    const writeCapable = highValueSpecs.filter((spec) => spec.sideEffectRisk === 'write');

    expect(writeCapable.map((spec) => spec.name)).toContain('linkedin-calendar');

    for (const spec of writeCapable) {
      const prompt = createPromptText(spec);
      expect(prompt).toMatch(/approval|explicit|do not create|do not mutate|write tools/i);
    }
  });

  it('blocks generic reusable domain prompts and stuffed terminology', () => {
    for (const spec of highValueSpecs) {
      const prompt = createPromptText(spec);
      const vocabulary = spec.domainIntelligence?.vocabulary ?? [];
      const artifacts = spec.domainIntelligence?.artifacts?.produces ?? [];
      const tools = spec.domainIntelligence?.toolsAndDataSources ?? [];
      const risks = spec.domainIntelligence?.riskBoundaries ?? [];

      expect(vocabulary.length).toBeGreaterThan(0);
      expect(artifacts.length).toBeGreaterThan(0);
      expect(tools.length).toBeGreaterThan(0);
      expect(risks.length).toBeGreaterThan(0);
      expect(prompt).toMatch(/Failure mode to avoid/i);
      expect(prompt).toMatch(/output|format|Findings|Plan|Draft|Review|map/i);
      expect(prompt).toMatch(/stuffing|Use domain vocabulary only|Use platform terms only|Use role keywords only/i);
      expect(scoreSkillSpecQuality(spec).productionPassed).toBe(true);
    }
  });

  it('keeps docs and examples attached to expanded skill families', () => {
    expect(CREATOR_DOMAIN_SKILL_SPECS.length).toBeGreaterThan(0);
    expect(PROMPT_RESEARCH_TEMPLATES.every((template) => template.outputArtifact.endsWith('Note'))).toBe(true);
    expect(LIVE_PROVIDER_CERTIFICATION_PLAN.reportPath).toBe('reports/agentcraft-live-skills-certification.md');
  });

  it('keeps prompt overhead bounded for routine-specific creator skills', () => {
    for (const spec of BLOG_DOMAIN_SKILL_SPECS) {
      const skill = createSkillFromSpec(spec);
      const prompt =
        typeof skill.systemPromptExtension === 'function'
          ? skill.systemPromptExtension()
          : skill.systemPromptExtension;

      expect(prompt?.length).toBeGreaterThan(1_400);
      expect(prompt?.length).toBeLessThan(10_000);
    }
  });

  it('documents the live provider certification gate without making unit tests network-dependent', () => {
    expect(LIVE_PROVIDER_CERTIFICATION_PLAN.envGate).toBe('INTEGRATION_TESTS=true');
    expect(LIVE_PROVIDER_CERTIFICATION_PLAN.representativeProviders).toEqual(
      expect.arrayContaining(['openai', 'anthropic', 'google']),
    );
    expect(LIVE_PROVIDER_CERTIFICATION_PLAN.reportPath).toContain('reports/');
  });
});

function createPromptText(spec: (typeof highValueSpecs)[number]): string {
  return [
    spec.prompt?.role,
    spec.prompt?.goal,
    ...(spec.prompt?.constraints ?? []),
    ...(spec.prompt?.toolUsePolicy ?? []),
    ...(spec.prompt?.outputFormat ?? []),
    ...(spec.prompt?.qualityChecklist ?? []),
    ...(spec.prompt?.failureBehavior ?? []),
    ...(spec.prompt?.safetyNotes ?? []),
    JSON.stringify(spec.domainIntelligence ?? {}),
  ]
    .filter(Boolean)
    .join('\n');
}
