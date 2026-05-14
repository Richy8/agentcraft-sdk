import type { ModelCapabilities } from '../types/provider.types.js';

type Optimization = ModelCapabilities['optimizedFor'][number];

function caps(config: {
  maxContextLength: number;
  maxOutputTokens: number;
  tools?: boolean;
  json?: boolean;
  streaming?: boolean;
  vision?: boolean;
  audio?: boolean;
  video?: boolean;
  files?: boolean;
  optimizedFor?: Optimization[];
  qualityScore: number;
  speedScore: number;
  costPerMInputToken: number;
  costPerMOutputToken: number;
  cachedInputDiscount?: number;
  costPerRequest?: number;
  cacheWriteMultiplier?: number;
  cacheReadMultiplier?: number;
  batchDiscount?: number;
  priorityMultiplier?: number;
  flexDiscount?: number;
  toolCallCost?: number;
  searchCost?: number;
  pricingTiers?: ModelCapabilities['pricingTiers'];
  regionPricing?: ModelCapabilities['regionPricing'];
  deprecated?: boolean;
}): ModelCapabilities {
  return {
    maxContextLength: config.maxContextLength,
    maxOutputTokens: config.maxOutputTokens,
    supportsTools: config.tools ?? false,
    supportsJsonMode: config.json ?? true,
    supportsStreaming: config.streaming ?? true,
    supportsVision: config.vision ?? false,
    supportsAudio: config.audio ?? false,
    supportsVideo: config.video ?? false,
    supportsFiles: config.files ?? false,
    optimizedFor: config.optimizedFor ?? ['quality'],
    qualityScore: config.qualityScore,
    speedScore: config.speedScore,
    costPerMInputToken: config.costPerMInputToken,
    costPerMOutputToken: config.costPerMOutputToken,
    ...(config.cachedInputDiscount !== undefined && { cachedInputDiscount: config.cachedInputDiscount }),
    ...(config.costPerRequest !== undefined && { costPerRequest: config.costPerRequest }),
    ...(config.cacheWriteMultiplier !== undefined && { cacheWriteMultiplier: config.cacheWriteMultiplier }),
    ...(config.cacheReadMultiplier !== undefined && { cacheReadMultiplier: config.cacheReadMultiplier }),
    ...(config.batchDiscount !== undefined && { batchDiscount: config.batchDiscount }),
    ...(config.priorityMultiplier !== undefined && { priorityMultiplier: config.priorityMultiplier }),
    ...(config.flexDiscount !== undefined && { flexDiscount: config.flexDiscount }),
    ...(config.toolCallCost !== undefined && { toolCallCost: config.toolCallCost }),
    ...(config.searchCost !== undefined && { searchCost: config.searchCost }),
    ...(config.pricingTiers !== undefined && { pricingTiers: config.pricingTiers }),
    ...(config.regionPricing !== undefined && { regionPricing: config.regionPricing }),
    ...(config.deprecated !== undefined && { deprecated: config.deprecated }),
  };
}

