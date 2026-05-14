import { describe, expect, it } from 'vitest';
import { Agent } from '../../agent/agent.js';
import { tool } from '../../agent/adapters/types.js';

const integrationEnabled = process.env.INTEGRATION_TESTS === 'true';
const fullMode = process.env.AGENTCRAFT_LIVE_FULL === 'true';
const smokeMaxTokens = Number.parseInt(process.env.AGENTCRAFT_LIVE_MAX_TOKENS ?? '64', 10);

const providers = [
  {
    name: 'openai',
    models: parseModelList(process.env.AGENTCRAFT_LIVE_OPENAI_MODELS, [
      process.env.AGENTCRAFT_LIVE_OPENAI_MODEL,
      'gpt-4o-mini',
      'gpt-4o',
    ]),
    modelPrefix: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
  },
  {
    name: 'anthropic',
    models: parseModelList(process.env.AGENTCRAFT_LIVE_ANTHROPIC_MODELS, [
      process.env.AGENTCRAFT_LIVE_ANTHROPIC_MODEL,
      'claude-haiku-4-5-20251001',
      'claude-sonnet-4-5-20250929',
    ]),
    modelPrefix: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY,
  },
  {
    name: 'gemini',
    models: parseModelList(process.env.AGENTCRAFT_LIVE_GEMINI_MODELS, [
      process.env.AGENTCRAFT_LIVE_GEMINI_MODEL,
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
    ]),
    modelPrefix: 'gemini',
    apiKey: process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY,
  },
  {
    name: 'cohere',
    models: parseModelList(process.env.AGENTCRAFT_LIVE_COHERE_MODELS, [
      process.env.AGENTCRAFT_LIVE_COHERE_MODEL,
      'command-r7b-12-2024',
      'command-r-08-2024',
    ]),
    modelPrefix: 'cohere',
    apiKey: process.env.COHERE_API_KEY,
  },
  {
    name: 'deepseek',
    models: parseModelList(process.env.AGENTCRAFT_LIVE_DEEPSEEK_MODELS, [
      process.env.AGENTCRAFT_LIVE_DEEPSEEK_MODEL,
      'deepseek-chat',
      'deepseek-reasoner',
    ]),
    modelPrefix: 'deepseek',
    apiKey: process.env.DEEPSEEK_API_KEY,
  },
  {
    name: 'groq',
    models: parseModelList(process.env.AGENTCRAFT_LIVE_GROQ_MODELS, [
      process.env.AGENTCRAFT_LIVE_GROQ_MODEL,
      'llama-3.1-8b-instant',
      'llama-3.3-70b-versatile',
    ]),
    modelPrefix: 'groq',
    apiKey: process.env.GROQ_API_KEY,
  },
] as const;

const enabledProviders = parseProviderSelection(process.env.AGENTCRAFT_LIVE_PROVIDERS);

describe('live provider smoke tests', () => {
  for (const provider of providers) {
    const providerIt =
      integrationEnabled && provider.apiKey && enabledProviders.has(provider.name) ? it : it.skip;

    for (const model of provider.models) {
      providerIt(
        `${provider.name}:${model} returns a tiny basic response`,
        async () => {
          const agent = createLiveAgent({ ...provider, model, apiKey: provider.apiKey! });
          const response = await agent.run({
            prompt: 'Reply with exactly: OK',
            temperature: 0,
            maxTokens: smokeMaxTokens,
          });

          expect(response.content.trim().toUpperCase()).toContain('OK');
          expect(response.tokensUsed.total).toBeGreaterThan(0);
        },
        45_000
      );
    }

    const fullProviderIt =
      integrationEnabled && fullMode && provider.apiKey && enabledProviders.has(provider.name)
        ? it
        : it.skip;

    fullProviderIt(
      `${provider.name} returns validated structured JSON`,
      async () => {
        const agent = createLiveAgent({
          ...provider,
          model: provider.models[0]!,
          apiKey: provider.apiKey!,
        });
        const response = await agent.run({
          prompt: 'Return JSON only for a smoke test where ok is true.',
          temperature: 0,
          maxTokens: 48,
          responseSchema: {
            type: 'object',
            required: ['ok'],
            properties: {
              ok: { type: 'boolean' },
            },
          },
          structuredOutput: { retries: 1, toolFallback: 'auto' },
        });

        expect(response.structuredResponse).toEqual({ ok: true });
      },
      45_000
    );
  }

  const openAiIt =
    integrationEnabled && fullMode && enabledProviders.has('openai') && process.env.OPENAI_API_KEY
      ? it
      : it.skip;

  openAiIt(
    'openai streams a tiny response',
    async () => {
      const agent = createLiveAgent({
        name: 'openai',
        modelPrefix: 'openai',
        model: process.env.AGENTCRAFT_LIVE_OPENAI_MODEL ?? 'gpt-4o-mini',
        apiKey: process.env.OPENAI_API_KEY!,
      });
      const chunks = [];

      for await (const chunk of agent.stream({
        prompt: 'Reply with exactly: stream-ok',
        temperature: 0,
        maxTokens: 12,
      })) {
        chunks.push(chunk);
      }

      expect(chunks.some((chunk) => chunk.type === 'model_delta')).toBe(true);
      expect(chunks.at(-1)?.type).toBe('final');
    },
    45_000
  );

  openAiIt(
    'openai can execute a harmless tool call',
    async () => {
      const agent = createLiveAgent({
        name: 'openai',
        modelPrefix: 'openai',
        model: process.env.AGENTCRAFT_LIVE_OPENAI_MODEL ?? 'gpt-4o-mini',
        apiKey: process.env.OPENAI_API_KEY!,
      });
      let called = false;

      const response = await agent.run({
        prompt:
          'Use the provided tool to get the smoke test value, then reply with that value only.',
        temperature: 0,
        maxTokens: 24,
        tools: [
          tool({
            name: 'get_smoke_value',
            description: 'Return the exact smoke-test value.',
            security: { sideEffect: 'none' },
            params: {},
            run: async () => {
              called = true;
              return { value: 'tool-ok' };
            },
          }),
        ],
      });

      expect(called).toBe(true);
      expect(response.content.toLowerCase()).toContain('tool-ok');
    },
    60_000
  );
});

function createLiveAgent(provider: {
  name: string;
  modelPrefix: string;
  model: string;
  apiKey: string;
}) {
  return Agent.create({
    model: `${provider.modelPrefix}:${provider.model}`,
    apiKey: provider.apiKey,
    temperature: 0,
    maxTokens: 64,
    retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
  });
}

function parseProviderSelection(value: string | undefined): Set<string> {
  if (!value || value.trim() === '') return new Set(['openai']);
  const selected = value
    .split(',')
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean);

  if (selected.includes('all')) {
    return new Set(providers.map((provider) => provider.name));
  }

  return new Set(selected);
}

function parseModelList(value: string | undefined, defaults: Array<string | undefined>): string[] {
  const models =
    value
      ?.split(',')
      .map((model) => model.trim())
      .filter(Boolean) ?? defaults.filter((model): model is string => Boolean(model));

  return Array.from(new Set(models));
}
