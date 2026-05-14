import {
  RateLimitError,
  RetryExhaustedError,
  ToolExecutionError,
  isRetryableError,
} from '../errors/index.js';
import type { ToolDefinition, ToolResult } from '../protocols/types.js';
import type { ModelConfig } from '../types/config.types.js';
import type { Logger } from '../types/logger.js';
import type { LLMCallParams, LLMResponse, StreamChunk, ToolCallResult } from '../types/provider.types.js';
import type { ResolvedRetryStrategy } from '../types/retry.types.js';
import { sleep } from '../utils/sleep.js';

const MAX_TOOL_LOOPS = 5;

export abstract class BaseLLMProvider {
  protected constructor(
    protected readonly config: ModelConfig,
    protected readonly logger: Logger,
    protected readonly retryStrategy: ResolvedRetryStrategy
  ) {}

  protected abstract callAPI(params: LLMCallParams): Promise<LLMResponse>;

  protected abstract callAPIWithTools(params: LLMCallParams, tools: ToolDefinition[]): Promise<LLMResponse>;

  protected abstract buildFollowUpParams(
    original: LLMCallParams,
    raw: unknown,
    results: ToolResult[]
  ): LLMCallParams;

  protected abstract streamAPI(params: LLMCallParams): AsyncGenerator<StreamChunk>;