export const MODEL_CATALOG: Record<string, ModelCapabilities> = {
  'openai:gpt-5.5': caps({ maxContextLength: 256_000, maxOutputTokens: 32_000, tools: true, vision: true, qualityScore: 10, speedScore: 7, costPerMInputToken: 5, costPerMOutputToken: 30, cachedInputDiscount: 0.5 }),
  'openai:gpt-5.4': caps({ maxContextLength: 256_000, maxOutputTokens: 32_000, tools: true, vision: true, qualityScore: 9, speedScore: 7, costPerMInputToken: 2.5, costPerMOutputToken: 15, cachedInputDiscount: 0.5 }),
  'openai:gpt-5.4-mini': caps({ maxContextLength: 128_000, maxOutputTokens: 16_000, tools: true, vision: true, optimizedFor: ['cost', 'speed'], qualityScore: 7, speedScore: 8, costPerMInputToken: 0.75, costPerMOutputToken: 4.5, cachedInputDiscount: 0.5 }),
  'openai:gpt-5.4-nano': caps({ maxContextLength: 128_000, maxOutputTokens: 8_000, tools: true, vision: true, optimizedFor: ['cost', 'speed'], qualityScore: 5, speedScore: 9, costPerMInputToken: 0.2, costPerMOutputToken: 1.25, cachedInputDiscount: 0.5 }),
  'openai:gpt-5.3-codex': caps({ maxContextLength: 200_000, maxOutputTokens: 32_000, tools: true, optimizedFor: ['code'], qualityScore: 9, speedScore: 7, costPerMInputToken: 1.75, costPerMOutputToken: 14, cachedInputDiscount: 0.5 }),
  'openai:gpt-4o': caps({ maxContextLength: 128_000, maxOutputTokens: 16_000, tools: true, vision: true, qualityScore: 9, speedScore: 7, costPerMInputToken: 2.5, costPerMOutputToken: 10, cachedInputDiscount: 0.5 }),
  'openai:gpt-4o-mini': caps({ maxContextLength: 128_000, maxOutputTokens: 16_000, tools: true, vision: true, optimizedFor: ['cost', 'speed'], qualityScore: 6, speedScore: 8, costPerMInputToken: 0.15, costPerMOutputToken: 0.6, cachedInputDiscount: 0.5 }),
  'openai:o1': caps({ maxContextLength: 200_000, maxOutputTokens: 100_000, tools: true, vision: true, optimizedFor: ['reasoning'], qualityScore: 10, speedScore: 3, costPerMInputToken: 15, costPerMOutputToken: 60, cachedInputDiscount: 0.5 }),
  'openai:o3': caps({ maxContextLength: 200_000, maxOutputTokens: 100_000, tools: true, vision: true, optimizedFor: ['reasoning', 'code'], qualityScore: 10, speedScore: 4, costPerMInputToken: 2, costPerMOutputToken: 8, cachedInputDiscount: 0.75 }),
  'openai:o4-mini': caps({ maxContextLength: 200_000, maxOutputTokens: 100_000, tools: true, vision: true, optimizedFor: ['reasoning', 'cost'], qualityScore: 8, speedScore: 7, costPerMInputToken: 1.1, costPerMOutputToken: 4.4, cachedInputDiscount: 0.75 }),
  'openai:o3-deep-research': caps({ maxContextLength: 200_000, maxOutputTokens: 32_000, tools: true, optimizedFor: ['reasoning'], qualityScore: 10, speedScore: 3, costPerMInputToken: 5, costPerMOutputToken: 20 }),
  'openai:o4-mini-deep-research': caps({ maxContextLength: 200_000, maxOutputTokens: 32_000, tools: true, optimizedFor: ['reasoning', 'cost'], qualityScore: 8, speedScore: 6, costPerMInputToken: 1, costPerMOutputToken: 4 }),

  'anthropic:claude-opus-4-7': caps({ maxContextLength: 1_000_000, maxOutputTokens: 32_000, tools: true, vision: true, files: true, qualityScore: 10, speedScore: 4, costPerMInputToken: 5, costPerMOutputToken: 25, cachedInputDiscount: 0.9 }),
  'anthropic:claude-opus-4-6': caps({ maxContextLength: 1_000_000, maxOutputTokens: 32_000, tools: true, vision: true, files: true, qualityScore: 10, speedScore: 4, costPerMInputToken: 5, costPerMOutputToken: 25, cachedInputDiscount: 0.9 }),
  'anthropic:claude-sonnet-4-6': caps({ maxContextLength: 1_000_000, maxOutputTokens: 64_000, tools: true, vision: true, files: true, qualityScore: 9, speedScore: 7, costPerMInputToken: 3, costPerMOutputToken: 15, cachedInputDiscount: 0.9 }),
  'anthropic:claude-sonnet-4-5': caps({ maxContextLength: 1_000_000, maxOutputTokens: 64_000, tools: true, vision: true, files: true, qualityScore: 9, speedScore: 7, costPerMInputToken: 3, costPerMOutputToken: 15, cachedInputDiscount: 0.9 }),
  'anthropic:claude-haiku-4-5': caps({ maxContextLength: 200_000, maxOutputTokens: 16_000, tools: true, vision: true, optimizedFor: ['speed'], qualityScore: 6, speedScore: 9, costPerMInputToken: 1, costPerMOutputToken: 5, cachedInputDiscount: 0.9 }),
  'anthropic:claude-haiku-3-5': caps({ maxContextLength: 200_000, maxOutputTokens: 8_000, tools: true, vision: true, optimizedFor: ['speed'], qualityScore: 5, speedScore: 9, costPerMInputToken: 0.8, costPerMOutputToken: 4, cachedInputDiscount: 0.9, deprecated: true }),
  'anthropic:claude-3-5-sonnet': caps({ maxContextLength: 200_000, maxOutputTokens: 8_000, tools: true, vision: true, qualityScore: 9, speedScore: 7, costPerMInputToken: 3, costPerMOutputToken: 15, cachedInputDiscount: 0.9, deprecated: true }),

  'gemini:gemini-3.1-pro-preview': caps({ maxContextLength: 2_000_000, maxOutputTokens: 65_000, tools: true, vision: true, audio: true, qualityScore: 10, speedScore: 6, costPerMInputToken: 2, costPerMOutputToken: 12, cachedInputDiscount: 0.9 }),
  'gemini:gemini-3-flash-preview': caps({ maxContextLength: 1_000_000, maxOutputTokens: 65_000, tools: true, vision: true, audio: true, optimizedFor: ['speed'], qualityScore: 8, speedScore: 8, costPerMInputToken: 0.5, costPerMOutputToken: 3, cachedInputDiscount: 0.9 }),
  'gemini:gemini-3.1-flash-lite-preview': caps({ maxContextLength: 1_000_000, maxOutputTokens: 16_000, tools: true, vision: true, optimizedFor: ['speed', 'cost'], qualityScore: 6, speedScore: 9, costPerMInputToken: 0.25, costPerMOutputToken: 1.5 }),
  'gemini:gemini-2.5-pro': caps({ maxContextLength: 2_000_000, maxOutputTokens: 65_000, tools: true, vision: true, audio: true, qualityScore: 9, speedScore: 6, costPerMInputToken: 1.25, costPerMOutputToken: 10, cachedInputDiscount: 0.9 }),
  'gemini:gemini-2.5-flash': caps({ maxContextLength: 1_000_000, maxOutputTokens: 65_000, tools: true, vision: true, audio: true, optimizedFor: ['speed'], qualityScore: 7, speedScore: 8, costPerMInputToken: 0.3, costPerMOutputToken: 2.5, cachedInputDiscount: 0.9 }),
  'gemini:gemini-2.5-flash-lite': caps({ maxContextLength: 1_000_000, maxOutputTokens: 16_000, tools: true, vision: true, optimizedFor: ['cost', 'speed'], qualityScore: 5, speedScore: 9, costPerMInputToken: 0.1, costPerMOutputToken: 0.4 }),
  'gemini:gemini-2.0-flash': caps({ maxContextLength: 1_000_000, maxOutputTokens: 8_000, tools: true, vision: true, optimizedFor: ['speed'], qualityScore: 6, speedScore: 9, costPerMInputToken: 0.1, costPerMOutputToken: 0.4, deprecated: true }),

  'deepseek:deepseek-v4': caps({ maxContextLength: 1_000_000, maxOutputTokens: 384_000, tools: true, optimizedFor: ['cost', 'code'], qualityScore: 8, speedScore: 7, costPerMInputToken: 0.3, costPerMOutputToken: 0.5, cachedInputDiscount: 0.98 }),
  'deepseek:deepseek-v4-flash': caps({ maxContextLength: 1_000_000, maxOutputTokens: 384_000, tools: true, optimizedFor: ['cost', 'code'], qualityScore: 7, speedScore: 8, costPerMInputToken: 0.14, costPerMOutputToken: 0.28, cachedInputDiscount: 0.98 }),
  'deepseek:deepseek-v4-pro': caps({ maxContextLength: 1_000_000, maxOutputTokens: 384_000, tools: true, optimizedFor: ['quality', 'code', 'reasoning'], qualityScore: 9, speedScore: 6, costPerMInputToken: 0.435, costPerMOutputToken: 0.87, cachedInputDiscount: 0.99 }),
  'deepseek:deepseek-r1': caps({ maxContextLength: 1_000_000, maxOutputTokens: 32_000, tools: true, optimizedFor: ['reasoning'], qualityScore: 9, speedScore: 5, costPerMInputToken: 0.55, costPerMOutputToken: 2.19, cachedInputDiscount: 0.98 }),
  'deepseek:deepseek-chat': caps({ maxContextLength: 1_000_000, maxOutputTokens: 384_000, tools: true, optimizedFor: ['cost'], qualityScore: 7, speedScore: 8, costPerMInputToken: 0.14, costPerMOutputToken: 0.28, deprecated: true }),

  'xai:grok-4-3': caps({ maxContextLength: 256_000, maxOutputTokens: 16_000, tools: true, vision: true, optimizedFor: ['quality', 'reasoning'], qualityScore: 9, speedScore: 7, costPerMInputToken: 1.8, costPerMOutputToken: 9 }),
  'xai:grok-4-20': caps({ maxContextLength: 2_000_000, maxOutputTokens: 32_000, tools: true, vision: true, optimizedFor: ['quality'], qualityScore: 9, speedScore: 6, costPerMInputToken: 2, costPerMOutputToken: 6 }),
  'xai:grok-4-1-fast': caps({ maxContextLength: 2_000_000, maxOutputTokens: 16_000, tools: true, vision: true, optimizedFor: ['speed', 'cost'], qualityScore: 7, speedScore: 9, costPerMInputToken: 0.2, costPerMOutputToken: 0.5 }),
  'xai:grok-4': caps({ maxContextLength: 256_000, maxOutputTokens: 16_000, tools: true, vision: true, qualityScore: 9, speedScore: 6, costPerMInputToken: 3, costPerMOutputToken: 15 }),
  'xai:grok-3': caps({ maxContextLength: 131_000, maxOutputTokens: 16_000, tools: true, qualityScore: 8, speedScore: 6, costPerMInputToken: 3, costPerMOutputToken: 15 }),
  'xai:grok-3-mini': caps({ maxContextLength: 131_000, maxOutputTokens: 16_000, tools: true, optimizedFor: ['cost', 'speed'], qualityScore: 6, speedScore: 8, costPerMInputToken: 0.3, costPerMOutputToken: 0.5 }),

  'groq:llama-4-scout-17b': caps({ maxContextLength: 128_000, maxOutputTokens: 8_000, tools: true, optimizedFor: ['speed', 'cost'], qualityScore: 6, speedScore: 10, costPerMInputToken: 0.11, costPerMOutputToken: 0.34 }),
  'groq:qwen3-32b': caps({ maxContextLength: 128_000, maxOutputTokens: 8_000, tools: true, optimizedFor: ['speed'], qualityScore: 7, speedScore: 10, costPerMInputToken: 0.29, costPerMOutputToken: 0.59 }),
  'groq:gpt-oss-20b': caps({ maxContextLength: 128_000, maxOutputTokens: 8_000, tools: true, optimizedFor: ['speed', 'cost'], qualityScore: 5, speedScore: 10, costPerMInputToken: 0.075, costPerMOutputToken: 0.3 }),
  'groq:gpt-oss-120b': caps({ maxContextLength: 128_000, maxOutputTokens: 8_000, tools: true, optimizedFor: ['speed'], qualityScore: 7, speedScore: 10, costPerMInputToken: 0.15, costPerMOutputToken: 0.6 }),
  'groq:llama-3.3-70b-versatile': caps({ maxContextLength: 128_000, maxOutputTokens: 32_000, tools: true, optimizedFor: ['speed', 'cost'], qualityScore: 7, speedScore: 10, costPerMInputToken: 0.59, costPerMOutputToken: 0.79 }),
  'groq:llama-3.1-8b-instant': caps({ maxContextLength: 128_000, maxOutputTokens: 8_000, tools: true, optimizedFor: ['speed', 'cost'], qualityScore: 4, speedScore: 10, costPerMInputToken: 0.05, costPerMOutputToken: 0.08 }),

  'mistral:mistral-large-latest': caps({ maxContextLength: 128_000, maxOutputTokens: 8_000, tools: true, optimizedFor: ['quality', 'code'], qualityScore: 8, speedScore: 7, costPerMInputToken: 0.5, costPerMOutputToken: 1.5 }),
  'mistral:mistral-small-latest': caps({ maxContextLength: 128_000, maxOutputTokens: 8_000, tools: true, optimizedFor: ['cost', 'speed'], qualityScore: 6, speedScore: 8, costPerMInputToken: 0.1, costPerMOutputToken: 0.3 }),
  'mistral:mistral-nemo': caps({ maxContextLength: 128_000, maxOutputTokens: 8_000, tools: true, optimizedFor: ['cost'], qualityScore: 4, speedScore: 9, costPerMInputToken: 0.02, costPerMOutputToken: 0.04 }),
  'mistral:codestral-latest': caps({ maxContextLength: 32_000, maxOutputTokens: 8_000, optimizedFor: ['code'], qualityScore: 8, speedScore: 8, costPerMInputToken: 0.3, costPerMOutputToken: 0.9 }),

  'together:meta-llama/Llama-3.3-70B-Instruct-Turbo': caps({ maxContextLength: 131_000, maxOutputTokens: 8_000, tools: true, optimizedFor: ['quality', 'cost'], qualityScore: 7, speedScore: 7, costPerMInputToken: 0.88, costPerMOutputToken: 0.88 }),
  'perplexity:sonar-pro': caps({ maxContextLength: 200_000, maxOutputTokens: 8_000, tools: false, json: true, optimizedFor: ['quality'], qualityScore: 7, speedScore: 6, costPerMInputToken: 3, costPerMOutputToken: 15, costPerRequest: 0.006 }),
  'perplexity:sonar': caps({ maxContextLength: 127_000, maxOutputTokens: 8_000, tools: false, json: true, optimizedFor: ['cost'], qualityScore: 5, speedScore: 8, costPerMInputToken: 1, costPerMOutputToken: 1, costPerRequest: 0.005 }),
  'cohere:command-r-plus-08-2024': caps({ maxContextLength: 128_000, maxOutputTokens: 4_000, tools: true, optimizedFor: ['quality'], qualityScore: 8, speedScore: 6, costPerMInputToken: 2.5, costPerMOutputToken: 10 }),
  'cohere:command-r-08-2024': caps({ maxContextLength: 128_000, maxOutputTokens: 4_000, tools: true, optimizedFor: ['cost'], qualityScore: 6, speedScore: 8, costPerMInputToken: 0.15, costPerMOutputToken: 0.6 }),
  'cohere:command-r7b-12-2024': caps({ maxContextLength: 128_000, maxOutputTokens: 4_000, tools: true, optimizedFor: ['cost', 'speed'], qualityScore: 4, speedScore: 9, costPerMInputToken: 0.0375, costPerMOutputToken: 0.15 }),
  'cerebras:llama3.1-70b': caps({ maxContextLength: 128_000, maxOutputTokens: 8_000, tools: true, optimizedFor: ['speed', 'cost'], qualityScore: 7, speedScore: 10, costPerMInputToken: 0.6, costPerMOutputToken: 0.6 }),
  'cerebras:llama3.1-8b': caps({ maxContextLength: 128_000, maxOutputTokens: 8_000, tools: true, optimizedFor: ['speed', 'cost'], qualityScore: 4, speedScore: 10, costPerMInputToken: 0.1, costPerMOutputToken: 0.1 }),

  'fireworks:accounts/fireworks/models/llama-v3p1-70b-instruct': caps({ maxContextLength: 128_000, maxOutputTokens: 8_000, tools: true, optimizedFor: ['speed', 'cost'], qualityScore: 7, speedScore: 8, costPerMInputToken: 0.9, costPerMOutputToken: 0.9 }),
  'anyscale:meta-llama/Llama-3.1-70B-Instruct': caps({ maxContextLength: 128_000, maxOutputTokens: 8_000, tools: true, optimizedFor: ['quality'], qualityScore: 7, speedScore: 7, costPerMInputToken: 1, costPerMOutputToken: 1 }),
  'novita:meta-llama/llama-3.1-70b-instruct': caps({ maxContextLength: 128_000, maxOutputTokens: 8_000, tools: true, optimizedFor: ['cost'], qualityScore: 7, speedScore: 7, costPerMInputToken: 0.8, costPerMOutputToken: 0.8 }),
  'openrouter:anthropic/claude-sonnet-4.5': caps({ maxContextLength: 1_000_000, maxOutputTokens: 64_000, tools: true, vision: true, files: true, qualityScore: 9, speedScore: 7, costPerMInputToken: 3, costPerMOutputToken: 15 }),

  'bedrock:anthropic.claude-3-7-sonnet': caps({ maxContextLength: 200_000, maxOutputTokens: 8_000, tools: true, vision: true, qualityScore: 9, speedScore: 7, costPerMInputToken: 3, costPerMOutputToken: 15 }),
  'bedrock:meta.llama3-3-70b-instruct': caps({ maxContextLength: 128_000, maxOutputTokens: 8_000, tools: true, optimizedFor: ['cost'], qualityScore: 7, speedScore: 7, costPerMInputToken: 2.65, costPerMOutputToken: 2.65, regionPricing: { 'us-east-1': { inputPerM: 2.65, outputPerM: 2.65 }, 'eu-west-1': { inputPerM: 2.9, outputPerM: 2.9 } } }),
  'bedrock:mistral.mistral-large': caps({ maxContextLength: 128_000, maxOutputTokens: 8_000, tools: true, qualityScore: 8, speedScore: 6, costPerMInputToken: 2, costPerMOutputToken: 6 }),
  'vertexai:gemini-2.5-pro': caps({ maxContextLength: 2_000_000, maxOutputTokens: 65_000, tools: true, vision: true, audio: true, qualityScore: 9, speedScore: 6, costPerMInputToken: 1.25, costPerMOutputToken: 10, cachedInputDiscount: 0.9, regionPricing: { 'us-central1': { inputPerM: 1.25, outputPerM: 10 }, europe: { inputPerM: 1.35, outputPerM: 10.8 } } }),
  'vertexai:gemini-2.5-flash': caps({ maxContextLength: 1_000_000, maxOutputTokens: 65_000, tools: true, vision: true, audio: true, optimizedFor: ['speed'], qualityScore: 7, speedScore: 8, costPerMInputToken: 0.3, costPerMOutputToken: 2.5, cachedInputDiscount: 0.9 }),

  'ollama:__default__': caps({ maxContextLength: 128_000, maxOutputTokens: 8_000, tools: true, optimizedFor: ['cost'], qualityScore: 5, speedScore: 6, costPerMInputToken: 0, costPerMOutputToken: 0 }),
  'lmstudio:__default__': caps({ maxContextLength: 128_000, maxOutputTokens: 8_000, tools: true, optimizedFor: ['cost'], qualityScore: 5, speedScore: 6, costPerMInputToken: 0, costPerMOutputToken: 0 }),
  'vllm:__default__': caps({ maxContextLength: 128_000, maxOutputTokens: 8_000, tools: true, optimizedFor: ['cost'], qualityScore: 5, speedScore: 6, costPerMInputToken: 0, costPerMOutputToken: 0 }),
  'localai:__default__': caps({ maxContextLength: 128_000, maxOutputTokens: 8_000, tools: true, optimizedFor: ['cost'], qualityScore: 5, speedScore: 6, costPerMInputToken: 0, costPerMOutputToken: 0 }),
  __default__: caps({ maxContextLength: 8_000, maxOutputTokens: 4_000, json: false, streaming: true, qualityScore: 5, speedScore: 5, costPerMInputToken: 0.5, costPerMOutputToken: 1.5 }),
};

