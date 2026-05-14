import { describe, expect, it } from 'vitest';
import { RetryExhaustedError, ToolExecutionError } from '../../errors/index.js';
import type { ToolDefinition, ToolResult } from '../../protocols/types.js';
import type { ModelConfig } from '../../types/config.types.js';
import type { Logger } from '../../types/logger.js';
import type { LLMCallParams, LLMResponse, StreamChunk } from '../../types/provider.types.js';
import { DEFAULT_RETRY_STRATEGY } from '../../types/retry.types.js';
import { BaseLLMProvider } from '../base.provider.js';

const logger: Logger = {
  debug: () => undefined,
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const config: ModelConfig = { provider: 'openai', model: 'gpt-4o', apiKey: 'key' };

class ToolLoopProvider extends BaseLLMProvider {
  readonly raw = { native: true };
  seenResults: ToolResult[] = [];
  private calls = 0;

  constructor() {
    super(config, logger, { ...DEFAULT_RETRY_STRATEGY, maxAttempts: 1 });
  }

  protected async callAPI(): Promise<LLMResponse> {
    return this.finalResponse();
  }

  protected async callAPIWithTools(): Promise<LLMResponse> {
    this.calls++;
    if (this.calls === 1) {
      return {
        ...this.finalResponse(),
        toolCalls: [{ id: 'call-1', name: 'sum', arguments: '{"a":2,"b":3}' }],
        _raw: this.raw,
      };
    }
    return this.finalResponse();
  }

  protected buildFollowUpParams(original: LLMCallParams, raw: unknown, results: ToolResult[]): LLMCallParams {
    expect(raw).toBe(this.raw);
    this.seenResults = results;
    return original;
  }

  protected async *streamAPI(): AsyncGenerator<StreamChunk> {
    yield { delta: '' };
  }

  private finalResponse(): LLMResponse {
    return {
      success: true,
      content: 'done',
      tokensUsed: { prompt: 1, completion: 1, total: 2 },
      finishReason: 'stop',
    };
  }
}

class FailingProvider extends ToolLoopProvider {
  protected override async callAPI(): Promise<LLMResponse> {
    throw new Error('boom');
  }
}

describe('BaseLLMProvider', () => {
  it('executes dynamic tools and maps ToolResult arguments for follow-up state', async () => {
    const provider = new ToolLoopProvider();
    const tools: ToolDefinition[] = [
      {
        name: 'sum',
        description: 'Adds numbers',
        parameters: { type: 'object', properties: {}, required: [] },
        execute: async (args) => Number(args.a) + Number(args.b),
      },
    ];

    await expect(provider.callWithTools({ prompt: 'add' }, tools)).resolves.toMatchObject({ content: 'done' });
    expect(provider.seenResults).toEqual([
      { toolCallId: 'call-1', toolName: 'sum', result: '5', arguments: '{"a":2,"b":3}' },
    ]);
  });

  it('wraps tool failures in ToolExecutionError', async () => {
    const provider = new ToolLoopProvider();

    await expect(provider.callWithTools({ prompt: 'add' }, [])).rejects.toMatchObject({
      cause: expect.any(ToolExecutionError),
    });
  });

  it('validates tool arguments before execution', async () => {
    const provider = new ToolLoopProvider();
    const tools: ToolDefinition[] = [
      {
        name: 'sum',
        description: 'Adds numbers',
        parameters: {
          type: 'object',
          properties: { a: { type: 'string' }, b: { type: 'number' } },
          required: ['a', 'b'],
        },
        execute: async () => 'should-not-run',
      },
    ];

    await expect(provider.callWithTools({ prompt: 'add' }, tools)).rejects.toMatchObject({
      cause: expect.any(ToolExecutionError),
    });
  });

  it('throws RetryExhaustedError after call attempts are spent', async () => {
    await expect(new FailingProvider().call({ prompt: 'hi' })).rejects.toBeInstanceOf(RetryExhaustedError);
  });

  it('streams final content after completing the tool loop', async () => {
    const provider = new ToolLoopProvider();
    const tools: ToolDefinition[] = [
      {
        name: 'sum',
        description: 'Adds numbers',
        parameters: { type: 'object', properties: {}, required: [] },
        execute: async (args) => Number(args.a) + Number(args.b),
      },
    ];

    const chunks: StreamChunk[] = [];
    for await (const chunk of provider.streamWithTools({ prompt: 'add' }, tools)) {
      chunks.push(chunk);
    }

    expect(chunks).toEqual([
      { delta: '', toolCall: { id: 'call-1', name: 'sum', arguments: '{"a":2,"b":3}' } },
      { delta: '', toolResult: { toolCallId: 'call-1', toolName: 'sum', content: '5', success: true } },
      { delta: 'done' },
      { delta: '', finishReason: 'stop', usage: { prompt: 1, completion: 1, total: 2 } },
    ]);
    expect(provider.seenResults).toEqual([
      { toolCallId: 'call-1', toolName: 'sum', result: '5', arguments: '{"a":2,"b":3}' },
    ]);
  });
});
