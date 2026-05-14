import { UnsupportedOperationError } from '../errors/index.js';
import type { ProviderDefinition } from '../provider-registry/registry.js';
import type { ProviderProtocol, ToolDefinition, ToolResult } from '../protocols/types.js';
import type { ModelConfig } from '../types/config.types.js';
import type { Logger } from '../types/logger.js';
import type { LLMCallParams, LLMResponse, StreamChunk } from '../types/provider.types.js';
import type { ResolvedRetryStrategy } from '../types/retry.types.js';
import { BaseLLMProvider } from './base.provider.js';

export class UnifiedProvider extends BaseLLMProvider {
  constructor(
    config: ModelConfig,
    private readonly protocol: ProviderProtocol,
    private readonly definition: ProviderDefinition,
    logger: Logger,
    retry: ResolvedRetryStrategy
  ) {
    super(config, logger, retry);
  }

  protected async callAPI(params: LLMCallParams): Promise<LLMResponse> {
    try {
      const client = this.protocol.createClient(this.config, this.definition);
      const request = this.protocol.formatRequest(params, this.config);
      const raw = await this.protocol.callRaw(client, request);
      const result = this.protocol.extractResponse(raw, params);
      return this.definition.costFactor === 0 ? { ...result, cost: 0 } : result;
    } catch (err) {
      throw this.protocol.mapError(err, this.config);
    }
  }

  protected async callAPIWithTools(params: LLMCallParams, tools: ToolDefinition[]): Promise<LLMResponse> {
    try {
      const client = this.protocol.createClient(this.config, this.definition);
      const nativeTools = this.protocol.formatTools(tools);
      const request = this.protocol.formatRequestWithTools
        ? this.protocol.formatRequestWithTools(params, this.config, nativeTools)
        : { ...(this.protocol.formatRequest(params, this.config) as object), tools: nativeTools };

      const raw = await this.protocol.callRaw(client, request);
      const toolCalls = this.protocol.extractToolCalls(raw);
      const result = this.protocol.extractResponse(raw, params);
      const response = toolCalls.length > 0 ? { ...result, toolCalls } : result;
      return this.definition.costFactor === 0 ? { ...response, cost: 0 } : response;
    } catch (err) {
      throw this.protocol.mapError(err, this.config);
    }
  }

  protected buildFollowUpParams(original: LLMCallParams, raw: unknown, results: ToolResult[]): LLMCallParams {
    return this.protocol.formatFollowUp(original, raw, results);
  }

  protected async *streamAPI(params: LLMCallParams): AsyncGenerator<StreamChunk> {
    if (!this.protocol.stream) {
      throw new UnsupportedOperationError('streaming', this.config.provider);
    }

    const client = this.protocol.createClient(this.config, this.definition);
    const request = this.protocol.formatRequest(params, this.config);
    try {
      yield* this.protocol.stream(client, request);
    } catch (err) {
      throw this.protocol.mapError(err, this.config);
    }
  }
}
