import { describe, expect, it, vi } from 'vitest';
import { AuthenticationError, ContextWindowError, ModelNotFoundError, QuotaExceededError, RateLimitError, TimeoutError } from '../../errors/index.js';
import type { ModelConfig } from '../../types/config.types.js';
import type { LLMCallParams } from '../../types/provider.types.js';
import { AnthropicProtocol } from '../anthropic.protocol.js';
import { BedrockProtocol } from '../bedrock.protocol.js';
import { GoogleProtocol } from '../google.protocol.js';
import { OpenAICompatProtocol } from '../openai-compat.protocol.js';
import type { ToolDefinition } from '../types.js';

const tool: ToolDefinition = {
  name: 'get_weather',
  description: 'Get weather',
  parameters: {
    type: 'object',
    properties: { city: { type: 'string', description: 'City' } },
    required: ['city'],
  },
  execute: async () => 'sunny',
};

describe('OpenAICompatProtocol', () => {
  const protocol = new OpenAICompatProtocol();
  const config = { provider: 'openai', model: 'gpt-4o', apiKey: 'key' } satisfies ModelConfig;

  it('formats requests, tools, responses, follow-up state, and common errors', () => {
    const request = protocol.formatRequest(
      {
        prompt: 'Hello',
        systemMessage: 'System',
        temperature: 0.2,
        maxTokens: 100,
        topP: 0.9,
        frequencyPenalty: 0.1,
        presencePenalty: 0.2,
        stopSequences: ['END'],
        responseFormat: { type: 'json_object' },
        _providerState: { messages: [{ role: 'assistant', content: 'prior' }] },
      },
      config
    );

    expect(request).toMatchObject({
      model: 'gpt-4o',
      temperature: 0.2,
      max_tokens: 100,
      response_format: { type: 'json_object' },
    });
    expect(request.messages[0]).toEqual({ role: 'system', content: 'System' });
    expect(protocol.formatTools([tool])[0]?.type).toBe('function');

    const raw = {
      choices: [
        {
          message: {
            content: 'ok',
            tool_calls: [{ id: '1', function: { name: 'get_weather', arguments: '{"city":"Lagos"}' } }],
          },
          finish_reason: 'tool_calls',
        },
      ],
      usage: { prompt_tokens: 1, completion_tokens: 2, total_tokens: 3 },
    };
    expect(protocol.extractResponse(raw)).toMatchObject({
      content: 'ok',
      tokensUsed: { prompt: 1, completion: 2, total: 3 },
      finishReason: 'tool_calls',
    });
    expect(protocol.extractToolCalls(raw)).toEqual([{ id: '1', name: 'get_weather', arguments: '{"city":"Lagos"}' }]);
    expect(protocol.formatFollowUp({ prompt: 'Hi' }, raw, [{ toolCallId: '1', toolName: 'get_weather', result: 'sunny', arguments: '{}' }])._providerState).toBeDefined();

    expect(protocol.mapError(errorWithStatus(429, 'slow down'), config)).toBeInstanceOf(RateLimitError);
    expect(protocol.mapError(errorWithStatus(429, 'billing quota'), config)).toBeInstanceOf(QuotaExceededError);
    expect(protocol.mapError(errorWithStatus(401, 'bad key'), config)).toBeInstanceOf(AuthenticationError);
    expect(protocol.mapError(errorWithStatus(413, 'too long'), config)).toBeInstanceOf(ContextWindowError);
    expect(protocol.mapError(new Error('Request was aborted.'), config)).toBeInstanceOf(TimeoutError);
  });

  it('streams incremental OpenAI-compatible tool-call chunks', async () => {
    const client = {
      chat: {
        completions: {
          create: vi.fn(async function* () {
            yield { choices: [{ delta: { tool_calls: [{ index: 0, id: 'tc1', function: { name: 'get_weather', arguments: '{"city"' } }] } }] };
            yield { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: ':"Lagos"}' } }] }, finish_reason: 'tool_calls' }] };
          }),
        },
      },
    };
    const chunks = [];
    for await (const chunk of protocol.stream(client, { model: 'm', messages: [] })) chunks.push(chunk);
    expect(chunks.filter((chunk) => chunk.toolCall).map((chunk) => chunk.toolCall?.name)).toContain('get_weather');
  });

  it('routes GPT-5 models through the Responses API', () => {
    const request = protocol.formatRequest(
      {
        prompt: 'Hello',
        systemMessage: 'System',
        maxTokens: 16,
        temperature: 0.2,
        responseFormat: { type: 'json_object' },
      },
      { provider: 'openai', model: 'gpt-5.5', apiKey: 'key' }
    );

    expect(request).toMatchObject({
      api: 'responses',
      request: {
        model: 'gpt-5.5',
        instructions: 'System',
        max_output_tokens: 16,
        text: { format: { type: 'json_object' } },
      },
    });
    expect('temperature' in request.request).toBe(false);

    const raw = {
      object: 'response',
      output_text: 'ok',
      status: 'completed',
      incomplete_details: null,
      output: [{ type: 'function_call', call_id: 'call-1', name: 'get_weather', arguments: '{"city":"Lagos"}' }],
      usage: { input_tokens: 2, output_tokens: 3, total_tokens: 5 },
    };
    expect(protocol.extractResponse(raw)).toMatchObject({
      content: 'ok',
      tokensUsed: { prompt: 2, completion: 3, total: 5 },
      finishReason: 'stop',
    });
    expect(protocol.extractToolCalls(raw)).toEqual([{ id: 'call-1', name: 'get_weather', arguments: '{"city":"Lagos"}' }]);
  });

  it('constructs OpenAI-compatible client without network access', () => {
    expect(protocol.createClient(config, { protocol })).toBeDefined();
  });

  it('passes timeout and abort signals to OpenAI requests', async () => {
    const controller = new AbortController();
    const chatCreate = vi.fn(async () => ({ choices: [], usage: {} }));
    const responsesCreate = vi.fn(async () => ({ object: 'response', output: [], status: 'completed' }));
    const client = {
      chat: { completions: { create: chatCreate } },
      responses: { create: responsesCreate },
    };

    await protocol.callRaw(
      client,
      { model: 'gpt-4o', messages: [] },
      { prompt: 'Hello', signal: controller.signal }
    );
    expect(chatCreate).toHaveBeenCalledWith(
      { model: 'gpt-4o', messages: [] },
      { signal: controller.signal }
    );

    await protocol.callRaw(
      client,
      { api: 'responses', request: { model: 'gpt-5.4', input: [], stream: false, store: false } },
      { prompt: 'Hello', signal: controller.signal }
    );
    expect(responsesCreate).toHaveBeenCalledWith(
      { model: 'gpt-5.4', input: [], stream: false, store: false },
      { signal: controller.signal }
    );

    const timedClient = protocol.createClient(
      { provider: 'openai', model: 'gpt-5.4', apiKey: 'key', timeout: 1234 },
      { protocol }
    ) as unknown as { timeout?: number };
    expect(timedClient.timeout).toBe(1234);
  });
});

