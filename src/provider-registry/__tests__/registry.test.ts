import { describe, expect, it, vi } from 'vitest';
import { ProviderFactory } from '../factory.js';
import { PROVIDER_REGISTRY } from '../registry.js';
import { DEFAULT_RETRY_STRATEGY } from '../../types/retry.types.js';

describe('PROVIDER_REGISTRY', () => {
  it('contains all provider definitions needed by the ProviderType union', () => {
    expect(Object.keys(PROVIDER_REGISTRY).sort()).toEqual([
      'anthropic',
      'anyscale',
      'azure',
      'bedrock',
      'cerebras',
      'cohere',
      'deepseek',
      'fireworks',
      'gemini',
      'groq',
      'lmstudio',
      'localai',
      'mistral',
      'novita',
      'ollama',
      'openai',
      'openrouter',
      'perplexity',
      'together',
      'vertexai',
      'vllm',
      'xai',
    ]);
  });
});

describe('ProviderFactory', () => {
  it('warns when building a deprecated model', () => {
    const logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    ProviderFactory.build(
      { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', apiKey: 'key' },
      logger,
      DEFAULT_RETRY_STRATEGY
    );

    expect(logger.warn).toHaveBeenCalledWith(
      "Model 'claude-3-5-sonnet-20241022' on 'anthropic' is deprecated. Consider upgrading."
    );
  });
});
