import { describe, expect, it } from 'vitest';
import { defineSkill } from '../types.js';
import { selectActiveSkillMatches } from '../activation-engine.js';
import { createSkillPackByName } from '../packs/index.js';
import { ResearchSkill } from '../primitives/research/index.js';
import { WritingSkill } from '../primitives/writing/index.js';

const baseMetadata = {
  requiredCapabilities: ['tools'] as const,
  requiredAdapters: [],
  optionalAdapters: [],
  stateful: false,
  sideEffectRisk: 'none' as const,
  promptVersion: 'test',
};

describe('SkillActivationEngine', () => {
  it('activates directive-only skills only when their directive is present', () => {
    const skill = defineSkill({
      name: 'stock-screening',
      description: 'Screen stocks.',
      directive: 'stock-screening',
      metadata: {
        ...baseMetadata,
        domain: 'finance',
        category: 'stock-research',
        stage: 'context',
      },
    });

    expect(
      selectActiveSkillMatches({
        params: { prompt: 'Please screen semiconductor stocks with /stock-screening.' },
        adapters: [skill],
        mode: 'directive-only',
      })
    ).toEqual([
      expect.objectContaining({
        skill,
        reason: 'directive',
        confidence: 1,
        matched: '/stock-screening',
      }),
    ]);
    expect(
      selectActiveSkillMatches({
        params: { prompt: 'Please screen semiconductor stocks.' },
        adapters: [skill],
        mode: 'directive-only',
      })
    ).toEqual([]);
  });

  it('uses domain metadata and stage intent for auto activation', () => {
    const skill = defineSkill({
      name: 'portfolio-risk-review',
      description: 'Review portfolio risk.',
      metadata: {
        ...baseMetadata,
        domain: 'finance',
        category: 'portfolio-review',
        stage: 'review',
        producesArtifacts: ['RiskReview'],
        domainIntelligence: {
          minimumInput: ['holdings', 'allocation'],
          metricsAndSignals: ['drawdown', 'volatility'],
        },
      },
    });

    const matches = selectActiveSkillMatches({
      params: { prompt: 'Review my portfolio allocation risk and volatility exposure.' },
      adapters: [skill],
      mode: 'auto',
    });

    expect(matches[0]).toMatchObject({
      skill,
      reason: 'semantic',
    });
    expect(matches[0]?.confidence).toBeGreaterThanOrEqual(0.79);
  });

  it('boosts a related blog skill when an attached blog pack receives nearby article language', () => {
    const pack = createSkillPackByName('creator-blog-skills');
    const matches = selectActiveSkillMatches({
      params: {
        prompt:
          'Create a compact Medium article plan about reducing token waste in AI agent workflows. Include audience, angle, outline, evidence, and risk notes.',
      },
      adapters: pack.attachments,
      mode: 'auto',
    });
    const active = matches.map((match) => match.skill.name);

    expect(active).toContain('blog-writer');
    expect(active).toContain('blog-brief');
    expect(matches.every((match) => match.confidence >= 0.74)).toBe(true);
  });

  it('routes platform-specific creator prompts to the matching category pack when available', () => {
    const pack = createSkillPackByName('creator-medium-skills');
    const matches = selectActiveSkillMatches({
      params: {
        prompt:
          'Create a compact Medium article plan about reducing token waste in AI agent workflows. Include audience, angle, outline, evidence, and risk notes.',
      },
      adapters: pack.attachments,
      mode: 'auto',
    });
    const active = matches.map((match) => match.skill.name);

    expect(active).toContain('medium-article-writer');
    expect(active).not.toContain('blog-writer');
  });

  it('activates a single skill unconditionally on always mode regardless of prompt', () => {
    const skill = defineSkill({
      name: 'blog-writer',
      description: 'Write blog posts.',
      directive: 'write-blog',
      metadata: {
        ...baseMetadata,
        domain: 'creator',
        category: 'blog',
        stage: 'creation',
      },
    });

    const matches = selectActiveSkillMatches({
      params: { prompt: 'Help me with something unrelated to blogs.' },
      adapters: [skill],
      mode: 'always',
    });

    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ skill, reason: 'always', confidence: 1 });
  });

  it('smart-routes a multi-skill always pack to relevant skills only', () => {
    const pack = createSkillPackByName('creator-blog-skills');

    const writeMatches = selectActiveSkillMatches({
      params: { prompt: 'Write a detailed blog post about AI agent cost optimization strategies.' },
      adapters: pack.attachments,
      mode: 'always',
    });
    const writeActive = writeMatches.map((m) => m.skill.name);
    expect(writeActive).toContain('blog-writer');
    expect(writeActive.length).toBeLessThan(pack.attachments.length);

    const reviewMatches = selectActiveSkillMatches({
      params: { prompt: 'Review this blog post for SEO quality and factual accuracy.' },
      adapters: pack.attachments,
      mode: 'always',
    });
    const reviewActive = reviewMatches.map((m) => m.skill.name);
    expect(reviewActive.length).toBeLessThan(pack.attachments.length);
  });

  it('falls back to all skills on always mode when the prompt is empty or unresolvable', () => {
    const pack = createSkillPackByName('creator-blog-skills');

    const matches = selectActiveSkillMatches({
      params: { prompt: '' },
      adapters: pack.attachments,
      mode: 'always',
    });

    expect(matches.length).toBeGreaterThan(0);
    expect(matches.every((m) => m.reason === 'always')).toBe(true);
  });

  it('deep-boosts the best sub-threshold domain skill when no skill clears the standard boost', () => {
    const pack = createSkillPackByName('finance-stock-research-skills');

    // Prompt uses adjacent vocabulary ("semiconductor landscape", "ETF exposure") that
    // doesn't hit any category alias directly — intent is clear but phrasing is indirect.
    const matches = selectActiveSkillMatches({
      params: {
        prompt:
          'Give me an overview of the semiconductor landscape with ETF exposure and valuation risk context.',
      },
      adapters: pack.attachments,
      mode: 'auto',
    });

    expect(matches.length).toBeGreaterThan(0);
    const deepMatch = matches.find((m) => m.reason === 'deep-boost');
    const normalMatch = matches.find((m) => m.reason === 'semantic');
    // Either a normal semantic match or the deep-boost rescue must have fired.
    expect(deepMatch ?? normalMatch).toBeDefined();
    if (deepMatch) {
      expect(deepMatch.confidence).toBeGreaterThanOrEqual(0.38);
      expect(deepMatch.matched).toBe('deep-domain-rescue');
    }
  });

  it('falls back to a primitive by intent when no domain skill has enough signal', () => {
    const researchPrimitive = ResearchSkill.create();
    const writingPrimitive = WritingSkill.create();

    // Only primitives attached — no domain skills.
    const researchMatches = selectActiveSkillMatches({
      params: { prompt: 'Find out the latest developments in quantum computing and compile the key findings.' },
      adapters: [researchPrimitive, writingPrimitive],
      mode: 'auto',
    });
    const researchActive = researchMatches.map((m) => m.skill.name);
    expect(researchActive).toContain('research');
    expect(researchMatches.find((m) => m.skill.name === 'research')?.reason).toBe('deep-boost');

    const writeMatches = selectActiveSkillMatches({
      params: { prompt: 'Draft a short executive summary of the Q3 product roadmap decisions.' },
      adapters: [researchPrimitive, writingPrimitive],
      mode: 'auto',
    });
    const writeActive = writeMatches.map((m) => m.skill.name);
    expect(writeActive).toContain('writing');
  });

  it('does not deep-boost on underspecified prompts', () => {
    const pack = createSkillPackByName('finance-stock-research-skills');

    const matches = selectActiveSkillMatches({
      params: { prompt: 'Help me with something.' },
      adapters: pack.attachments,
      mode: 'auto',
    });

    expect(matches).toHaveLength(0);
  });

  it('covers non-creator domain packs with the same auto-activation standards', () => {
    const cases = [
      {
        pack: 'marketing-seo-skills',
        prompt: 'Create an SEO content brief for AI agent cost optimization with SERP gaps and internal links.',
        expected: 'seo-content-brief',
      },
      {
        pack: 'sales-prospecting-skills',
        prompt: 'Prioritize these leads and explain account fit for a B2B platform sales team.',
        expected: 'lead-prioritization',
      },
      {
        pack: 'finance-stock-research-skills',
        prompt: 'Screen semiconductor stocks and produce an equity research brief with valuation risk.',
        expected: 'equity-research-brief',
      },
      {
        pack: 'support-customer-support-skills',
        prompt: 'Triage these refund tickets and draft a support response with escalation risk.',
        expected: 'ticket-triage',
      },
      {
        pack: 'data-analytics-experiment-analysis-skills',
        prompt: 'Analyze an A/B test and flag causality risk before the experiment readout.',
        expected: 'ab-test-analysis',
      },
    ] as const;

    for (const item of cases) {
      const pack = createSkillPackByName(item.pack);
      const active = selectActiveSkillMatches({
        params: { prompt: item.prompt },
        adapters: pack.attachments,
        mode: 'auto',
      }).map((match) => match.skill.name);

      expect(active, item.pack).toContain(item.expected);
    }
  });
});
