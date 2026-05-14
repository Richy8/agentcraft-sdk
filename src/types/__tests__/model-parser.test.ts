import { describe, expect, it } from 'vitest';
import { ConfigurationError } from '../../errors/index.js';
import { parseModelString } from '../model-parser.js';

describe('parseModelString', () => {
  it('parses anthropic model strings', () => {
    expect(parseModelString('anthropic:claude-sonnet-4-6')).toEqual({
      provider: 'anthropic',
      modelId: 'claude-sonnet-4-6',
    });
  });

  it('preserves additional colons in Bedrock model IDs', () => {
    expect(parseModelString('bedrock:anthropic.claude-3-7-sonnet-20250219-v1:0')).toEqual({
      provider: 'bedrock',
      modelId: 'anthropic.claude-3-7-sonnet-20250219-v1:0',
    });
  });

  it('preserves slashes in Together model IDs', () => {
    expect(parseModelString('together:meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo')).toEqual({
      provider: 'together',
      modelId: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
    });
  });

  it('parses Groq model strings', () => {
    expect(parseModelString('groq:llama-3.3-70b-versatile')).toEqual({
      provider: 'groq',
      modelId: 'llama-3.3-70b-versatile',
    });
  });

  it('throws ConfigurationError when the colon is missing', () => {
    expect(() => parseModelString('claude-sonnet-4-6')).toThrow(ConfigurationError);
  });

  it('throws ConfigurationError for an empty string', () => {
    expect(() => parseModelString('')).toThrow(ConfigurationError);
  });
});
