import { describe, expect, it } from 'vitest';
import { ConfigurationError } from '../../errors/index.js';
import { validateConfig, validateModelSet } from '../validator.js';

describe('validateConfig', () => {
  it('uses AgentConfigSchema for provider-specific required fields', () => {
    expect(() =>
      validateConfig({
        provider: 'azure',
        model: 'gpt-4o',
        apiKey: 'key',
      })
    ).toThrow(ConfigurationError);
  });

  it('accepts a valid provider config with agent-level fields', () => {
    expect(() =>
      validateConfig({
        provider: 'openai',
        model: 'gpt-4o',
        apiKey: 'key',
        retry: {
          maxAttempts: 3,
          backoff: 'exponential',
          initialDelay: 1_000,
          maxDelay: 60_000,
        },
      })
    ).not.toThrow();
  });
});

describe('validateModelSet', () => {
  it('rejects duplicate model names', () => {
    expect(() =>
      validateModelSet({
        models: [{ name: 'primary' }, { name: 'primary' }],
      })
    ).toThrow('Model names must be unique - duplicate name detected');
  });

  it('rejects an unknown default model reference', () => {
    expect(() =>
      validateModelSet({
        models: [{ name: 'primary' }],
        default: 'backup',
      })
    ).toThrow("Default model 'backup' does not match any defined model name");
  });
});
