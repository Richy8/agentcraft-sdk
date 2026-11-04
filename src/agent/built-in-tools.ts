import { createAdapter } from './adapters/types.js';
import type { AgentAdapter } from './adapters/types.js';
import type { ToolDefinition } from '../protocols/types.js';

export interface WebSearchConfig {
  contextSize?: 'low' | 'medium' | 'high';
  allowedDomains?: string[];
  blockedDomains?: string[];
  userLocation?: { country?: string; city?: string; timezone?: string };
}

export interface FileSearchConfig {
  vectorStoreId: string;
  maxResults?: number;
  filters?: Record<string, unknown>;
}

function nativeToolDefinition(spec: NonNullable<ToolDefinition['nativeSpec']>): ToolDefinition {
  return {
    name: spec.type,
    description: `Provider-native ${spec.type} tool`,
    parameters: { type: 'object', properties: {}, required: [] },
    nativeSpec: spec,
    execute: async () => {
      throw new Error(`Native tool '${spec.type}' is executed by the provider, not the SDK.`);
    },
  };
}

export const BuiltInTools = {
  webSearch(config: WebSearchConfig = {}): AgentAdapter {
    const toolDef = nativeToolDefinition({
      type: 'web_search',
      search_context_size: config.contextSize,
      ...(config.allowedDomains && { allowed_domains: config.allowedDomains }),
      ...(config.blockedDomains && { blocked_domains: config.blockedDomains }),
      ...(config.userLocation && { user_location: config.userLocation }),
    });

    return createAdapter({
      name: 'web-search',
      requires: [],
      metadata: {
        kind: 'native-provider',
        nativeToolType: 'web_search',
        nativeToolConfig: config as Record<string, unknown>,
        trustLevel: 'trusted',
        sideEffects: ['external'],
        scopes: ['web.search'],
      },
      getTools: async () => [toolDef],
    });
  },

  fileSearch(config: FileSearchConfig): AgentAdapter {
    const toolDef = nativeToolDefinition({
      type: 'file_search',
      vector_store_ids: [config.vectorStoreId],
      ...(config.maxResults !== undefined && { max_num_results: config.maxResults }),
      ...(config.filters !== undefined && { filters: config.filters }),
    });

    return createAdapter({
      name: 'file-search',
      requires: [],
      metadata: {
        kind: 'native-provider',
        nativeToolType: 'file_search',
        nativeToolConfig: config as unknown as Record<string, unknown>,
        trustLevel: 'trusted',
        sideEffects: ['read'],
        scopes: ['files.search'],
      },
      getTools: async () => [toolDef],
    });
  },
};
