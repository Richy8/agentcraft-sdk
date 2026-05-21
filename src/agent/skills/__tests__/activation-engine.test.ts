import { describe, expect, it } from 'vitest';
import { defineSkill } from '../types.js';
import { selectActiveSkillMatches } from '../activation-engine.js';

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
});
