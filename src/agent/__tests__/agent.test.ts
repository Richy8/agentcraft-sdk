import { describe, expect, it, vi } from 'vitest';
import { Agent } from '../agent.js';
import { AgentPool } from '../agent-pool.js';
import { Provider } from '../provider-catalog.js';
import { AgentCache } from '../cache/index.js';
import { createPricingStalenessReport } from '../budgets.js';
import { FetchAdapter, SeoAdapter } from '../adapters/index.js';
import {
  ConfigurationError,
  QuotaExceededError,
  ToolExecutionError,
  UnsupportedInputError,
} from '../../errors/index.js';
import type { LLMResponse, StreamChunk } from '../../types/provider.types.js';

describe('Agent', () => {
  it('creates an agent from a provider model string and exposes capabilities', () => {
    const agent = Agent.create({ model: Provider.ollama['llama3.2'], name: 'local' });

    expect(agent.provider).toBe('ollama');
    expect(agent.model).toBe('llama3.2');
    expect(agent.name).toBe('local');
    expect(agent.getCapabilities().costPerMInputToken).toBe(0);
  });

  it('validates complex provider fields through AgentConfigSchema', () => {
    expect(() => Agent.create({ model: 'azure:gpt-4o', apiKey: 'key' })).toThrow(
      ConfigurationError
    );
  });

  it('inspects catalog metadata and hides deprecated models by default', () => {
    expect(Agent.inspect(Provider.openai['gpt-4o']).capabilities.tools).toBe(true);
    expect(Agent.supports(Provider.openai['gpt-4o'], 'tools')).toBe(true);
    expect(Agent.catalog().some((entry) => entry.deprecated)).toBe(false);
  });

  it('validates multimodal input before provider calls', async () => {
    const agent = Agent.create({ model: Provider.ollama['llama3.2'] });

    await expect(
      agent.run({ prompt: 'hello', images: [{ type: 'url', data: 'https://example.com/a.png' }] })
    ).rejects.toThrow(UnsupportedInputError);
  });

  it('streams with tools through the provider streamWithTools path', async () => {
    const agent = Agent.create({ model: Provider.ollama['llama3.2'] });
    const provider = (
      agent as unknown as { unifiedProvider: { streamWithTools: ReturnType<typeof vi.fn> } }
    ).unifiedProvider;
    provider.streamWithTools = vi.fn(async function* (): AsyncGenerator<StreamChunk> {
      yield { delta: '', toolCall: { id: 'call-1', name: 'mock_tool', arguments: '{}' } };
      yield {
        delta: '',
        toolResult: { toolCallId: 'call-1', toolName: 'mock_tool', content: '"ok"', success: true },
      };
      yield { delta: 'tool result' };
      yield { delta: '', finishReason: 'stop', usage: { prompt: 1, completion: 1, total: 2 } };
    });

    const chunks: StreamChunk[] = [];
    for await (const chunk of agent.stream({
      prompt: 'use tool',
      tools: [
        {
          name: 'mock_tool',
          description: 'Mock tool',
          parameters: { type: 'object', properties: {}, required: [] },
          execute: async () => 'ok',
        },
      ],
    })) {
      chunks.push(chunk);
    }

    expect(provider.streamWithTools).toHaveBeenCalledOnce();
    expect(chunks.at(0)?.type).toBe('tool_call');
    expect(chunks.at(0)?.runId).toMatch(/^run_/);
    expect(chunks.at(1)?.type).toBe('tool_result');
    expect(chunks.at(2)?.delta).toBe('tool result');
    expect(chunks.at(2)?.type).toBe('model_delta');
    expect(chunks.at(-1)?.type).toBe('final');
  });

  it('keeps stream production lazy and honors cancellation', async () => {
    const agent = Agent.create({ model: Provider.ollama['llama3.2'] });
    const provider = (agent as unknown as { unifiedProvider: { stream: ReturnType<typeof vi.fn> } })
      .unifiedProvider;
    let produced = 0;
    provider.stream = vi.fn(async function* (): AsyncGenerator<StreamChunk> {
      produced++;
      yield { delta: 'first' };
      produced++;
      yield { delta: 'second' };
    });
    const controller = new AbortController();
    const stream = agent.stream({ prompt: 'stream', signal: controller.signal });

    expect(produced).toBe(0);
    await expect(stream.next()).resolves.toMatchObject({
      value: { delta: 'first', type: 'model_delta' },
      done: false,
    });
    controller.abort();
    await expect(stream.next()).resolves.toMatchObject({ done: true });
    expect(produced).toBe(2);
  });

  it('validates structured JSON output and retries malformed responses', async () => {
    const agent = Agent.create({ model: Provider.ollama['llama3.2'] });
    const provider = (agent as unknown as { unifiedProvider: { call: ReturnType<typeof vi.fn> } })
      .unifiedProvider;
    provider.call = vi
      .fn()
      .mockResolvedValueOnce({
        success: true,
        content: '{"title":1}',
        tokensUsed: { prompt: 1, completion: 1, total: 2 },
        finishReason: 'stop',
      })
      .mockResolvedValueOnce({
        success: true,
        content: '{"title":"AgentCraft","score":10}',
        tokensUsed: { prompt: 1, completion: 1, total: 2 },
        finishReason: 'stop',
      });

    const response = await agent.run({
      prompt: 'json',
      structuredOutput: { retries: 1 },
      responseSchema: {
        type: 'object',
        required: ['title', 'score'],
        properties: {
          title: { type: 'string' },
          score: { type: 'number' },
        },
      },
    });

    expect(response).toMatchObject({
      structuredResponse: { title: 'AgentCraft', score: 10 },
      runId: expect.stringMatching(/^run_/),
    });
    expect(response.trace?.some((span) => (span as { kind?: string }).kind === 'retry')).toBe(true);
    expect(provider.call).toHaveBeenCalledTimes(2);
    expect(provider.call.mock.calls[0]?.[0].responseFormat).toEqual({ type: 'json_object' });
  });

  it('rejects malformed structured JSON without inventing a response', async () => {
    const agent = Agent.create({ model: Provider.ollama['llama3.2'] });
    const provider = (agent as unknown as { unifiedProvider: { call: ReturnType<typeof vi.fn> } })
      .unifiedProvider;
    provider.call = vi.fn(
      async (): Promise<LLMResponse> => ({
        success: true,
        content: 'not json',
        tokensUsed: { prompt: 1, completion: 1, total: 2 },
        finishReason: 'stop',
      })
    );

    await expect(
      agent.run({
        prompt: 'json',
        responseSchema: {
          type: 'object',
          required: ['ok'],
          properties: { ok: { type: 'boolean' } },
        },
      })
    ).rejects.toThrow(ToolExecutionError);
  });

  it('supports tool-based structured output fallback when requested', async () => {
    const agent = Agent.create({ model: Provider.openai['gpt-4o'], apiKey: 'key' });
    const provider = (
      agent as unknown as { unifiedProvider: { callWithTools: ReturnType<typeof vi.fn> } }
    ).unifiedProvider;
    provider.callWithTools = vi.fn(async (_params, tools): Promise<LLMResponse> => {
      await tools
        .find((tool) => tool.name === 'submit_structured_response')!
        .execute({ title: 'Fallback', score: 99 });
      return {
        success: true,
        content: 'submitted via tool',
        tokensUsed: { prompt: 1, completion: 1, total: 2 },
        finishReason: 'stop',
      };
    });

    const response = await agent.run({
      prompt: 'json',
      structuredOutput: { toolFallback: true },
      responseSchema: {
        type: 'object',
        required: ['title', 'score'],
        properties: {
          title: { type: 'string' },
          score: { type: 'number' },
        },
      },
    });

    expect(provider.callWithTools).toHaveBeenCalledOnce();
    expect(response.structuredResponse).toEqual({ title: 'Fallback', score: 99 });
  });

  it('exports redacted trace spans for agent, model, and tool flows', async () => {
    const agent = Agent.create({ model: Provider.ollama['llama3.2'] });
    const provider = (
      agent as unknown as { unifiedProvider: { callWithTools: ReturnType<typeof vi.fn> } }
    ).unifiedProvider;
    provider.callWithTools = vi.fn(async (_params, tools): Promise<LLMResponse> => {
      await tools[0]!.execute({ secret: 'sk-secret123456' });
      return {
        success: true,
        content: 'ok',
        tokensUsed: { prompt: 1, completion: 1, total: 2 },
        finishReason: 'stop',
      };
    });
    const ended: unknown[] = [];
    const response = await agent.run({
      prompt: 'hello',
      trace: { onSpanEnd: (span) => ended.push(span) },
      vars: { apiKey: 'sk-secret123456' },
      tools: [
        {
          name: 'secret_tool',
          description: 'Secret-safe tool',
          parameters: { type: 'object', properties: {}, required: [] },
          execute: async () => 'ok',
        },
      ],
    });

    expect(response.runId).toMatch(/^run_/);
    expect(response.trace?.some((span) => (span as { kind?: string }).kind === 'agent')).toBe(true);
    expect(response.trace?.some((span) => (span as { kind?: string }).kind === 'model')).toBe(true);
    expect(response.trace?.some((span) => (span as { kind?: string }).kind === 'tool')).toBe(true);
    expect(JSON.stringify(response.trace)).not.toContain('sk-secret123456');
    expect(ended.length).toBeGreaterThan(0);
  });

  it('emits MCP spans for MCP-backed adapter discovery and tool execution', async () => {
    const agent = Agent.create({ model: Provider.ollama['llama3.2'] });
    agent.use({
      name: 'mcp-test',
      requires: ['tools'],
      metadata: { kind: 'mcp-backed' },
      getTools: async () => [
        {
          name: 'mcp_lookup',
          description: 'Lookup through MCP',
          parameters: { type: 'object', properties: {}, required: [] },
          execute: async () => 'mcp-result',
        },
      ],
    });
    const provider = (
      agent as unknown as { unifiedProvider: { callWithTools: ReturnType<typeof vi.fn> } }
    ).unifiedProvider;
    provider.callWithTools = vi.fn(async (_params, tools): Promise<LLMResponse> => {
      await tools[0]!.execute({});
      return {
        success: true,
        content: 'ok',
        tokensUsed: { prompt: 1, completion: 1, total: 2 },
        finishReason: 'stop',
      };
    });

    const response = await agent.run({ prompt: 'use mcp', trace: true });

    expect(
      response.trace?.filter((span) => (span as { kind?: string }).kind === 'mcp').length
    ).toBeGreaterThanOrEqual(2);
  });

  it('emits guardrail spans for blocked tool policy checks', async () => {
    const agent = Agent.create({ model: Provider.ollama['llama3.2'] });
    const provider = (
      agent as unknown as { unifiedProvider: { callWithTools: ReturnType<typeof vi.fn> } }
    ).unifiedProvider;
    provider.callWithTools = vi.fn(async (_params, tools): Promise<LLMResponse> => {
      await tools[0]!.execute({});
      return {
        success: true,
        content: 'ok',
        tokensUsed: { prompt: 1, completion: 1, total: 2 },
        finishReason: 'stop',
      };
    });
    const ended: unknown[] = [];

    await expect(
      agent.run({
        prompt: 'blocked',
        trace: { onSpanEnd: (span) => ended.push(span) },
        toolPolicy: {
          inputGuardrails: [() => ({ allowed: false, reason: 'blocked by test' })],
        },
        tools: [
          {
            name: 'blocked_tool',
            description: 'Blocked tool',
            parameters: { type: 'object', properties: {}, required: [] },
            execute: async () => 'should-not-run',
          },
        ],
      })
    ).rejects.toThrow(ToolExecutionError);

    expect(ended.some((span) => (span as { kind?: string }).kind === 'guardrail')).toBe(true);
  });

  it('blocks side-effecting tools unless approved for the run', async () => {
    const agent = Agent.create({
      model: Provider.ollama['llama3.2'],
      toolPolicy: { maxResultBytes: 100 },
    });
    const provider = (
      agent as unknown as { unifiedProvider: { callWithTools: ReturnType<typeof vi.fn> } }
    ).unifiedProvider;
    provider.callWithTools = vi.fn(async (_params, tools): Promise<LLMResponse> => {
      await tools[0]!.execute({});
      return {
        success: true,
        content: 'ok',
        tokensUsed: { prompt: 1, completion: 1, total: 2 },
        finishReason: 'stop',
      };
    });

    await expect(
      agent.run({
        prompt: 'delete',
        tools: [
          {
            name: 'delete_record',
            description: 'Delete a record',
            parameters: { type: 'object', properties: {}, required: [] },
            security: { sideEffect: 'write', requiresConfirmation: true },
            execute: async () => 'deleted',
          },
        ],
      })
    ).rejects.toThrow(ToolExecutionError);

    await expect(
      agent.run({
        prompt: 'delete',
        toolPolicy: { approvedTools: ['delete_record'] },
        tools: [
          {
            name: 'delete_record',
            description: 'Delete a record',
            parameters: { type: 'object', properties: {}, required: [] },
            security: { sideEffect: 'write', requiresConfirmation: true },
            execute: async () => 'deleted',
          },
        ],
      })
    ).resolves.toMatchObject({ content: 'ok' });
  });

  it('supports replay mode, preflight budgets, and cost estimation', async () => {
    const agent = Agent.create({ model: Provider.ollama['llama3.2'] });
    const replay = {
      content: 'replayed',
      cost: 0,
      tokensUsed: { prompt: 1, completion: 1, total: 2 },
      finishReason: 'stop' as const,
      model: agent.model,
      provider: agent.provider,
    };

    await expect(agent.run({ prompt: 'ignored', replay })).resolves.toMatchObject({
      content: 'replayed',
    });
    expect(agent.estimateCost({ prompt: 'hello', maxTokens: 10 }).tokens.total).toBeGreaterThan(0);
    expect(
      Agent.estimateCost(Provider.openai['gpt-4o'], { prompt: 'hello', maxTokens: 10 })
        .estimatedCost
    ).toBeGreaterThan(0);
    await expect(agent.run({ prompt: 'hello', budget: { maxTokens: 1 } })).rejects.toThrow(
      QuotaExceededError
    );
  });

  it('returns a run cost report with model, tool, search, cache, and stale-pricing fields', async () => {
    const agent = Agent.create({
      model: Provider.ollama['llama3.2'],
      cache: AgentCache.memory(),
    });
    const provider = (
      agent as unknown as { unifiedProvider: { callWithTools: ReturnType<typeof vi.fn> } }
    ).unifiedProvider;
    provider.callWithTools = vi.fn(async (_params, tools): Promise<LLMResponse> => {
      await tools[0]!.execute({});
      return {
        success: true,
        content: 'ok',
        tokensUsed: { prompt: 10, completion: 5, total: 15 },
        finishReason: 'stop',
        cost: 0.01,
      };
    });

    const result = await agent.run({
      prompt: 'search',
      tools: [
        {
          name: 'web_search',
          description: 'Search',
          parameters: { type: 'object', properties: {}, required: [] },
          security: { sideEffect: 'read' },
          execute: async () => ({ ok: true }),
        },
      ],
      budget: { mode: 'fail-closed', costOptions: { toolCalls: 1, searches: 1 } },
    });

    expect(result.costReport).toMatchObject({
      scope: 'run',
      provider: 'ollama',
      model: 'llama3.2',
      tokens: { actual: { prompt: 10, completion: 5, total: 15 } },
      costs: {
        actualModelCost: 0.01,
        toolCostEstimate: expect.any(Number),
        searchCostEstimate: expect.any(Number),
        cacheSavingsEstimate: expect.any(Number),
      },
      budgetMode: 'fail-closed',
    });
  });

  it('reports pricing metadata staleness for catalog certification', () => {
    const report = createPricingStalenessReport({
      now: new Date('2026-05-16T00:00:00.000Z'),
      thresholdDays: 90,
      catalog: {
        'openai:fresh': {
          ...Agent.inspect(Provider.openai['gpt-4o']),
          pricingMetadata: { updatedAt: '2026-05-01' },
        },
        'openai:old': {
          ...Agent.inspect(Provider.openai['gpt-4o-mini']),
          pricingMetadata: { updatedAt: '2025-01-01' },
        },
      },
    });

    expect(report).toMatchObject({
      totalModels: 2,
      freshModels: 1,
      staleModels: 1,
    });
    expect(report.entries.find((entry) => entry.model === 'openai:old')).toMatchObject({
      stale: true,
      reason: 'expired',
    });
  });
});

