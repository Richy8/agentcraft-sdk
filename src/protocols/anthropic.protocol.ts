import Anthropic from '@anthropic-ai/sdk';
import type { AgentCraftError } from '../errors/index.js';
import type { ProviderDefinition } from '../provider-registry/registry.js';
import type { AnthropicModelConfig, ModelConfig } from '../types/config.types.js';
import type { FinishReason, LLMCallParams, LLMResponse, StreamChunk, ToolCall } from '../types/provider.types.js';
import { mapCommonError } from './shared/map-error.js';
import type { ProviderProtocol, ToolDefinition, ToolResult } from './types.js';

type AnthropicState = { messages: Anthropic.MessageParam[] };

function mapAnthropicFinishReason(reason: string | null | undefined): FinishReason {
  if (reason === 'max_tokens') return 'length';
  if (reason === 'tool_use') return 'tool_calls';
  return 'stop';
}

export class AnthropicProtocol implements ProviderProtocol {
  createClient(config: ModelConfig, _definition: ProviderDefinition): Anthropic {
    return new Anthropic({ apiKey: (config as AnthropicModelConfig).apiKey });
  }

  formatRequest(params: LLMCallParams, config: ModelConfig): Anthropic.MessageCreateParamsNonStreaming {
    const state = params._providerState as AnthropicState | undefined;
    const request: Anthropic.MessageCreateParamsNonStreaming = {
      model: config.model,
      max_tokens: params.maxTokens ?? 1024,
      messages: [...(state?.messages ?? []), { role: 'user', content: params.prompt }],
    };

    if (params.systemMessage !== undefined) request.system = params.systemMessage;
    if (params.temperature !== undefined) request.temperature = params.temperature;
    if (params.topP !== undefined) request.top_p = params.topP;
    if (params.stopSequences !== undefined) request.stop_sequences = params.stopSequences;

    return request;
  }

  formatRequestWithTools(params: LLMCallParams, config: ModelConfig, nativeTools: unknown): Anthropic.MessageCreateParamsNonStreaming {
    return {
      ...this.formatRequest(params, config),
      tools: nativeTools as Anthropic.Tool[],
    };
  }

  async callRaw(client: unknown, nativeRequest: unknown): Promise<unknown> {
    return (client as Anthropic).messages.create(nativeRequest as Anthropic.MessageCreateParamsNonStreaming);
  }

  extractResponse(raw: unknown): LLMResponse {
    const response = raw as Anthropic.Message;
    const content = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    return {
      success: true,
      content,
      tokensUsed: {
        prompt: response.usage.input_tokens,
        completion: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens,
      },
      finishReason: mapAnthropicFinishReason(response.stop_reason),
      toolCalls: this.extractToolCalls(raw),
      _raw: raw,
    };
  }

  formatTools(tools: ToolDefinition[]): Anthropic.Tool[] {
    return tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: tool.parameters.properties,
        required: tool.parameters.required,
      },
    }));
  }

  extractToolCalls(raw: unknown): ToolCall[] {
    const response = raw as Anthropic.Message;
    return response.content
      .filter((block): block is Anthropic.ToolUseBlock => block.type === 'tool_use')
      .map((block) => ({
        id: block.id,
        name: block.name,
        arguments: JSON.stringify(block.input),
      }));
  }

  formatFollowUp(original: LLMCallParams, raw: unknown, results: ToolResult[]): LLMCallParams {
    const response = raw as Anthropic.Message;
    const state = (original._providerState ?? { messages: [] }) as AnthropicState;

    const assistantTurn: Anthropic.MessageParam = { role: 'assistant', content: response.content };
    const userTurn: Anthropic.MessageParam = {
      role: 'user',
      content: results.map((result) => ({
        type: 'tool_result',
        tool_use_id: result.toolCallId,
        content: result.result,
      })),
    };

    return {
      ...original,
      _providerState: {
        messages: [...state.messages, assistantTurn, userTurn],
      } satisfies AnthropicState,
    };
  }

  async *stream(client: unknown, nativeRequest: unknown): AsyncGenerator<StreamChunk> {
    const stream = (client as Anthropic).messages.stream(nativeRequest as Anthropic.MessageCreateParamsNonStreaming);
    const toolBlocks = new Map<number, { id: string; name: string; arguments: string }>();

    for await (const event of stream) {
      if (event.type === 'content_block_start' && event.content_block.type === 'tool_use') {
        toolBlocks.set(event.index, {
          id: event.content_block.id,
          name: event.content_block.name,
          arguments: JSON.stringify(event.content_block.input ?? {}),
        });
        yield { delta: '', toolCall: toolBlocks.get(event.index)! };
      }
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { delta: event.delta.text };
      }
      if (event.type === 'content_block_delta' && event.delta.type === 'input_json_delta') {
        const current = toolBlocks.get(event.index) ?? { id: `anthropic-${event.index}`, name: '', arguments: '' };
        current.arguments += event.delta.partial_json;
        toolBlocks.set(event.index, current);
        yield { delta: '', toolCall: current };
      }
      if (event.type === 'message_delta') {
        if (event.delta.stop_reason) {
          yield { delta: '', finishReason: mapAnthropicFinishReason(event.delta.stop_reason) };
        }
        if (event.usage) {
          const completion = event.usage.output_tokens;
          yield { delta: '', usage: { prompt: 0, completion, total: completion } };
        }
      }
      if (event.type === 'message_stop') {
        yield { delta: '', finishReason: 'stop' };
      }
    }
  }

  mapError(err: unknown, config: ModelConfig): AgentCraftError {
    return mapCommonError(err, config);
  }
}
