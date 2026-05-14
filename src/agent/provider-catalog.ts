export const Provider = {
  openai: {
    'gpt-5.5': 'openai:gpt-5.5',
    'gpt-5.4': 'openai:gpt-5.4',
    'gpt-5.4-mini': 'openai:gpt-5.4-mini',
    'gpt-5.4-nano': 'openai:gpt-5.4-nano',
    'gpt-5.3-codex': 'openai:gpt-5.3-codex',
    'gpt-4o': 'openai:gpt-4o',
    'gpt-4o-mini': 'openai:gpt-4o-mini',
    o1: 'openai:o1',
    o3: 'openai:o3',
    'o4-mini': 'openai:o4-mini',
    'o3-deep-research': 'openai:o3-deep-research',
    'o4-mini-deep-research': 'openai:o4-mini-deep-research',
  },
  anthropic: {
    'claude-opus-4-7': 'anthropic:claude-opus-4-7',
    'claude-opus-4-6': 'anthropic:claude-opus-4-6',
    'claude-sonnet-4-6': 'anthropic:claude-sonnet-4-6',
    'claude-sonnet-4-5': 'anthropic:claude-sonnet-4-5',
    'claude-haiku-4-5': 'anthropic:claude-haiku-4-5',
  },
  gemini: {
    'gemini-3.1-pro-preview': 'gemini:gemini-3.1-pro-preview',
    'gemini-3-flash-preview': 'gemini:gemini-3-flash-preview',
    'gemini-3.1-flash-lite-preview': 'gemini:gemini-3.1-flash-lite-preview',
    'gemini-2.5-pro': 'gemini:gemini-2.5-pro',
    'gemini-2.5-flash': 'gemini:gemini-2.5-flash',
    'gemini-2.5-flash-lite': 'gemini:gemini-2.5-flash-lite',
  },
  deepseek: {
    'deepseek-v4': 'deepseek:deepseek-v4',
    'deepseek-v4-flash': 'deepseek:deepseek-v4-flash',
    'deepseek-v4-pro': 'deepseek:deepseek-v4-pro',
    'deepseek-r1': 'deepseek:deepseek-r1',
  },
  xai: {
    'grok-4-3': 'xai:grok-4-3',
    'grok-4-20': 'xai:grok-4-20',
    'grok-4-1-fast': 'xai:grok-4-1-fast',
    'grok-4': 'xai:grok-4',
    'grok-3': 'xai:grok-3',
    'grok-3-mini': 'xai:grok-3-mini',
  },
  groq: {
    'llama-4-scout-17b': 'groq:llama-4-scout-17b',
    'qwen3-32b': 'groq:qwen3-32b',
    'gpt-oss-20b': 'groq:gpt-oss-20b',
    'gpt-oss-120b': 'groq:gpt-oss-120b',
    'llama-3.3-70b-versatile': 'groq:llama-3.3-70b-versatile',
    'llama-3.1-8b-instant': 'groq:llama-3.1-8b-instant',
  },
  mistral: {
    'mistral-large-latest': 'mistral:mistral-large-latest',
    'mistral-small-latest': 'mistral:mistral-small-latest',
    'mistral-nemo': 'mistral:mistral-nemo',
    'codestral-latest': 'mistral:codestral-latest',
  },
  cohere: {
    'command-r-plus-08-2024': 'cohere:command-r-plus-08-2024',
    'command-r-08-2024': 'cohere:command-r-08-2024',
    'command-r7b-12-2024': 'cohere:command-r7b-12-2024',
  },
  perplexity: {
    'sonar-pro': 'perplexity:sonar-pro',
    sonar: 'perplexity:sonar',
  },
  cerebras: {
    'llama3.1-70b': 'cerebras:llama3.1-70b',
    'llama3.1-8b': 'cerebras:llama3.1-8b',
  },
  bedrock: {
    'anthropic.claude-3-7-sonnet': 'bedrock:anthropic.claude-3-7-sonnet-20250219-v1:0',
    'meta.llama3-3-70b': 'bedrock:meta.llama3-3-70b-instruct-v1:0',
    'mistral.mistral-large': 'bedrock:mistral.mistral-large-2402-v1:0',
  },
  vertexai: {
    'gemini-2.5-pro': 'vertexai:gemini-2.5-pro',
    'gemini-2.5-flash': 'vertexai:gemini-2.5-flash',
  },
  together: {
    'meta-llama/Llama-3.3-70B-Instruct-Turbo': 'together:meta-llama/Llama-3.3-70B-Instruct-Turbo',
  },
  fireworks: {
    'llama-v3p1-70b-instruct': 'fireworks:accounts/fireworks/models/llama-v3p1-70b-instruct',
  },
  anyscale: {
    'meta-llama/Llama-3.1-70B-Instruct': 'anyscale:meta-llama/Llama-3.1-70B-Instruct',
  },
  novita: {
    'meta-llama/llama-3.1-70b-instruct': 'novita:meta-llama/llama-3.1-70b-instruct',
  },
  openrouter: {
    'anthropic/claude-sonnet-4.5': 'openrouter:anthropic/claude-sonnet-4.5',
  },
  azure: {
    deployment: 'azure:deployment',
  },
  ollama: {
    'llama3.2': 'ollama:llama3.2',
    'deepseek-r1': 'ollama:deepseek-r1',
    mistral: 'ollama:mistral',
    phi4: 'ollama:phi4',
  },
  lmstudio: {
    default: 'lmstudio:default',
  },
  vllm: {
    default: 'vllm:default',
  },
  localai: {
    default: 'localai:default',
  },
} as const;

export type ProviderGroups = typeof Provider;
export type ProviderModel = {
  [K in keyof ProviderGroups]: ProviderGroups[K][keyof ProviderGroups[K]];
}[keyof ProviderGroups];
