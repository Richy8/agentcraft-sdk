import { z } from 'zod';

const baseProviderSchema = z.object({
  name: z.string().min(1).optional(),
  model: z.string().min(1),
  timeout: z.number().positive().optional(),
  maxTokens: z.number().positive().int().optional(),
  temperature: z.number().min(0).max(2).optional(),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  stopSequences: z.array(z.string()).max(4).optional(),
});

const openaiCompatCloudSchema = baseProviderSchema.extend({
  provider: z.enum([
    'openai',
    'groq',
    'mistral',
    'together',
    'fireworks',
    'perplexity',
    'openrouter',
    'anyscale',
    'novita',
    'xai',
    'cerebras',
  ]),
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
});

const azureSchema = baseProviderSchema.extend({
  provider: z.literal('azure'),
  apiKey: z.string().min(1),
  endpoint: z.string().url(),
  deployment: z.string().min(1),
  apiVersion: z.string().optional(),
});

const localSchema = baseProviderSchema.extend({
  provider: z.enum(['ollama', 'lmstudio', 'vllm', 'localai']),
  baseUrl: z.string().url().optional(),
});

const deepseekSchema = baseProviderSchema.extend({
  provider: z.literal('deepseek'),
  apiKey: z.string().min(1),
  baseUrl: z.string().url().optional(),
});

const anthropicSchema = baseProviderSchema.extend({
  provider: z.literal('anthropic'),
  apiKey: z.string().min(1),
});

const geminiSchema = baseProviderSchema.extend({
  provider: z.literal('gemini'),
  apiKey: z.string().min(1),
});

const cohereSchema = baseProviderSchema.extend({
  provider: z.literal('cohere'),
  apiKey: z.string().min(1),
});

const bedrockSchema = baseProviderSchema.extend({
  provider: z.literal('bedrock'),
  region: z.string().min(1),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
});

const vertexaiSchema = baseProviderSchema.extend({
  provider: z.literal('vertexai'),
  project: z.string().min(1),
  location: z.string().optional(),
});

export const ProviderConfigSchema = z.discriminatedUnion('provider', [
  openaiCompatCloudSchema,
  azureSchema,
  localSchema,
  deepseekSchema,
  anthropicSchema,
  geminiSchema,
  cohereSchema,
  bedrockSchema,
  vertexaiSchema,
]);

export type ValidatedProviderConfig = z.infer<typeof ProviderConfigSchema>;