const PRICING_SOURCE_BY_PROVIDER: Record<string, { sourceUrl: string; notes?: string }> = {
  openai: { sourceUrl: 'https://openai.com/api/pricing/' },
  azure: { sourceUrl: 'https://azure.microsoft.com/pricing/details/cognitive-services/openai-service/' },
  anthropic: { sourceUrl: 'https://platform.claude.com/docs/en/about-claude/pricing' },
  gemini: { sourceUrl: 'https://ai.google.dev/gemini-api/docs/pricing', notes: 'Gemini pricing may vary by token threshold and modality.' },
  vertexai: { sourceUrl: 'https://cloud.google.com/vertex-ai/generative-ai/pricing', notes: 'Vertex AI pricing may vary by region and modality.' },
  bedrock: { sourceUrl: 'https://aws.amazon.com/bedrock/pricing/', notes: 'Bedrock pricing is region and model-version sensitive.' },
  cohere: { sourceUrl: 'https://cohere.com/pricing' },
  deepseek: { sourceUrl: 'https://api-docs.deepseek.com/quick_start/pricing' },
  groq: { sourceUrl: 'https://console.groq.com/docs/pricing' },
  mistral: { sourceUrl: 'https://mistral.ai/pricing' },
  together: { sourceUrl: 'https://www.together.ai/pricing' },
  fireworks: { sourceUrl: 'https://fireworks.ai/pricing' },
  perplexity: { sourceUrl: 'https://docs.perplexity.ai/guides/pricing' },
  openrouter: { sourceUrl: 'https://openrouter.ai/models', notes: 'OpenRouter pricing depends on routed model/provider.' },
  anyscale: { sourceUrl: 'https://www.anyscale.com/pricing' },
  novita: { sourceUrl: 'https://novita.ai/pricing' },
  xai: { sourceUrl: 'https://docs.x.ai/docs/models' },
  cerebras: { sourceUrl: 'https://inference-docs.cerebras.ai/introduction' },
  ollama: { sourceUrl: 'local', notes: 'Local runtime cost is not metered by this package.' },
  lmstudio: { sourceUrl: 'local', notes: 'Local runtime cost is not metered by this package.' },
  vllm: { sourceUrl: 'local', notes: 'Local runtime cost is not metered by this package.' },
  localai: { sourceUrl: 'local', notes: 'Local runtime cost is not metered by this package.' },
  __default__: { sourceUrl: 'package-default', notes: 'Fallback estimate for unknown models; do not use for billing.' },
};

const PRICING_UPDATED_AT = '2026-05-08';

for (const [key, modelCaps] of Object.entries(MODEL_CATALOG)) {
  const provider = key.includes(':') ? key.split(':')[0]! : '__default__';
  const source = PRICING_SOURCE_BY_PROVIDER[provider] ?? PRICING_SOURCE_BY_PROVIDER.__default__!;
  modelCaps.pricingMetadata = {
    currency: 'USD',
    unit: 'per_1m_tokens',
    sourceUrl: source.sourceUrl,
    updatedAt: PRICING_UPDATED_AT,
    ...(source.notes !== undefined && { notes: source.notes }),
  };
}