describe('AnthropicProtocol', () => {
  it('formats system, tools, text/tool responses, follow-up state, and overload errors', () => {
    const protocol = new AnthropicProtocol();
    const config = { provider: 'anthropic', model: 'claude-sonnet-4-6', apiKey: 'key' } satisfies ModelConfig;
    const request = protocol.formatRequest({ prompt: 'Hi', systemMessage: 'System', maxTokens: 42 }, config);

    expect(request.system).toBe('System');
    expect(request.messages).toEqual([{ role: 'user', content: 'Hi' }]);
    expect(protocol.formatTools([tool])[0]).toMatchObject({ name: 'get_weather', input_schema: { type: 'object' } });

    const raw = {
      content: [
        { type: 'text', text: 'hello' },
        { type: 'tool_use', id: 'a1', name: 'get_weather', input: { city: 'Lagos' } },
      ],
      usage: { input_tokens: 3, output_tokens: 4 },
      stop_reason: 'tool_use',
    };

    expect(protocol.extractResponse(raw)).toMatchObject({
      content: 'hello',
      tokensUsed: { prompt: 3, completion: 4, total: 7 },
      finishReason: 'tool_calls',
    });
    expect(protocol.extractToolCalls(raw)).toEqual([{ id: 'a1', name: 'get_weather', arguments: '{"city":"Lagos"}' }]);
    expect(protocol.formatFollowUp({ prompt: 'Hi' }, raw, [{ toolCallId: 'a1', toolName: 'get_weather', result: 'sunny', arguments: '{}' }])._providerState).toBeDefined();
    expect(protocol.mapError(errorWithStatus(529, 'overloaded'), config).retryable).toBe(true);
  });

  it('streams incremental Anthropic tool-use chunks', async () => {
    const protocol = new AnthropicProtocol();
    const client = {
      messages: {
        stream: function* () {
          yield { type: 'content_block_start', index: 0, content_block: { type: 'tool_use', id: 'a1', name: 'get_weather', input: {} } };
          yield { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: '{"city":"Lagos"}' } };
          yield { type: 'message_delta', delta: { stop_reason: 'tool_use' } };
        },
      },
    };
    const chunks = [];
    for await (const chunk of protocol.stream(client, { model: 'm', max_tokens: 1, messages: [] })) chunks.push(chunk);
    expect(chunks.some((chunk) => chunk.toolCall?.id === 'a1')).toBe(true);
  });

  it('constructs an Anthropic client without network access', () => {
    const protocol = new AnthropicProtocol();
    expect(protocol.createClient({ provider: 'anthropic', model: 'claude-sonnet-4-6', apiKey: 'key' }, { protocol })).toBeDefined();
  });

  it('passes timeout and abort signals to Anthropic requests', async () => {
    const protocol = new AnthropicProtocol();
    const controller = new AbortController();
    const create = vi.fn(async () => ({
      content: [],
      usage: { input_tokens: 1, output_tokens: 1 },
      stop_reason: 'end_turn',
    }));
    const client = { messages: { create } };
    const request = { model: 'claude-sonnet-4-6', max_tokens: 10, messages: [{ role: 'user', content: 'Hi' }] };

    await protocol.callRaw(client, request, { prompt: 'Hi', signal: controller.signal });
    expect(create).toHaveBeenCalledWith(request, { signal: controller.signal });

    const timedClient = protocol.createClient(
      { provider: 'anthropic', model: 'claude-sonnet-4-6', apiKey: 'key', timeout: 1234 },
      { protocol }
    ) as unknown as { timeout?: number };
    expect(timedClient.timeout).toBe(1234);
  });
});

