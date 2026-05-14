import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import { AgentTeam } from '../agent/agent-team.js';
import { Agent } from '../agent/agent.js';
import { AgentCache } from '../agent/cache.js';
import { AgentWorkspace } from '../agent/workspace.js';
import { Provider } from '../agent/provider-catalog.js';
import { createAdapter } from '../agent/adapters/types.js';
import type { AgentResponse, AgentRunParams } from '../agent/types.js';

describe('AgentWorkspace', () => {
  it('create() returns workspace with events emitter', () => {
    const workspace = AgentWorkspace.create({});
    expect(workspace.events).toBeDefined();
    expect(typeof workspace.events.on).toBe('function');
  });

  it('memory() has no cache or adapters by default', () => {
    const workspace = AgentWorkspace.memory();
    expect(workspace.cache).toBeUndefined();
    expect(workspace.adapters).toEqual([]);
  });

  it('local() creates a workspace with a file cache', () => {
    const workspace = AgentWorkspace.local('./test-ws');
    expect(workspace.cache?.config.type).toBe('file');
  });

  it('local() creates the cache directory immediately', async () => {
    const root = await mkdtemp(join(tmpdir(), 'agentcraft-workspace-'));
    const cacheRoot = join(root, 'cache');
    try {
      AgentWorkspace.local(root, { cacheRoot });
      expect(existsSync(cacheRoot)).toBe(true);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it('create() propagates explicit cache', () => {
    const cache = AgentCache.memory();
    const workspace = AgentWorkspace.create({ cache });
    expect(workspace.cache).toBe(cache);
  });

  it('events.on returns unsubscribe and removes handlers', () => {
    const workspace = AgentWorkspace.create({});
    const handler = vi.fn();
    const unsubscribe = workspace.events.on('cache.hit', handler);

    workspace.events.emit('cache.hit', { toolName: 'x', key: 'y' });
    expect(handler).toHaveBeenCalledOnce();

    unsubscribe();
    workspace.events.emit('cache.hit', { toolName: 'x', key: 'y' });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('runs multiple handlers for the same event', () => {
    const workspace = AgentWorkspace.create({});
    const first = vi.fn();
    const second = vi.fn();

    workspace.events.on('cache.hit', first);
    workspace.events.on('cache.hit', second);
    workspace.events.emit('cache.hit', { toolName: 'x', key: 'y' });

    expect(first).toHaveBeenCalledOnce();
    expect(second).toHaveBeenCalledOnce();
  });

  it('handler errors do not propagate', () => {
    const workspace = AgentWorkspace.create({});
    workspace.events.on('cache.miss', () => {
      throw new Error('boom');
    });

    expect(() => workspace.events.emit('cache.miss', { toolName: 'x', key: 'y' })).not.toThrow();
  });

  it('AgentTeam attaches workspace adapters and role policies to members', async () => {
    const adapter = createAdapter({
      name: 'workspace-adapter',
      requires: [],
      getTools: () => [
        {
          name: 'read_workspace',
          description: 'Read workspace data.',
          parameters: { type: 'object', properties: {}, required: [] },
          security: { sideEffect: 'read' },
          execute: async () => 'ok',
        },
      ],
    });
    const workspace = AgentWorkspace.create({
      cache: AgentCache.memory(),
      adapters: [adapter],
      toolPolicy: { readOnly: true },
      budget: { maxToolCalls: 2 },
    });
    const orchestrator = mockAgent('orchestrator', 'final');
    const reviewer = mockAgent('reviewer', 'review');

    const team = AgentTeam.create({
      workspace,
      orchestrator,
      members: [{ role: 'reviewer', agent: reviewer }],
      rolePolicies: { reviewer: { timeoutMs: 10 } },
    });

    await team.run({ prompt: 'Review this' });

    expect(orchestrator.getAttachedAdapters()).toContain(adapter);
    expect(reviewer.getAttachedAdapters()).toContain(adapter);
    expect(vi.mocked(reviewer.run).mock.calls[0]?.[0].budget?.maxToolCalls).toBe(2);
  });

  it('rolePolicies do not affect unlisted roles', async () => {
    const orchestrator = mockAgent('orchestrator', 'final');
    const reviewer = mockAgent('reviewer', 'review');
    const writer = mockAgent('writer', 'draft');

    const team = AgentTeam.create({
      orchestrator,
      members: [
        { role: 'reviewer', agent: reviewer },
        { role: 'writer', agent: writer },
      ],
      rolePolicies: { reviewer: { readOnly: true } },
      executionHint: 'parallel',
    });

    await team.run({ prompt: 'Review and draft' });

    expect(vi.mocked(reviewer.run).mock.calls[0]?.[0].toolPolicy).toBeUndefined();
    expect(vi.mocked(writer.run).mock.calls[0]?.[0].toolPolicy).toBeUndefined();
  });

  it('AgentTeam warns when workspace and sharedAdapters are both provided', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const shared = createAdapter({ name: 'legacy-shared', requires: [] });

    AgentTeam.create({
      workspace: AgentWorkspace.create({ adapters: [] }),
      orchestrator: mockAgent('orchestrator', 'final'),
      members: [{ role: 'writer', agent: mockAgent('writer', 'draft') }],
      sharedAdapters: [shared],
    });

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('sharedAdapters is deprecated'));
    warn.mockRestore();
  });
});

function mockAgent(name: string, content: string): Agent {
  const agent = Agent.create({ model: Provider.ollama['llama3.2'], name });
  vi.spyOn(agent, 'run').mockImplementation(async (params: AgentRunParams): Promise<AgentResponse> => {
    for (const tool of params.tools ?? []) {
      await tool.execute({ task: `task for ${tool.name}` });
    }
    return {
      content,
      cost: 0,
      tokensUsed: { prompt: 1, completion: 1, total: 2 },
      finishReason: 'stop',
      model: agent.model,
      provider: agent.provider,
    };
  });
  return agent;
}
