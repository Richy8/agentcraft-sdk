import { describe, expect, it } from 'vitest';
import {
  estimateTokens,
  estimateRunCost,
  enforcePreflight,
  enforcePostRunBudget,
  isPricingStale,
  createPricingStalenessReport,
} from '../budgets.js';
import { ContextWindowError, QuotaExceededError } from '../../errors/index.js';
import type { ModelCapabilities } from '../../types/provider.types.js';
import type { AgentResponse } from '../types.js';

function makeCaps(overrides: Partial<ModelCapabilities> = {}): ModelCapabilities {
  return {
    contextWindow: 128_000,
    maxContextLength: 128_000,
    maxOutputTokens: 4096,
    vision: false,
    audio: false,
    video: false,
    files: false,
    tools: true,
    streaming: true,
    jsonMode: true,
    costPerMInputToken: 2.5,
    costPerMOutputToken: 10,
    optimizedFor: [],
    ...overrides,
  } as ModelCapabilities;
}

function makeResponse(overrides: Partial<AgentResponse> = {}): AgentResponse {
  return {
    content: 'ok',
    tokensUsed: { prompt: 500, completion: 200, total: 700 },
    cost: 0.005,
    finishReason: 'stop',
    model: 'gpt-4o',
    provider: 'openai',
    ...overrides,
  } as AgentResponse;
}

describe('estimateTokens', () => {
  it('estimates tokens from prompt and system text', () => {
    const result = estimateTokens(
      { prompt: 'Hello world', system: 'You are helpful.' },
      makeCaps(),
    );

    expect(result.prompt).toBeGreaterThan(0);
    expect(result.completion).toBeGreaterThan(0);
    expect(result.total).toBe(result.prompt + result.completion);
  });

  it('includes tool parameter tokens in the prompt estimate', () => {
    const withTools = estimateTokens(
      {
        prompt: 'Do a search',
        tools: [{ name: 'web-search', description: 'search', parameters: { type: 'object', properties: { query: { type: 'string' } } } }],
      },
      makeCaps(),
    );
    const withoutTools = estimateTokens({ prompt: 'Do a search' }, makeCaps());

    expect(withTools.prompt).toBeGreaterThan(withoutTools.prompt);
  });

  it('caps completion at maxOutputTokens', () => {
    const result = estimateTokens(
      { prompt: 'x', maxTokens: 999_999 },
      makeCaps({ maxOutputTokens: 4096 }),
    );

    expect(result.completion).toBe(4096);
  });

  it('uses maxTokens when smaller than maxOutputTokens', () => {
    const result = estimateTokens(
      { prompt: 'x', maxTokens: 512 },
      makeCaps({ maxOutputTokens: 4096 }),
    );

    expect(result.completion).toBe(512);
  });
});

describe('estimateRunCost', () => {
  it('returns tokens, estimatedCost, and stalePricing', () => {
    const result = estimateRunCost({ prompt: 'Hello' }, makeCaps());

    expect(result.tokens).toBeDefined();
    expect(typeof result.estimatedCost).toBe('number');
    expect(typeof result.stalePricing).toBe('boolean');
  });

  it('marks stalePricing true when pricingMetadata is missing', () => {
    const result = estimateRunCost({ prompt: 'x' }, makeCaps());
    expect(result.stalePricing).toBe(true);
  });

  it('marks stalePricing false for a recent updatedAt', () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 30);
    const result = estimateRunCost(
      { prompt: 'x' },
      makeCaps({ pricingMetadata: { updatedAt: recentDate.toISOString() } } as unknown as Partial<ModelCapabilities>),
    );
    expect(result.stalePricing).toBe(false);
  });
});

