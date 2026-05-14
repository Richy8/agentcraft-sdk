import { describe, expect, it } from 'vitest';
import { costCalculator } from '../index.js';
import type { ModelCapabilities } from '../../types/provider.types.js';

const caps = {
  maxContextLength: 128_000,
  maxOutputTokens: 16_384,
  supportsTools: true,
  supportsJsonMode: true,
  supportsStreaming: true,
  supportsVision: false,
  supportsAudio: false,
  supportsVideo: false,
  supportsFiles: false,
  optimizedFor: ['quality'],
  qualityScore: 0.9,
  speedScore: 0.6,
  costPerMInputToken: 2,
  costPerMOutputToken: 10,
} satisfies ModelCapabilities;

describe('costCalculator', () => {
  it('calculates token cost using per-million pricing', () => {
    expect(
      costCalculator.calculate(
        {
          prompt: 500_000,
          completion: 100_000,
          total: 600_000,
        },
        caps
      )
    ).toBe(2);
  });

  it('adds per-request cost when the model has a call fee', () => {
    expect(
      costCalculator.calculate(
        {
          prompt: 1_000_000,
          completion: 1_000_000,
          total: 2_000_000,
        },
        { ...caps, costPerRequest: 0.005 }
      )
    ).toBe(12.005);
  });

  it('exposes individual cost line items', () => {
    expect(
      costCalculator.calculateBreakdown(
        {
          prompt: 250_000,
          completion: 50_000,
          total: 300_000,
        },
        { ...caps, costPerRequest: 0.01 }
      )
    ).toEqual({
      inputCost: 0.5,
      outputCost: 0.5,
      cacheReadCost: 0,
      cacheWriteCost: 0,
      toolCost: 0,
      searchCost: 0,
      callCost: 0.01,
      totalCost: 1.01,
    });
  });

  it('accounts for cache, region, priority, batch, and tool/search fees', () => {
    const breakdown = costCalculator.calculateBreakdown(
        {
          prompt: 1_000_000,
          cachedPrompt: 200_000,
          cacheWritePrompt: 100_000,
          completion: 100_000,
          total: 1_100_000,
        },
        {
          ...caps,
          cacheReadMultiplier: 0.25,
          cacheWriteMultiplier: 1.25,
          batchDiscount: 0.5,
          priorityMultiplier: 2,
          toolCallCost: 0.001,
          searchCost: 0.005,
          regionPricing: { eu: { inputPerM: 4, outputPerM: 12 } },
        },
        { region: 'eu', batch: true, priority: true, toolCalls: 2, searches: 1 }
    );

    expect(breakdown.inputCost).toBeCloseTo(2.8);
    expect(breakdown.cacheReadCost).toBeCloseTo(0.2);
    expect(breakdown.cacheWriteCost).toBeCloseTo(0.5);
    expect(breakdown.outputCost).toBeCloseTo(1.2);
    expect(breakdown.toolCost).toBeCloseTo(0.002);
    expect(breakdown.searchCost).toBeCloseTo(0.005);
    expect(breakdown.totalCost).toBeCloseTo(4.707);
  });
});
