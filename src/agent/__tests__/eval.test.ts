import { describe, expect, it } from 'vitest';
import { AgentEval } from '../eval/index.js';
import { Agent } from '../agent.js';
import { Provider } from '../provider-catalog.js';
import { DeterministicFakeProvider } from '../../testing/fake-provider.js';
import type { AgentResponse } from '../types.js';

function makeAgent(content: string): Pick<Agent, 'run'> {
  const agent = Agent.create({ model: Provider.openai['gpt-4o'], apiKey: 'test-key' });
  const provider = new DeterministicFakeProvider(
    [{ response: { success: true, content, tokensUsed: { prompt: 100, completion: 50, total: 150 }, finishReason: 'stop' } }],
    { provider: 'openai', model: 'gpt-4o', apiKey: 'test-key' },
  );
  Object.defineProperty(agent, 'unifiedProvider', { value: provider });
  return agent;
}

function makeMultiStepAgent(responses: string[]): Pick<Agent, 'run'> {
  const agent = Agent.create({ model: Provider.openai['gpt-4o'], apiKey: 'test-key' });
  const provider = new DeterministicFakeProvider(
    responses.map((content) => ({ response: { success: true, content, tokensUsed: { prompt: 10, completion: 5, total: 15 }, finishReason: 'stop' as const } })),
    { provider: 'openai', model: 'gpt-4o', apiKey: 'test-key' },
  );
  Object.defineProperty(agent, 'unifiedProvider', { value: provider });
  return agent;
}

describe('AgentEval.suite', () => {
  it('builds a suite with name, description, and defaults', () => {
    const suite = AgentEval.suite({
      name: 'quality-check',
      description: 'Validates output quality.',
      defaults: { maxCostUsd: 0.10, maxTotalTokens: 5000 },
    });

    expect(suite.name).toBe('quality-check');
    expect(suite.description).toBe('Validates output quality.');
    expect(suite.defaults?.maxCostUsd).toBe(0.10);
    expect(suite.cases).toHaveLength(0);
  });

  it('builds cases via the fluent builder pattern', () => {
    const suite = AgentEval.suite({ name: 's' })
      .case({ name: 'case-1', prompt: 'What is 2+2?' })
      .case({ name: 'case-2', prompt: 'Summarize this text.' });

    expect(suite.cases).toHaveLength(2);
    expect(suite.cases[0]?.name).toBe('case-1');
    expect(suite.cases[1]?.name).toBe('case-2');
  });
});

describe('AgentEval.assert', () => {
  function fakeResponse(content: string, extra: Partial<AgentResponse> = {}): AgentResponse {
    return {
      content,
      tokensUsed: { prompt: 10, completion: 5, total: 15 },
      cost: 0,
      finishReason: 'stop',
      model: 'fake',
      provider: 'ollama',
      ...extra,
    } as AgentResponse;
  }

  const ctx = { case: { name: 'x', prompt: '' }, suite: { name: 's' } };

  it('contains passes when text is present', async () => {
    const result = await AgentEval.assert.contains('hello').evaluate(fakeResponse('hello world'), ctx);
    expect(result.passed).toBe(true);
  });

  it('contains fails when text is absent', async () => {
    const result = await AgentEval.assert.contains('missing').evaluate(fakeResponse('other text'), ctx);
    expect(result.passed).toBe(false);
    expect(result.message).toBeTruthy();
  });

  it('notContains passes when text is absent', async () => {
    const result = await AgentEval.assert.notContains('bad').evaluate(fakeResponse('good output'), ctx);
    expect(result.passed).toBe(true);
  });

  it('notContains fails when text is present', async () => {
    const result = await AgentEval.assert.notContains('bad').evaluate(fakeResponse('bad output'), ctx);
    expect(result.passed).toBe(false);
  });

  it('matches passes when regex matches', async () => {
    const result = await AgentEval.assert.matches(/\d+/).evaluate(fakeResponse('answer is 42'), ctx);
    expect(result.passed).toBe(true);
  });

  it('matches fails when regex does not match', async () => {
    const result = await AgentEval.assert.matches(/\d+/).evaluate(fakeResponse('no numbers here'), ctx);
    expect(result.passed).toBe(false);
  });

  it('skillActivated passes when skill is in activeTraits', async () => {
    const response = fakeResponse('ok', {
      selection: { traitActivation: 'auto', toolSelection: 'auto', activeTraits: ['blog-writer'], exposedTools: [] },
    });
    const result = await AgentEval.assert.skillActivated('blog-writer').evaluate(response, ctx);
    expect(result.passed).toBe(true);
  });

  it('skillActivated fails when skill is absent', async () => {
    const response = fakeResponse('ok', {
      selection: { traitActivation: 'auto', toolSelection: 'auto', activeTraits: [], exposedTools: [] },
    });
    const result = await AgentEval.assert.skillActivated('blog-writer').evaluate(response, ctx);
    expect(result.passed).toBe(false);
  });

  it('cacheHitRateAtLeast passes when hit rate meets threshold', async () => {
    const response = fakeResponse('ok', {
      cache: { hits: 8, misses: 2, writes: 0, bypassed: false, skippedUnsafe: 0, stale: 0, corrupt: 0, oversized: 0, toolCallsAvoided: 0, estimatedSavedTokens: 0, summary: { hitRate: 0.8 } as AgentResponse['cache']['summary'] },
    });
    const result = await AgentEval.assert.cacheHitRateAtLeast(0.7).evaluate(response, ctx);
    expect(result.passed).toBe(true);
  });

  it('cacheHitRateAtLeast fails when hit rate is too low', async () => {
    const response = fakeResponse('ok', {
      cache: { hits: 2, misses: 8, writes: 0, bypassed: false, skippedUnsafe: 0, stale: 0, corrupt: 0, oversized: 0, toolCallsAvoided: 0, estimatedSavedTokens: 0, summary: { hitRate: 0.2 } as AgentResponse['cache']['summary'] },
    });
    const result = await AgentEval.assert.cacheHitRateAtLeast(0.7).evaluate(response, ctx);
    expect(result.passed).toBe(false);
  });
});