describe('enforcePreflight', () => {
  it('throws ContextWindowError when estimated tokens exceed context window', () => {
    const caps = makeCaps({ maxContextLength: 10, contextWindow: 10, maxOutputTokens: 10 });

    expect(() =>
      enforcePreflight(
        { prompt: 'a'.repeat(1000) },
        caps,
        'gpt-4o',
        'openai',
      ),
    ).toThrow(ContextWindowError);
  });

  it('throws QuotaExceededError for maxInputTokens breach', () => {
    expect(() =>
      enforcePreflight(
        { prompt: 'a'.repeat(400) },
        makeCaps(),
        'gpt-4o',
        'openai',
        { maxInputTokens: 1 },
      ),
    ).toThrow(QuotaExceededError);
  });

  it('throws QuotaExceededError for maxOutputTokens breach', () => {
    expect(() =>
      enforcePreflight(
        { prompt: 'x', maxTokens: 8192 },
        makeCaps({ maxOutputTokens: 4096 }),
        'gpt-4o',
        'openai',
        { maxOutputTokens: 512 },
      ),
    ).toThrow(QuotaExceededError);
  });

  it('throws QuotaExceededError for maxTokens breach', () => {
    expect(() =>
      enforcePreflight(
        { prompt: 'a'.repeat(400) },
        makeCaps(),
        'gpt-4o',
        'openai',
        { maxTokens: 1 },
      ),
    ).toThrow(QuotaExceededError);
  });

  it('throws QuotaExceededError for maxCost breach', () => {
    expect(() =>
      enforcePreflight(
        { prompt: 'a'.repeat(400) },
        makeCaps(),
        'gpt-4o',
        'openai',
        { maxCost: 0.000001 },
      ),
    ).toThrow(QuotaExceededError);
  });

  it('does not throw when all budgets are within limits', () => {
    expect(() =>
      enforcePreflight(
        { prompt: 'Hello' },
        makeCaps(),
        'gpt-4o',
        'openai',
        { maxCost: 100, maxTokens: 100_000 },
      ),
    ).not.toThrow();
  });
});

describe('enforcePostRunBudget', () => {
  it('does nothing when budget is undefined', () => {
    expect(() => enforcePostRunBudget(makeResponse(), undefined, 'openai')).not.toThrow();
  });

  it('throws QuotaExceededError when actual cost exceeds maxCost', () => {
    expect(() =>
      enforcePostRunBudget(
        makeResponse({ cost: 1.5 }),
        { maxCost: 0.5 },
        'openai',
      ),
    ).toThrow(QuotaExceededError);
  });

  it('throws QuotaExceededError when actual tokens exceed maxTokens', () => {
    expect(() =>
      enforcePostRunBudget(
        makeResponse({ tokensUsed: { prompt: 900, completion: 200, total: 1100 } }),
        { maxTokens: 500 },
        'openai',
      ),
    ).toThrow(QuotaExceededError);
  });

  it('does not throw when cost and tokens are within budget', () => {
    expect(() =>
      enforcePostRunBudget(
        makeResponse({ cost: 0.001, tokensUsed: { prompt: 100, completion: 50, total: 150 } }),
        { maxCost: 1, maxTokens: 1000 },
        'openai',
      ),
    ).not.toThrow();
  });
});

describe('isPricingStale', () => {
  it('returns true when updatedAt is undefined', () => {
    expect(isPricingStale(undefined)).toBe(true);
  });

  it('returns true for local sentinel value', () => {
    expect(isPricingStale('local')).toBe(true);
  });

  it('returns true for package-default sentinel value', () => {
    expect(isPricingStale('package-default')).toBe(true);
  });

  it('returns true for an invalid date string', () => {
    expect(isPricingStale('not-a-date')).toBe(true);
  });

  it('returns true when pricing is older than 90 days', () => {
    const old = new Date();
    old.setDate(old.getDate() - 100);
    expect(isPricingStale(old.toISOString())).toBe(true);
  });

  it('returns false for a recent date', () => {
    const recent = new Date();
    recent.setDate(recent.getDate() - 30);
    expect(isPricingStale(recent.toISOString())).toBe(false);
  });
});

describe('createPricingStalenessReport', () => {
  it('produces a report with correct shape', () => {
    const catalog = {
      'openai:gpt-4o': makeCaps({ pricingMetadata: { updatedAt: new Date().toISOString() } } as unknown as Partial<ModelCapabilities>),
      'openai:gpt-3.5-turbo': makeCaps(),
    };

    const report = createPricingStalenessReport({ catalog: catalog as unknown as Record<string, ModelCapabilities>, now: new Date() });

    expect(report.totalModels).toBe(2);
    expect(report.entries).toHaveLength(2);
    expect(report.generatedAt).toBeTruthy();
    expect(report.thresholdDays).toBe(90);
    expect(report.staleModels + report.freshModels).toBe(report.totalModels);
  });
});
