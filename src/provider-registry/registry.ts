import { AnthropicProtocol } from '../protocols/anthropic.protocol.js';
import { BedrockProtocol } from '../protocols/bedrock.protocol.js';
import { GoogleProtocol } from '../protocols/google.protocol.js';
import { OpenAICompatProtocol } from '../protocols/openai-compat.protocol.js';
import type { ProviderProtocol } from '../protocols/types.js';
import type { ProviderType } from '../types/config.types.js';

export interface ProviderDefinition {
  protocol: ProviderProtocol;
  defaultBaseUrl?: string;
  defaultHeaders?: Record<string, string>;
  noAuth?: boolean;
  costFactor?: number;
  useAzureClient?: boolean;
}

const openaiCompat = new OpenAICompatProtocol();
const anthropic = new AnthropicProtocol();
const google = new GoogleProtocol();
const bedrock = new BedrockProtocol();
const vertexai = google;

export const PROVIDER_REGISTRY = {
  openai:      { protocol: openaiCompat },
  deepseek:    { protocol: openaiCompat, defaultBaseUrl: 'https://api.deepseek.com/v1' },
  groq:        { protocol: openaiCompat, defaultBaseUrl: 'https://api.groq.com/openai/v1' },
  mistral:     { protocol: openaiCompat, defaultBaseUrl: 'https://api.mistral.ai/v1' },
  xai:         { protocol: openaiCompat, defaultBaseUrl: 'https://api.x.ai/v1' },
  cohere:      { protocol: openaiCompat, defaultBaseUrl: 'https://api.cohere.ai/compatibility/v1' },
  together:    { protocol: openaiCompat, defaultBaseUrl: 'https://api.together.xyz/v1' },
  fireworks:   { protocol: openaiCompat, defaultBaseUrl: 'https://api.fireworks.ai/inference/v1' },
  anyscale:    { protocol: openaiCompat, defaultBaseUrl: 'https://api.endpoints.anyscale.com/v1' },
  novita:      { protocol: openaiCompat, defaultBaseUrl: 'https://api.novita.ai/v3/openai' },
  openrouter:  { protocol: openaiCompat, defaultBaseUrl: 'https://openrouter.ai/api/v1' },
  azure:       { protocol: openaiCompat, useAzureClient: true },
  ollama:      { protocol: openaiCompat, defaultBaseUrl: 'http://localhost:11434/v1', noAuth: true, costFactor: 0 },
  lmstudio:    { protocol: openaiCompat, defaultBaseUrl: 'http://localhost:1234/v1', noAuth: true, costFactor: 0 },
  vllm:        { protocol: openaiCompat, defaultBaseUrl: 'http://localhost:8000/v1', noAuth: true, costFactor: 0 },
  localai:     { protocol: openaiCompat, defaultBaseUrl: 'http://localhost:8080/v1', noAuth: true, costFactor: 0 },
  anthropic:   { protocol: anthropic },
  gemini:      { protocol: google },
  vertexai:    { protocol: vertexai },
  bedrock:     { protocol: bedrock },
} satisfies Record<ProviderType, ProviderDefinition>;