  async call(params: LLMCallParams): Promise<LLMResponse> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryStrategy.maxAttempts; attempt++) {
      try {
        const response = await this.callAPI(params);
        return { ...response, latency: Date.now() - startTime };
      } catch (error) {
        lastError = error as Error;
        if (!isRetryableError(lastError) || attempt >= this.retryStrategy.maxAttempts) break;
        await sleep(this.calcBackoff(attempt, lastError));
      }
    }

    throw new RetryExhaustedError(lastError!, this.retryStrategy.maxAttempts, {
      provider: this.config.provider,
      model: this.config.model,
    });
  }

  async callWithTools(params: LLMCallParams, tools: ToolDefinition[]): Promise<LLMResponse> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.retryStrategy.maxAttempts; attempt++) {
      try {
        const response = await this.callWithToolLoopDynamic(params, tools);
        return { ...response, latency: Date.now() - startTime };
      } catch (error) {
        lastError = error as Error;
        if (!isRetryableError(lastError) || attempt >= this.retryStrategy.maxAttempts) break;
        await sleep(this.calcBackoff(attempt, lastError));
      }
    }

    throw new RetryExhaustedError(lastError!, this.retryStrategy.maxAttempts, {
      provider: this.config.provider,
      model: this.config.model,
    });
  }

  /**
   * Streams the LLM response as an async generator of chunks.
   *
   * **Streaming does not retry.** If the connection fails mid-stream, partial tokens
   * have already been yielded to the caller, so retrying would produce duplicate or
   * incoherent output. Errors surface as typed AgentCraftErrors.
   *
   * For retry-on-failure before the first token, use AgentPool with a fallback Agent.
   */
  stream(params: LLMCallParams): AsyncGenerator<StreamChunk> {
    return this.streamAPI(params);
  }

  async *streamWithTools(params: LLMCallParams, tools: ToolDefinition[]): AsyncGenerator<StreamChunk> {
    const response = yield* this.streamWithToolLoopDynamic(params, tools);
    if (response.content) {
      yield { delta: response.content };
    }
    yield {
      delta: '',
      finishReason: response.finishReason,
      usage: response.tokensUsed,
    };
  }

  private async *streamWithToolLoopDynamic(
    params: LLMCallParams,
    tools: ToolDefinition[]
  ): AsyncGenerator<StreamChunk, LLMResponse, unknown> {
    let loopCount = 0;
    let current = await this.callAPIWithTools(params, tools);

    while (current.toolCalls && current.toolCalls.length > 0 && loopCount < MAX_TOOL_LOOPS) {
      loopCount++;
      const rawResults: ToolCallResult[] = [];

      for (const toolCall of current.toolCalls) {
        yield { delta: '', toolCall };

        const tool = tools.find((candidate) => candidate.name === toolCall.name);
        if (!tool) {
          throw new ToolExecutionError(`Unknown tool: '${toolCall.name}'`, { toolNames: [toolCall.name] });
        }

        try {
          const args = JSON.parse(toolCall.arguments) as Record<string, unknown>;
          validateToolArguments(tool, args);
          const output = await tool.execute(args);
          const result = {
            toolCallId: toolCall.id,
            toolName: toolCall.name,
            content: JSON.stringify(output),
            success: true,
          } satisfies ToolCallResult;
          rawResults.push(result);
          yield { delta: '', toolResult: result };
        } catch (toolErr) {
          throw new ToolExecutionError(`Tool execution failed: ${(toolErr as Error).message}`, {
            toolNames: current.toolCalls.map((item) => item.name),
            cause: (toolErr as Error).message,
          });
        }
      }

      const toolResults: ToolResult[] = rawResults.map((result, index) => ({
        toolCallId: result.toolCallId,
        toolName: result.toolName,
        result: result.content,
        arguments: current.toolCalls![index]!.arguments,
      }));

      const followUp = this.buildFollowUpParams(params, current._raw ?? current, toolResults);
      current = await this.callAPIWithTools(followUp, tools);
    }

    return current;
  }

  protected calcBackoff(attempt: number, error: Error): number {
    const retryAfter = error instanceof RateLimitError ? error.retryAfterSeconds : 0;
    if (retryAfter > 0) return retryAfter * 1_000;

    const exponential = this.retryStrategy.initialDelay * this.retryStrategy.backoffMultiplier ** (attempt - 1);
    const capped = Math.min(exponential, this.retryStrategy.maxDelay);
    if (!this.retryStrategy.jitter) return capped;

    const jitterFactor = 0.8 + Math.random() * 0.4;
    return Math.round(capped * jitterFactor);
  }

  private async callWithToolLoopDynamic(
    params: LLMCallParams,
    tools: ToolDefinition[]
  ): Promise<LLMResponse> {
    let loopCount = 0;
    let current = await this.callAPIWithTools(params, tools);

    while (current.toolCalls && current.toolCalls.length > 0 && loopCount < MAX_TOOL_LOOPS) {
      loopCount++;
      let rawResults: ToolCallResult[];

      try {
        rawResults = await Promise.all(
          current.toolCalls.map(async (toolCall) => {
            const tool = tools.find((candidate) => candidate.name === toolCall.name);
            if (!tool) {
              throw new ToolExecutionError(`Unknown tool: '${toolCall.name}'`, { toolNames: [toolCall.name] });
            }

            const args = JSON.parse(toolCall.arguments) as Record<string, unknown>;
            validateToolArguments(tool, args);
            const output = await tool.execute(args);
            return {
              toolCallId: toolCall.id,
              toolName: toolCall.name,
              content: JSON.stringify(output),
              success: true,
            } satisfies ToolCallResult;
          })
        );
      } catch (toolErr) {
        throw new ToolExecutionError(`Tool execution failed: ${(toolErr as Error).message}`, {
          toolNames: current.toolCalls.map((toolCall) => toolCall.name),
          cause: (toolErr as Error).message,
        });
      }

      const toolResults: ToolResult[] = rawResults.map((result, index) => ({
        toolCallId: result.toolCallId,
        toolName: result.toolName,
        result: result.content,
        arguments: current.toolCalls![index]!.arguments,
      }));

      const followUp = this.buildFollowUpParams(params, current._raw ?? current, toolResults);
      current = await this.callAPIWithTools(followUp, tools);
    }

    return current;
  }
}

function validateToolArguments(tool: ToolDefinition, args: Record<string, unknown>): void {
  for (const required of tool.parameters.required) {
    if (args[required] === undefined) {
      throw new ToolExecutionError(`Tool '${tool.name}' missing required argument '${required}'`, {
        toolName: tool.name,
        argument: required,
      });
    }
  }

  for (const [name, schema] of Object.entries(tool.parameters.properties)) {
    const value = args[name];
    if (value === undefined) continue;
    const type = schema.type;
    const valid =
      (type === 'array' && Array.isArray(value)) ||
      (type === 'object' && value !== null && typeof value === 'object' && !Array.isArray(value)) ||
      (type !== 'array' && type !== 'object' && typeof value === type);

    if (!valid) {
      throw new ToolExecutionError(`Tool '${tool.name}' argument '${name}' must be ${type}`, {
        toolName: tool.name,
        argument: name,
        expectedType: type,
      });
    }

    if (schema.enum && !schema.enum.includes(String(value))) {
      throw new ToolExecutionError(`Tool '${tool.name}' argument '${name}' must be one of: ${schema.enum.join(', ')}`, {
        toolName: tool.name,
        argument: name,
      });
    }
  }
}