describe('AgentPool', () => {
  it('validates fallback exclusion and name lookup', () => {
    const primary = Agent.create({ model: Provider.ollama['llama3.2'], name: 'primary' });
    const fallback = Agent.create({ model: Provider.ollama['llama3.2'], name: 'fallback' });

    expect(() => AgentPool.create([primary], { strategy: 'cost', fallback: primary })).toThrow(
      ConfigurationError
    );
    expect(AgentPool.create([primary], { strategy: 'cost', fallback }).get('primary')).toBe(
      primary
    );
  });

  it('includes per-request fees when ranking cost strategy', async () => {
    const perplexity = Agent.create({
      model: Provider.groq['llama-3.1-8b-instant'],
      apiKey: 'key',
      name: 'search',
    });
    const openai = Agent.create({
      model: Provider.openai['gpt-4o'],
      apiKey: 'key',
      name: 'openai',
    });
    vi.spyOn(perplexity, 'run').mockRejectedValue(new Error('wrong agent'));
    vi.spyOn(openai, 'run').mockResolvedValue({
      content: 'selected',
      cost: 0,
      tokensUsed: { prompt: 1, completion: 1, total: 2 },
      finishReason: 'stop',
      model: openai.model,
      provider: openai.provider,
    });

    await expect(
      AgentPool.create([perplexity, openai], { strategy: 'cost' }).run({ prompt: 'hi' })
    ).resolves.toMatchObject({
      content: 'selected',
    });
  });

  it('falls back across providers and can downgrade under budget pressure', async () => {
    const expensive = Agent.create({
      model: Provider.openai['gpt-4o'],
      apiKey: 'key',
      name: 'expensive',
    });
    const cheap = Agent.create({
      model: Provider.openai['gpt-4o-mini'],
      apiKey: 'key',
      name: 'cheap',
    });
    vi.spyOn(expensive, 'run').mockRejectedValue(new QuotaExceededError('openai'));
    vi.spyOn(cheap, 'run').mockResolvedValue({
      content: 'cheap',
      cost: 0,
      tokensUsed: { prompt: 1, completion: 1, total: 2 },
      finishReason: 'stop',
      model: cheap.model,
      provider: cheap.provider,
    });

    await expect(
      AgentPool.create([expensive, cheap], {
        strategy: 'quality',
        downgradeOnBudgetPressure: true,
        fallbackMode: 'all',
      }).run({
        prompt: 'hi',
        budget: { maxCost: 0.01, mode: 'downgrade-model' },
      })
    ).resolves.toMatchObject({ content: 'cheap' });
  });

  it('initializes adapters attached after a previous run on the next run', async () => {
    const agent = Agent.create({ model: Provider.ollama['llama3.2'] });
    const provider = (
      agent as unknown as { unifiedProvider: { call: ReturnType<typeof vi.fn> } }
    ).unifiedProvider;
    provider.call = vi.fn(async (): Promise<LLMResponse> => ({
      success: true,
      content: 'ok',
      tokensUsed: { prompt: 1, completion: 1, total: 2 },
      finishReason: 'stop',
    }));
    const init = vi.fn(async () => undefined);

    await agent.run({ prompt: 'first run' });
    agent.use({ name: 'late-adapter', init });
    await agent.run({ prompt: 'second run' });

    expect(init).toHaveBeenCalledOnce();
  });

  it('enforces maxToolCalls against executed calls, not exposed tools', async () => {
    const agent = Agent.create({ model: Provider.ollama['llama3.2'] });
    const provider = (
      agent as unknown as { unifiedProvider: { callWithTools: ReturnType<typeof vi.fn> } }
    ).unifiedProvider;
    const executed: string[] = [];
    const tools = [
      {
        name: 'first_tool',
        description: 'First tool',
        parameters: { type: 'object' as const, properties: {}, required: [] },
        execute: async () => {
          executed.push('first_tool');
          return 'first';
        },
      },
      {
        name: 'second_tool',
        description: 'Second tool',
        parameters: { type: 'object' as const, properties: {}, required: [] },
        execute: async () => {
          executed.push('second_tool');
          return 'second';
        },
      },
    ];

    provider.callWithTools = vi.fn(async (_params, exposedTools): Promise<LLMResponse> => {
      await exposedTools[0]!.execute({});
      return {
        success: true,
        content: 'ok',
        tokensUsed: { prompt: 1, completion: 1, total: 2 },
        finishReason: 'stop',
      };
    });

    const result = await agent.run({
      prompt: 'call one tool',
      tools,
      budget: { maxToolCalls: 1 },
    });

    expect(result.selection?.exposedTools).toEqual(['first_tool', 'second_tool']);
    expect(result.selection?.executedToolCalls).toBe(1);
    expect(executed).toEqual(['first_tool']);

    provider.callWithTools = vi.fn(async (_params, exposedTools): Promise<LLMResponse> => {
      await exposedTools[0]!.execute({});
      await exposedTools[1]!.execute({});
      return {
        success: true,
        content: 'ok',
        tokensUsed: { prompt: 1, completion: 1, total: 2 },
        finishReason: 'stop',
      };
    });

    await expect(
      agent.run({
        prompt: 'call two tools',
        tools,
        budget: { maxToolCalls: 1 },
      })
    ).rejects.toThrow(QuotaExceededError);
  });
});