describe('AgentEval.run', () => {
  it('runs a suite and returns a passed report for a matching response', async () => {
    const agent = makeAgent('The answer is 42.');
    const suite = AgentEval.suite({ name: 'math-suite' })
      .case({
        name: 'basic-math',
        prompt: 'What is 6 times 7?',
        assertions: [AgentEval.assert.contains('42')],
      });

    const report = await AgentEval.run({ agent, suite });

    expect(report.status).toBe('passed');
    expect(report.results).toHaveLength(1);
    expect(report.results[0]?.status).toBe('passed');
    expect(report.summary.total).toBe(1);
    expect(report.summary.passed).toBe(1);
    expect(report.summary.failed).toBe(0);
  });

  it('marks report as failed when assertion fails', async () => {
    const agent = makeAgent('I do not know.');
    const suite = AgentEval.suite({ name: 'fail-suite' })
      .case({
        name: 'expect-number',
        prompt: 'What is 6 times 7?',
        assertions: [AgentEval.assert.contains('42')],
      });

    const report = await AgentEval.run({ agent, suite });

    expect(report.status).toBe('failed');
    expect(report.results[0]?.status).toBe('failed');
    expect(report.summary.failed).toBe(1);
  });

  it('accumulates summary metrics across multiple cases', async () => {
    const agent = makeMultiStepAgent(['yes', 'no']);

    const suite = AgentEval.suite({ name: 'multi' })
      .case({ name: 'c1', prompt: 'p1', assertions: [AgentEval.assert.contains('yes')] })
      .case({ name: 'c2', prompt: 'p2', assertions: [AgentEval.assert.contains('yes')] });

    const report = await AgentEval.run({ agent, suite });

    expect(report.summary.total).toBe(2);
    expect(report.summary.passed + report.summary.failed).toBe(2);
  });
});

describe('AgentEval.compare', () => {
  function mockReport(name: string, status: 'passed' | 'failed', cost: number, tokens: number): Parameters<typeof AgentEval.compare>[0]['baseline'] {
    return {
      name,
      generatedAt: new Date().toISOString(),
      status,
      results: [{
        name: 'case-1',
        status,
        durationMs: 100,
        response: {
          content: 'x',
          tokensUsed: { prompt: tokens, completion: 50, total: tokens + 50 },
          cost,
          finishReason: 'stop',
          model: 'fake',
          provider: 'ollama',
        } as AgentResponse,
        assertions: [],
        failures: [],
        warnings: [],
        metrics: {
          cost,
          promptTokens: tokens,
          completionTokens: 50,
          totalTokens: tokens + 50,
          activeTraits: [],
          exposedTools: [],
          executedToolCalls: 0,
        },
      }],
      summary: { total: 1, passed: status === 'passed' ? 1 : 0, failed: status === 'failed' ? 1 : 0, warnings: 0, totalCost: cost, totalTokens: tokens },
    };
  }

  it('computes cost and token deltas between baseline and candidate', () => {
    const baseline = mockReport('baseline', 'passed', 0.01, 500);
    const candidate = mockReport('candidate', 'passed', 0.02, 700);

    const comparison = AgentEval.compare({ baseline, candidate });

    expect(comparison.deltas.cost).toBeCloseTo(0.01);
    expect(comparison.deltas.promptTokens).toBeGreaterThan(0);
    expect(comparison.baselineStatus).toBe('passed');
    expect(comparison.candidateStatus).toBe('passed');
  });
});
