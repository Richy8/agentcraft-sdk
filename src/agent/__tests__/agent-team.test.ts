import { describe, expect, it, vi } from 'vitest';
import { AgentTeam } from '../agent-team.js';
import { Agent } from '../agent.js';
import { Provider } from '../provider-catalog.js';
import { createAdapter } from '../adapters/types.js';
import type { AgentResponse, AgentRunParams } from '../types.js';

function mockAgent(name: string, content: string, cost = 0.1): Agent {
  const agent = Agent.create({ model: Provider.ollama['llama3.2'], name });
  vi.spyOn(agent, 'run').mockImplementation(async (params: AgentRunParams): Promise<AgentResponse> => {
    for (const tool of params.tools ?? []) {
      await tool.execute({ task: `task for ${tool.name}` });
    }
    return {
      content,
      cost,
      tokensUsed: { prompt: 1, completion: 1, total: 2 },
      finishReason: 'stop',
      model: agent.model,
      provider: agent.provider,
    };
  });
  return agent;
}

describe('AgentTeam', () => {
  it('runs orchestrator with member invocation tools and returns trace when requested', async () => {
    const orchestrator = mockAgent('orchestrator', 'final', 0.2);
    const writer = mockAgent('writer', 'draft', 0.3);
    const team = AgentTeam.create({
      orchestrator,
      members: [{ role: 'writer', agent: writer, description: 'Writes the draft' }],
    });

    const result = await team.run({ prompt: 'Write a brief', trace: true });

    expect(result.content).toBe('final');
    expect(result.cost).toBe(0.5);
    expect(result.agentsUsed).toBe(1);
    expect(result.trace?.map((entry) => entry.agentRole)).toContain('writer');
    expect(result.traceSpans?.some((span) => span.kind === 'team' && span.name === 'team.run')).toBe(true);
    expect(result.traceSpans?.some((span) => span.kind === 'team' && span.name === 'team.member.writer')).toBe(true);
  });

  it('initializes and cleans shared adapters once', async () => {
    const init = vi.fn(async () => undefined);
    const cleanup = vi.fn(async () => undefined);
    const shared = createAdapter({ name: 'shared', requires: [], init, cleanup });
    const orchestrator = mockAgent('orchestrator', 'final');
    const writer = mockAgent('writer', 'draft');

    const team = AgentTeam.create({
      orchestrator,
      members: [{ role: 'writer', agent: writer }],
      sharedAdapters: [shared],
    });

    await team.run({ prompt: 'hello' });
    await team.dispose();
    await team.dispose();

    expect(init).toHaveBeenCalledTimes(1);
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('spawn creates a runnable team from role hints', async () => {
    const root = mockAgent('root', 'spawned final');
    const team = AgentTeam.spawn({ root, roleHints: ['analyst'] });

    await expect(team.run({ prompt: 'Analyze this' })).resolves.toMatchObject({
      content: 'spawned final',
      rounds: 1,
    });
  });

  it('runs parallel member collection with planner/executor/reviewer guidance and role budgets', async () => {
    const orchestrator = mockAgent('orchestrator', 'final', 0.2);
    const researcher = mockAgent('researcher', 'research', 0.3);
    const writer = mockAgent('writer', 'draft', 0.4);
    const team = AgentTeam.create({
      orchestrator,
      executionHint: 'parallel',
      mode: 'planner-executor-reviewer',
      roleBudgets: { researcher: { maxTokens: 10_000 }, writer: { maxTokens: 10_000 }, orchestrator: { maxTokens: 10_000 } },
      members: [
        { role: 'researcher', agent: researcher },
        { role: 'writer', agent: writer },
      ],
    });

    const result = await team.run({ prompt: 'Make a plan', trace: true });

    expect(result.cost).toBeCloseTo(0.9);
    expect(result.agentsUsed).toBe(2);
    expect(result.trace?.filter((entry) => entry.round === 0).map((entry) => entry.agentRole)).toEqual(['researcher', 'writer']);
    expect(result.traceSpans?.some((span) => span.name === 'team.parallel.researcher')).toBe(true);
    expect(vi.mocked(orchestrator.run).mock.calls[0]?.[0].prompt).toContain('planner/executor/reviewer');
    expect(vi.mocked(orchestrator.run).mock.calls[0]?.[0].prompt).toContain('Parallel member results');
  });
});
