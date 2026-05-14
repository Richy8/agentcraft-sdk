import type { ToolDefinition, ToolResult } from '../protocols/types.js';
import { BaseLLMProvider } from '../providers/base.provider.js';
import type { ModelConfig } from '../types/config.types.js';
import type { Logger } from '../types/logger.js';
import type { LLMCallParams, LLMResponse, StreamChunk } from '../types/provider.types.js';
import { DEFAULT_RETRY_STRATEGY } from '../types/retry.types.js';

const logger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

export interface FakeProviderStep {
  response: LLMResponse;
  stream?: StreamChunk[];
}

export class DeterministicFakeProvider extends BaseLLMProvider {
  readonly calls: LLMCallParams[] = [];
  readonly toolCalls: Array<{ params: LLMCallParams; tools: ToolDefinition[] }> = [];
  readonly followUps: ToolResult[][] = [];
  private index = 0;

  constructor(
    private readonly steps: FakeProviderStep[],
    config: ModelConfig = { provider: 'ollama', model: 'fake' }
  ) {
    super(config, logger, { ...DEFAULT_RETRY_STRATEGY, maxAttempts: 1 });
  }

  protected async callAPI(params: LLMCallParams): Promise<LLMResponse> {
    this.calls.push(params);
    return this.next().response;
  }

  protected async callAPIWithTools(params: LLMCallParams, tools: ToolDefinition[]): Promise<LLMResponse> {
    this.toolCalls.push({ params, tools });
    return this.next().response;
  }

  protected buildFollowUpParams(original: LLMCallParams, _raw: unknown, results: ToolResult[]): LLMCallParams {
    this.followUps.push(results);
    return { ...original, _providerState: { toolResults: results } };
  }

  protected async *streamAPI(): AsyncGenerator<StreamChunk> {
    for (const chunk of this.next().stream ?? []) yield chunk;
  }

  private next(): FakeProviderStep {
    const step = this.steps[Math.min(this.index, this.steps.length - 1)];
    this.index++;
    if (!step) {
      return {
        response: {
          success: true,
          content: '',
          tokensUsed: { prompt: 0, completion: 0, total: 0 },
          finishReason: 'stop',
        },
      };
    }
    return step;
  }
}
