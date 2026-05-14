import type { ResponseFormat } from './provider.types.js';

export interface BaseModelConfig {
  name?: string;
  model: string;
  timeout?: number;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  responseFormat?: ResponseFormat;
}

export interface OpenAIModelConfig extends BaseModelConfig {
  provider: 'openai';
  apiKey: string;
  baseUrl?: string;
  organizationId?: string;
}

export interface OpenAICompatCloudConfig extends BaseModelConfig {
  provider:
    | 'groq'
    | 'mistral'
    | 'together'
    | 'fireworks'
    | 'perplexity'
    | 'openrouter'
    | 'anyscale'
    | 'novita'
    | 'xai'
    | 'cerebras';
  apiKey: string;
  baseUrl?: string;
}

export interface AzureModelConfig extends BaseModelConfig {
  provider: 'azure';
  apiKey: string;
  endpoint: string;
  deployment: string;
  apiVersion?: string;
}

export interface LocalOpenAICompatConfig extends BaseModelConfig {
  provider: 'ollama' | 'lmstudio' | 'vllm' | 'localai';
  baseUrl?: string;
}

export interface DeepSeekModelConfig extends BaseModelConfig {
  provider: 'deepseek';
  apiKey: string;
  baseUrl?: string;
}

export interface AnthropicModelConfig extends BaseModelConfig {
  provider: 'anthropic';
  apiKey: string;
}

export interface GeminiModelConfig extends BaseModelConfig {
  provider: 'gemini';
  apiKey: string;
}

export interface CohereModelConfig extends BaseModelConfig {
  provider: 'cohere';
  apiKey: string;
}

export interface BedrockModelConfig extends BaseModelConfig {
  provider: 'bedrock';
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export interface VertexAIModelConfig extends BaseModelConfig {
  provider: 'vertexai';
  project: string;
  location?: string;
}

export type ModelConfig =
  | OpenAIModelConfig
  | OpenAICompatCloudConfig
  | AzureModelConfig
  | LocalOpenAICompatConfig
  | DeepSeekModelConfig
  | AnthropicModelConfig
  | GeminiModelConfig
  | CohereModelConfig
  | BedrockModelConfig
  | VertexAIModelConfig;

export type ProviderType = ModelConfig['provider'];

export type BestFitCriteria = 'cost' | 'speed' | 'quality';
