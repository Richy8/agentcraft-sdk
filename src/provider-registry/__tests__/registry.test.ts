import { describe, expect, it, vi } from 'vitest';
import { ProviderFactory } from '../factory.js';
import { PROVIDER_REGISTRY } from '../registry.js';
import { DEFAULT_RETRY_STRATEGY } from '../../types/retry.types.js';

describe('PROVIDER_REGISTRY', () => {
  it('contains all provider definitions needed by the ProviderType union', () => {
    expect(Object.keys(PROVIDER_REGISTRY).sort()).toEqual([
      'anthropic',
      'bedrock',
      'deepseek',
      'gemini',
      'groq',
      'mistral',
      'ollama',
      'openai',
      'vertexai',
      'xai',
    ]);
  });
});

describe('ProviderFactory', () => {
  it('builds a provider without error for a valid model', () => {
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    expect(() =>
      ProviderFactory.build(
        { provider: 'anthropic', model: 'claude-sonnet-4-6', apiKey: 'key' },
        logger,
        DEFAULT_RETRY_STRATEGY
      )
    ).not.toThrow();
    expect(logger.warn).not.toHaveBeenCalled();
  });
});