describe('GoogleProtocol', () => {
  it('formats requests/tools, extracts responses/tool calls, and uses status objects for errors', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123);
    const protocol = new GoogleProtocol();
    const config = { provider: 'gemini', model: 'gemini-2.5-flash', apiKey: 'key' } satisfies ModelConfig;
    const request = protocol.formatRequest({ prompt: 'Hi', systemMessage: 'System', responseFormat: { type: 'json_object' } }, config) as {
      config: Record<string, unknown>;
      contents: unknown[];
    };

    expect(request.config.systemInstruction).toBe('System');
    expect(request.config.responseMimeType).toBe('application/json');
    expect(protocol.formatTools([tool])).toEqual([
      {
        functionDeclarations: [
          {
            name: 'get_weather',
            description: 'Get weather',
            parameters: { type: 'OBJECT', properties: tool.parameters.properties, required: ['city'] },
          },
        ],
      },
    ]);

    const raw = {
      text: 'ok',
      usageMetadata: { promptTokenCount: 2, candidatesTokenCount: 3, totalTokenCount: 5 },
      candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ functionCall: { name: 'x' } }] } }],
      functionCalls: [{ name: 'get_weather', args: { city: 'Lagos' } }],
    };
    expect(protocol.extractResponse(raw, { prompt: 'Hi' })).toMatchObject({
      content: 'ok',
      finishReason: 'length',
      tokensUsed: { prompt: 2, completion: 3, total: 5 },
    });
    expect(protocol.extractToolCalls(raw)).toEqual([{ id: 'gemini-123-0', name: 'get_weather', arguments: '{"city":"Lagos"}' }]);
    expect(protocol.formatFollowUp({ prompt: 'Hi' }, raw, [{ toolCallId: 'g1', toolName: 'get_weather', result: '{"ok":true}', arguments: '{}' }])._providerState).toBeDefined();
    expect(protocol.mapError(errorWithStatus(429, 'quota'), config)).toBeInstanceOf(QuotaExceededError);
    vi.restoreAllMocks();
  });

  it('streams Google function-call chunks', async () => {
    const protocol = new GoogleProtocol();
    const client = {
      models: {
        generateContentStream: vi.fn(async function* () {
          yield { candidates: [{ content: { parts: [{ functionCall: { name: 'get_weather', args: { city: 'Lagos' } } }] } }] };
        }),
      },
    };
    const chunks = [];
    for await (const chunk of protocol.stream(client, {})) chunks.push(chunk);
    expect(chunks[0]?.toolCall).toMatchObject({ name: 'get_weather', arguments: '{"city":"Lagos"}' });
  });

  it('constructs Gemini and Vertex clients without network access', () => {
    const protocol = new GoogleProtocol();
    expect(protocol.createClient({ provider: 'gemini', model: 'gemini-2.5-flash', apiKey: 'key' }, { protocol })).toBeDefined();
    expect(protocol.createClient({ provider: 'vertexai', model: 'gemini-2.5-flash', project: 'p', location: 'us-central1' }, { protocol })).toBeDefined();
  });
});

