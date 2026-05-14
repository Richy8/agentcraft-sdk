import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { Agent } from '../../agent/agent.js';
import { tool } from '../../agent/adapters/types.js';
import { AgentCache } from '../../agent/cache.js';
import { Provider } from '../../agent/provider-catalog.js';
import { CreatorPacks } from '../../agent/packs/index.js';

const integrationEnabled = process.env.INTEGRATION_TESTS === 'true';
const creatorLiveEnabled = process.env.AGENTCRAFT_LIVE_CREATOR_TESTS === 'true';
const openAiEnabled = parseProviderSelection(process.env.AGENTCRAFT_LIVE_PROVIDERS).has('openai');
const openAiKey = process.env.OPENAI_API_KEY;
const liveIt = integrationEnabled && creatorLiveEnabled && openAiEnabled && openAiKey ? it : it.skip;
const liveModel = process.env.AGENTCRAFT_LIVE_OPENAI_MODEL ?? 'gpt-4o-mini';
const maxTokens = Number.parseInt(process.env.AGENTCRAFT_LIVE_CREATOR_MAX_TOKENS ?? '220', 10);
const reportEntries: string[] = [];

describe('live creator skills and cache smoke tests', () => {
  afterAll(async () => {
    if (reportEntries.length === 0) return;
    await mkdir('reports', { recursive: true });
    await writeFile(
      'reports/agentcraft-live-creator-cache-test-report.md',
      [
        '# AgentCraft Live Creator Cache Test Report',
        '',
        `Generated: ${new Date().toISOString()}`,
        '',
        `Model: openai:${liveModel}`,
        '',
        ...reportEntries,
      ].join('\n'),
      'utf8'
    );
  });

  liveIt(
    'caches safe tool results across repeated live model tool calls',
    async () => {
      const root = await mkdtemp(path.join(tmpdir(), 'agentcraft-live-cache-'));
      let toolExecutions = 0;

      const cacheProbeTool = tool({
        name: 'get_creator_cache_probe',
        description: 'Return the exact cached creator smoke-test value.',
        security: { sideEffect: 'read' },
        params: {},
        run: async () => {
          toolExecutions += 1;
          return {
            value: 'creator-cache-ok',
            checklist: ['audience', 'angle', 'evidence', 'review'],
          };
        },
      });

      const agent = Agent.create({
        model: `openai:${liveModel}`,
        apiKey: openAiKey!,
        temperature: 0,
        maxTokens: 96,
        cache: AgentCache.file(root, { strategy: 'auto', defaultTtlMs: 60_000 }),
        retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
      });

      try {
        const prompt =
          'Call get_creator_cache_probe exactly once, then reply with the value and checklist only.';

        const before = await agent.run({
          prompt,
          temperature: 0,
          maxTokens: 96,
          tools: [cacheProbeTool],
        });
        const after = await agent.run({
          prompt,
          temperature: 0,
          maxTokens: 96,
          tools: [cacheProbeTool],
        });

        expect(before.content.toLowerCase()).toContain('creator-cache-ok');
        expect(after.content.toLowerCase()).toContain('creator-cache-ok');
        expect(before.cache.misses).toBeGreaterThanOrEqual(1);
        expect(before.cache.writes).toBeGreaterThanOrEqual(1);
        expect(after.cache.hits).toBeGreaterThanOrEqual(1);
        expect(toolExecutions).toBe(1);

        reportEntries.push(
          [
            '## Cache Before/After',
            '',
            '| Metric | First run | Second run |',
            '| --- | ---: | ---: |',
            `| Cache hits | ${before.cache.hits} | ${after.cache.hits} |`,
            `| Cache misses | ${before.cache.misses} | ${after.cache.misses} |`,
            `| Cache writes | ${before.cache.writes} | ${after.cache.writes} |`,
            `| Unsafe skips | ${before.cache.skippedUnsafe} | ${after.cache.skippedUnsafe} |`,
            `| Estimated saved tokens | ${Math.round(before.cache.estimatedSavedTokens)} | ${Math.round(after.cache.estimatedSavedTokens)} |`,
            `| Real tool executions | ${toolExecutions} | ${toolExecutions} |`,
            '',
            'Result: the first live model run executed the safe read tool and wrote the result to cache. The second live model run requested the same tool result, hit cache, and did not execute the real tool again.',
            '',
          ].join('\n')
        );
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
    90_000
  );

  liveIt(
    'creator blog pack improves structured quality signals over a plain prompt',
    async () => {
      const prompt =
        'Create a compact Medium article plan about reducing token waste in AI agent workflows. Keep it under 180 words.';

      const plain = Agent.create({
        model: `openai:${liveModel}`,
        apiKey: openAiKey!,
        temperature: 0,
        maxTokens,
        retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
      });
      const skilled = Agent.create({
        model: `openai:${liveModel}`,
        apiKey: openAiKey!,
        temperature: 0,
        maxTokens,
        skillActivation: 'auto',
        toolSelection: 'auto',
        retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
      }).use(CreatorPacks.blog({ cache: 'auto', readOnlyByDefault: true }));

      const plainResponse = await plain.run({ prompt, temperature: 0, maxTokens });
      const skilledResponse = await skilled.run({ prompt, temperature: 0, maxTokens });

      const plainScore = scoreCreatorPlan(plainResponse.content);
      const skilledScore = scoreCreatorPlan(skilledResponse.content);

      expect(skilledResponse.selection.activeSkills.length).toBeGreaterThan(0);
      expect(skilledResponse.selection.activeSkills).toContain('blog-writer');
      expect(skilledScore).toBeGreaterThanOrEqual(plainScore);
      expect(skilledScore).toBeGreaterThanOrEqual(3);

      reportEntries.push(
        [
          '## Creator Skill Quality Before/After',
          '',
          '| Metric | Plain prompt | Creator blog pack |',
          '| --- | ---: | ---: |',
          `| Heuristic quality score | ${plainScore} | ${skilledScore} |`,
          `| Prompt tokens | ${plainResponse.tokensUsed.prompt} | ${skilledResponse.tokensUsed.prompt} |`,
          `| Completion tokens | ${plainResponse.tokensUsed.completion} | ${skilledResponse.tokensUsed.completion} |`,
          `| Total tokens | ${plainResponse.tokensUsed.total} | ${skilledResponse.tokensUsed.total} |`,
          '',
          `Active creator skills: ${skilledResponse.selection.activeSkills.map((skill) => `\`${skill}\``).join(', ')}`,
          '',
          'Plain prompt output preview:',
          '',
          fenced(trimForReport(plainResponse.content)),
          '',
          'Creator blog pack output preview:',
          '',
          fenced(trimForReport(skilledResponse.content)),
          '',
          'Result: the creator-pack run activated creator skills and met or exceeded the plain-prompt quality score on audience, angle, outline, evidence, takeaway, and review signals.',
          '',
        ].join('\n')
      );
    },
    90_000
  );
});

function scoreCreatorPlan(content: string): number {
  const lower = content.toLowerCase();
  const signals = [
    /audience|reader|who/i,
    /angle|thesis|hook/i,
    /outline|structure|section/i,
    /evidence|proof|example/i,
    /takeaway|cta|action/i,
    /review|risk|fact/i,
  ];
  return signals.reduce((score, pattern) => score + (pattern.test(lower) ? 1 : 0), 0);
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
  return selected.includes('all') ? new Set(['openai']) : new Set(selected);
}
