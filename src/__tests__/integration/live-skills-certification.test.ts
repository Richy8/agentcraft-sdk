import { mkdir, writeFile } from 'node:fs/promises';
import { afterAll, describe, expect, it } from 'vitest';
import { Agent } from '../../agent/agent.js';
import { tool } from '../../agent/adapters/types.js';
import { AgentCache } from '../../agent/cache.js';
import { CreatorPacks } from '../../agent/packs/index.js';

const integrationEnabled = process.env.INTEGRATION_TESTS === 'true';
const skillsLiveEnabled = process.env.AGENTCRAFT_LIVE_SKILLS_CERTIFICATION === 'true';
const maxTokens = Number.parseInt(process.env.AGENTCRAFT_LIVE_SKILLS_MAX_TOKENS ?? '180', 10);

const providers = [
  providerConfig('openai', 'openai', process.env.OPENAI_API_KEY, [
    process.env.AGENTCRAFT_LIVE_OPENAI_MODEL,
    'gpt-4o-mini',
  ]),
  providerConfig('anthropic', 'anthropic', process.env.ANTHROPIC_API_KEY, [
    process.env.AGENTCRAFT_LIVE_ANTHROPIC_MODEL,
    'claude-haiku-4-5-20251001',
  ]),
  providerConfig('gemini', 'gemini', process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY, [
    process.env.AGENTCRAFT_LIVE_GEMINI_MODEL,
    'gemini-2.5-flash-lite',
  ]),
  providerConfig('cohere', 'cohere', process.env.COHERE_API_KEY, [
    process.env.AGENTCRAFT_LIVE_COHERE_MODEL,
    'command-r7b-12-2024',
  ]),
  providerConfig('deepseek', 'deepseek', process.env.DEEPSEEK_API_KEY, [
    process.env.AGENTCRAFT_LIVE_DEEPSEEK_MODEL,
    'deepseek-chat',
  ]),
  providerConfig('groq', 'groq', process.env.GROQ_API_KEY, [
    process.env.AGENTCRAFT_LIVE_GROQ_MODEL,
    'llama-3.1-8b-instant',
  ]),
] as const;

const selectedProviders = parseProviderSelection(
  process.env.AGENTCRAFT_LIVE_SKILLS_PROVIDERS ?? process.env.AGENTCRAFT_LIVE_PROVIDERS
);
const reportEntries: string[] = [];

