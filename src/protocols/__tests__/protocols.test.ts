import { describe, expect, it, vi } from 'vitest';
import { AuthenticationError, ContextWindowError, ModelNotFoundError, QuotaExceededError, RateLimitError } from '../../errors/index.js';
import type { ModelConfig } from '../../types/config.types.js';
import type { LLMCallParams } from '../../types/provider.types.js';
import { AnthropicProtocol } from '../anthropic.protocol.js';
import { BedrockProtocol } from '../bedrock.protocol.js';
import { CohereProtocol } from '../cohere.protocol.js';
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
    expect(protocol.formatRequest({ prompt: 'Hi' }, { provider: 'azure', model: 'gpt-4o', apiKey: 'key', endpoint: 'https://example.com', deployment: 'dep' })).toMatchObject({ model: 'dep' });
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

  it('constructs OpenAI-compatible and Azure clients without network access', () => {
    expect(protocol.createClient(config, { protocol })).toBeDefined();
    expect(protocol.createClient(
      { provider: 'azure', model: 'gpt-4o', apiKey: 'key', endpoint: 'https://azure.test', deployment: 'dep' },
      { protocol, useAzureClient: true }
    )).toBeDefined();
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

describe('CohereProtocol', () => {
  it('formats chat requests/tools, extracts responses/tool calls, and builds follow-up state', () => {
    vi.spyOn(Date, 'now').mockReturnValue(456);
    const protocol = new CohereProtocol();
    const config = { provider: 'cohere', model: 'command-r-08-2024', apiKey: 'key' } satisfies ModelConfig;
    const request = protocol.formatRequest({ prompt: 'Hi', systemMessage: 'System', responseFormat: { type: 'json_object' } }, config) as Record<string, unknown>;

    expect(request).toMatchObject({ model: 'command-r-08-2024', message: 'Hi', preamble: 'System', responseFormat: { type: 'json_object' } });
    expect(protocol.formatTools([tool])).toEqual([
      {
        name: 'get_weather',
        description: 'Get weather',
        parameterDefinitions: { city: { description: 'City', type: 'string', required: true } },
      },
    ]);

    const raw = {
      text: 'ok',
      finishReason: 'TOOL_CALL',
      meta: { tokens: { inputTokens: 4, outputTokens: 5 } },
      toolCalls: [{ name: 'get_weather', parameters: { city: 'Lagos' } }],
    };
    expect(protocol.extractResponse(raw)).toMatchObject({
      content: 'ok',
      finishReason: 'tool_calls',
      tokensUsed: { prompt: 4, completion: 5, total: 9 },
    });
    expect(protocol.extractToolCalls(raw)).toEqual([{ id: 'cohere-456-0', name: 'get_weather', arguments: '{"city":"Lagos"}' }]);
    expect(protocol.formatFollowUp({ prompt: 'Hi' }, raw, [{ toolCallId: 'c1', toolName: 'get_weather', result: '{"ok":true}', arguments: '{"city":"Lagos"}' }])._providerState).toBeDefined();
    vi.restoreAllMocks();
  });

  it('constructs Cohere clients, streams events, and maps common errors', async () => {
    const protocol = new CohereProtocol();
    const config = { provider: 'cohere', model: 'command-r-08-2024', apiKey: 'key' } satisfies ModelConfig;
    expect(protocol.createClient(config, { protocol })).toBeDefined();
    const client = {
      chatStream: vi.fn(async function* () {
        yield { eventType: 'text-generation', text: 'hi' };
        yield { eventType: 'stream-end', response: { finishReason: 'MAX_TOKENS', meta: { tokens: { inputTokens: 1, outputTokens: 2 } } } };
      }),
    };
    const chunks = [];
    for await (const chunk of protocol.stream(client, {})) chunks.push(chunk);
    expect(chunks).toEqual([
      { delta: 'hi' },
      { delta: '', finishReason: 'length' },
      { delta: '', usage: { prompt: 1, completion: 2, total: 3 } },
    ]);
    expect(protocol.mapError(errorWithStatus(404, 'missing'), config)).toBeInstanceOf(ModelNotFoundError);
  });

  it('routes Command A models through Cohere v2 chat', async () => {
    const protocol = new CohereProtocol();
    const config = { provider: 'cohere', model: 'command-a-reasoning-08-2025', apiKey: 'key' } satisfies ModelConfig;
    const request = protocol.formatRequest(
      { prompt: 'Hi', systemMessage: 'System', maxTokens: 16, responseFormat: { type: 'json_object' } },
      config
    ) as { api: string; request: Record<string, unknown> };

    expect(request).toMatchObject({
      api: 'v2',
      request: {
        model: 'command-a-reasoning-08-2025',
        maxTokens: 16,
        responseFormat: { type: 'json_object' },
        thinking: { type: 'disabled' },
      },
    });
    expect(request.request.messages).toEqual([
      { role: 'system', content: 'System' },
      { role: 'user', content: 'Hi' },
    ]);

    const raw = {
      id: 'v2-1',
      finishReason: 'COMPLETE',
      message: { role: 'assistant', content: [{ type: 'text', text: 'ok' }] },
      usage: { tokens: { inputTokens: 4, outputTokens: 5 } },
    };
    expect(protocol.extractResponse(raw)).toMatchObject({
      content: 'ok',
      finishReason: 'stop',
      tokensUsed: { prompt: 4, completion: 5, total: 9 },
    });

    const client = { v2: { chat: vi.fn(async () => raw) } };
    await expect(protocol.callRaw(client, request)).resolves.toBe(raw);
    expect(client.v2.chat).toHaveBeenCalledWith(request.request);
  });
});

function errorWithStatus(status: number, message: string): Error & { status: number; headers?: Record<string, string> } {
  return Object.assign(new Error(message), { status, headers: { 'retry-after': '30' } });
}
