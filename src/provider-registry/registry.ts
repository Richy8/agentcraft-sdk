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
  openai: { protocol: openaiCompat },
  deepseek: { protocol: openaiCompat, defaultBaseUrl: 'https://api.deepseek.com/v1' },
  groq: { protocol: openaiCompat, defaultBaseUrl: 'https://api.groq.com/openai/v1' },
  mistral: { protocol: openaiCompat, defaultBaseUrl: 'https://api.mistral.ai/v1' },
  xai: { protocol: openaiCompat, defaultBaseUrl: 'https://api.x.ai/v1' },
  ollama: { protocol: openaiCompat, defaultBaseUrl: 'http://localhost:11434/v1', noAuth: true, costFactor: 0 },
  anthropic: { protocol: anthropic },
  gemini: { protocol: google },
  vertexai: { protocol: vertexai },
  bedrock: { protocol: bedrock },
} satisfies Record<ProviderType, ProviderDefinition>;