describe('live skills certification', () => {
  afterAll(async () => {
    if (reportEntries.length === 0) return;
    await mkdir('reports', { recursive: true });
    await writeFile(
      'reports/agentcraft-live-skills-certification.md',
      [
        '# AgentCraft Live Skills Certification',
        '',
        `Generated: ${new Date().toISOString()}`,
        '',
        `Selected providers: ${Array.from(selectedProviders).join(', ')}`,
        '',
        ...reportEntries,
      ].join('\n'),
      'utf8'
    );
  });

  for (const provider of providers) {
    const liveProviderIt =
      integrationEnabled &&
      skillsLiveEnabled &&
      provider.apiKey &&
      selectedProviders.has(provider.name)
        ? it
        : it.skip;

    liveProviderIt(
      `${provider.name}:${provider.model} produces creator-skill quality signals`,
      async () => {
        const agent = createLiveAgent(provider).use(
          CreatorPacks.blog({ skillActivation: 'auto', readOnlyByDefault: true })
        );
        const prompt =
          'Create a compact Medium article plan about reducing token waste in AI agent workflows. Include audience, angle, outline, evidence, and risk notes. Keep it under 160 words.';

        const response = await agent.run({ prompt, temperature: 0, maxTokens });
        const score = scoreCreatorPlan(response.content);

        reportEntries.push(
          [
            `## ${provider.name}:${provider.model}`,
            '',
            '| Metric | Value |',
            '| --- | ---: |',
            `| Quality score | ${score} / 6 |`,
            `| Prompt tokens | ${response.tokensUsed.prompt} |`,
            `| Completion tokens | ${response.tokensUsed.completion} |`,
            `| Total tokens | ${response.tokensUsed.total} |`,
            '',
            `Active skills: ${response.selection.activeSkills.map((skill) => `\`${skill}\``).join(', ')}`,
            '',
            'Output preview:',
            '',
            fenced(trimForReport(response.content)),
            '',
          ].join('\n')
        );

        expect(response.selection.activeSkills).toContain('blog-writer');
        expect(score).toBeGreaterThanOrEqual(4);
        expect(response.tokensUsed.total).toBeGreaterThan(0);
      },
      90_000
    );
  }

  const openAiToolIt =
    integrationEnabled &&
    skillsLiveEnabled &&
    process.env.OPENAI_API_KEY &&
    selectedProviders.has('openai')
      ? it
      : it.skip;

  openAiToolIt(
    'openai creator workflow uses a real safe read tool and cache on repeated runs',
    async () => {
      let calls = 0;
      const cache = AgentCache.file('.agentcraft/live-skills-cache', {
        namespace: 'live-skills-certification',
        version: '2026-05-12',
        defaultTtlMs: 60_000,
        maxEntryBytes: 20_000,
      });
      await cache.clear?.();

      const sourceTool = tool({
        name: 'get_creator_research_note',
        description: 'Return a concise source note for a creator workflow.',
        security: { sideEffect: 'read' },
        params: {},
        run: async () => {
          calls += 1;
          return {
            audience: 'technical founders',
            angle: 'cache safe read tools before spending tokens again',
            evidence: 'repeat tool calls can be avoided when inputs and tool identity match',
          };
        },
      });

      const agent = Agent.create({
        model: `openai:${process.env.AGENTCRAFT_LIVE_OPENAI_MODEL ?? 'gpt-4o-mini'}`,
        apiKey: process.env.OPENAI_API_KEY!,
        temperature: 0,
        maxTokens,
        cache,
        skillActivation: 'auto',
        retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
      }).use(CreatorPacks.blog({ skillActivation: 'auto', readOnlyByDefault: true }));

      const prompt =
        'Use get_creator_research_note exactly once, then create a compact article angle with audience, evidence, and risk notes.';
      const first = await agent.run({ prompt, temperature: 0, maxTokens, tools: [sourceTool] });
      const second = await agent.run({ prompt, temperature: 0, maxTokens, tools: [sourceTool] });

      expect(first.cache.misses).toBeGreaterThanOrEqual(1);
      expect(second.cache.hits).toBeGreaterThanOrEqual(1);
      expect(second.cache.toolCallsAvoided).toBeGreaterThanOrEqual(1);
      expect(calls).toBe(1);

      reportEntries.push(
        [
          '## OpenAI Tool + Cache Certification',
          '',
          '| Metric | First run | Second run |',
          '| --- | ---: | ---: |',
          `| Cache hits | ${first.cache.hits} | ${second.cache.hits} |`,
          `| Cache misses | ${first.cache.misses} | ${second.cache.misses} |`,
          `| Cache writes | ${first.cache.writes} | ${second.cache.writes} |`,
          `| Tool calls avoided | ${first.cache.toolCallsAvoided} | ${second.cache.toolCallsAvoided} |`,
          `| Real tool executions | ${calls} | ${calls} |`,
          '',
          'Result: the first live run executed the safe read tool. The second live run requested the same tool result, hit cache, and avoided the real tool call.',
          '',
        ].join('\n')
      );
    },
    90_000
  );
});

function providerConfig(
  name: string,
  modelPrefix: string,
  apiKey: string | undefined,
  models: ReadonlyArray<string | undefined>
) {
  return {
    name,
    modelPrefix,
    apiKey,
    model: models.find((model): model is string => Boolean(model))!,
  };
}

function createLiveAgent(provider: {
  readonly modelPrefix: string;
  readonly model: string;
  readonly apiKey: string;
}) {
  return Agent.create({
    model: `${provider.modelPrefix}:${provider.model}`,
    apiKey: provider.apiKey,
    temperature: 0,
    maxTokens,
    skillActivation: 'auto',
    retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
  });
}

function scoreCreatorPlan(content: string): number {
  const signals = [
    /audience|reader|who/i,
    /angle|thesis|hook/i,
    /outline|structure|section/i,
    /evidence|proof|example/i,
    /risk|fact|claim/i,
    /token|cache|cost/i,
  ];
  return signals.reduce((score, pattern) => score + (pattern.test(content) ? 1 : 0), 0);
}

function trimForReport(content: string): string {
  return content.length > 900 ? `${content.slice(0, 900)}...` : content;
}

function fenced(content: string): string {
  return ['```text', content.trim(), '```'].join('\n');
}

function parseProviderSelection(value: string | undefined): Set<string> {
  if (!value || value.trim() === '') return new Set(['openai']);
  const selected = value
    .split(',')
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean);
  return selected.includes('all') ? new Set(providers.map((provider) => provider.name)) : new Set(selected);
}