describe('BedrockProtocol', () => {
  it('formats Converse requests/tools, extracts responses/tool calls, and maps AWS errors', () => {
    const protocol = new BedrockProtocol();
    const config = { provider: 'bedrock', model: 'anthropic.claude-3-7-sonnet', region: 'us-east-1' } satisfies ModelConfig;
    const request = protocol.formatRequest({ prompt: 'Hi', systemMessage: 'System', maxTokens: 10 }, config);

    expect(request.system).toEqual([{ text: 'System' }]);
    expect(request.messages?.at(-1)).toEqual({ role: 'user', content: [{ text: 'Hi' }] });
    expect(protocol.formatTools([tool])).toMatchObject({ toolConfig: { tools: [{ toolSpec: { inputSchema: { json: { type: 'object' } } } }] } });

    const raw = {
      output: {
        message: {
          role: 'assistant',
          content: [{ text: 'ok' }, { toolUse: { toolUseId: 'b1', name: 'get_weather', input: { city: 'Lagos' } } }],
        },
      },
      usage: { inputTokens: 2, outputTokens: 3, totalTokens: 5 },
      stopReason: 'tool_use',
    };
    expect(protocol.extractResponse(raw)).toMatchObject({
      content: 'ok',
      finishReason: 'tool_calls',
      tokensUsed: { prompt: 2, completion: 3, total: 5 },
    });
    expect(protocol.extractToolCalls(raw)).toEqual([{ id: 'b1', name: 'get_weather', arguments: '{"city":"Lagos"}' }]);
    expect(protocol.formatFollowUp({ prompt: 'Hi' }, raw, [{ toolCallId: 'b1', toolName: 'get_weather', result: '{"ok":true}', arguments: '{}' }])._providerState).toBeDefined();
    expect(protocol.mapError({ name: 'Unknown' }, config).code).toBe('PROVIDER_ERROR');
  });

  it('constructs Bedrock clients, streams events, and maps specific Bedrock error names', async () => {
    const protocol = new BedrockProtocol();
    const config = { provider: 'bedrock', model: 'anthropic.claude-3-7-sonnet', region: 'us-east-1' } satisfies ModelConfig;
    expect(protocol.createClient(config, { protocol })).toBeDefined();
    const client = {
      send: vi.fn(async () => ({
        stream: [
          { contentBlockDelta: { delta: { text: 'hi' } } },
          { messageStop: { stopReason: 'max_tokens' } },
          { metadata: { usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 } } },
        ],
      })),
    };
    const chunks = [];
    for await (const chunk of protocol.stream(client, {})) chunks.push(chunk);
    expect(chunks).toEqual([
      { delta: 'hi' },
      { delta: '', finishReason: 'length' },
      { delta: '', usage: { prompt: 1, completion: 2, total: 3 } },
    ]);
    expect(protocol.mapError({ name: 'ResourceNotFoundException', message: 'missing' }, config)).toBeInstanceOf(ModelNotFoundError);
    expect(protocol.mapError({ name: 'ServiceQuotaExceededException', message: 'quota' }, config)).toBeInstanceOf(QuotaExceededError);
  });
});


function errorWithStatus(status: number, message: string): Error & { status: number; headers?: Record<string, string> } {
  return Object.assign(new Error(message), { status, headers: { 'retry-after': '30' } });
}
