import { z } from 'zod';
import { ProviderConfigSchema } from '../provider-registry/schema.js';
import type { Logger } from '../types/logger.js';
import type { ToolDefinition } from '../protocols/types.js';
import type { ResponseFormat, RetryConfig } from './types.js';
import type { ToolPolicy } from './adapters/tool-policy.js';
import type { ProviderModel } from './provider-catalog.js';
import type { AgentCacheController } from './creator/types.js';

export interface AgentCreateConfig {
  model: ProviderModel | (string & {});
  apiKey?: string;
  name?: string;
  system?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  responseFormat?: ResponseFormat;
  tools?: ToolDefinition[];
  toolPolicy?: ToolPolicy;
  retry?: RetryConfig;
  logger?: Logger;
  endpoint?: string;
  deployment?: string;
  apiVersion?: string;
  organizationId?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  project?: string;
  location?: string;
  baseUrl?: string;
  cache?: AgentCacheController;
  skillActivation?: 'always' | 'auto' | 'directive-only';
  toolSelection?: 'all' | 'auto';
}

export const AGENT_DEFAULTS = {
  temperature: 0.7,
  timeout: 120_000,
  responseFormat: { type: 'text' as const },
  retry: {
    maxAttempts: 3,
    backoff: 'exponential' as const,
    initialDelay: 1_000,
    maxDelay: 60_000,
  },
  tools: [],
  skillActivation: 'always',
  toolSelection: 'all',
} satisfies Partial<AgentCreateConfig>;

const retrySchema = z.object({
  maxAttempts: z.number().int().min(1).max(10),
  backoff: z.enum(['exponential', 'linear', 'fixed']),
  initialDelay: z.number().positive(),
  maxDelay: z.number().positive(),
});

const agentLevelSchema = z.object({
  name: z.string().min(1).optional(),
  system: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  maxTokens: z.number().positive().int().optional(),
  timeout: z.number().positive().optional(),
  topP: z.number().min(0).max(1).optional(),
  frequencyPenalty: z.number().min(-2).max(2).optional(),
  presencePenalty: z.number().min(-2).max(2).optional(),
  stopSequences: z.array(z.string()).max(4).optional(),
  responseFormat: z.object({ type: z.enum(['text', 'json_object']) }).optional(),
  retry: retrySchema.optional(),
  toolPolicy: z.custom<ToolPolicy>().optional(),
  cache: z.custom<AgentCacheController>().optional(),
  skillActivation: z.enum(['always', 'auto', 'directive-only']).optional(),
  toolSelection: z.enum(['all', 'auto']).optional(),
});

export const AgentConfigSchema = ProviderConfigSchema.and(agentLevelSchema);
export type ValidatedAgentConfig = z.infer<typeof AgentConfigSchema>;
