import type { AgentCraftError } from '../errors/index.js';
import type { ProviderDefinition } from '../provider-registry/registry.js';
import type { ModelConfig } from '../types/config.types.js';
import type { LLMCallParams, LLMResponse, StreamChunk, ToolCall } from '../types/provider.types.js';

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description?: string; enum?: string[] }>;
    required: string[];
  };
  security?: {
    sideEffect: 'none' | 'read' | 'write' | 'external';
    requiresConfirmation?: boolean;
    scopes?: string[];
  };
  execute(args: Record<string, unknown>): Promise<unknown>;
}

export interface ToolResult {
  toolCallId: string;
  toolName: string;
  result: string;
  arguments: string;
}

export interface ProviderProtocol {
  createClient(config: ModelConfig, definition: ProviderDefinition): unknown;
  formatRequest(params: LLMCallParams, config: ModelConfig): unknown;
  formatRequestWithTools?(params: LLMCallParams, config: ModelConfig, nativeTools: unknown): unknown;
  callRaw(client: unknown, nativeRequest: unknown): Promise<unknown>;
  extractResponse(raw: unknown, params: LLMCallParams): LLMResponse;
  formatTools(tools: ToolDefinition[]): unknown;
  extractToolCalls(raw: unknown): ToolCall[];
  formatFollowUp(original: LLMCallParams, raw: unknown, results: ToolResult[]): LLMCallParams;
  stream?(client: unknown, nativeRequest: unknown): AsyncGenerator<StreamChunk>;
  mapError(err: unknown, config: ModelConfig): AgentCraftError;
}
