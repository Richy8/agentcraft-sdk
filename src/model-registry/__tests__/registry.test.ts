import { describe, expect, it } from 'vitest';
import { BestFitResolver } from '../resolver.js';
import { modelRegistry } from '../registry.js';
import type { ModelConfig } from '../../types/config.types.js';

describe('modelRegistry', () => {
  it('uses provider-scoped prefix fallback for versioned model IDs', () => {
    const caps = modelRegistry.getCapabilities('anthropic', 'claude-3-5-sonnet-20241022');

    expect(caps.deprecated).toBe(true);
    expect(caps.maxContextLength).toBe(200_000);
  });

  it('uses provider defaults before the global fallback', () => {
    expect(modelRegistry.getCapabilities('ollama', 'custom-local-model').costPerMInputToken).toBe(0);
    expect(modelRegistry.getCapabilities('unknown', 'custom-model').costPerMInputToken).toBe(0.5);
  });
});

describe('BestFitResolver', () => {
  it('normalizes costPerRequest when ranking cost', () => {
    const expensiveSearch = {
      provider: 'perplexity',
      model: 'sonar-pro',
      apiKey: 'key',
    } satisfies ModelConfig;
    const cheaperTokenModel = {
      provider: 'openai',
      model: 'gpt-4o',
      apiKey: 'key',
    } satisfies ModelConfig;

    expect(new BestFitResolver().resolve([expensiveSearch, cheaperTokenModel], 'cost')).toBe(cheaperTokenModel);
  });

  it('resolves workload-aware best fit while respecting cost and capability constraints', () => {
    const cheap = { provider: 'openai', model: 'gpt-4o-mini', apiKey: 'key' } satisfies ModelConfig;
    const strong = { provider: 'openai', model: 'gpt-4o', apiKey: 'key' } satisfies ModelConfig;

    expect(new BestFitResolver().resolveForWorkload([cheap, strong], {
      promptTokens: 1_000,
      outputTokens: 1_000,
      qualityFloor: 8,
      needsTools: true,
    })).toBe(strong);
  });

  it('exposes pricing source metadata and region pricing for cloud gateways', () => {
    const bedrock = modelRegistry.getCapabilities('bedrock', 'meta.llama3-3-70b-instruct');
    const vertex = modelRegistry.getCapabilities('vertexai', 'gemini-2.5-pro');

    expect(bedrock.pricingMetadata?.sourceUrl).toContain('bedrock');
    expect(bedrock.regionPricing?.['eu-west-1']?.inputPerM).toBeGreaterThan(0);
    expect(vertex.regionPricing?.['us-central1']?.outputPerM).toBeGreaterThan(0);
  });
});
