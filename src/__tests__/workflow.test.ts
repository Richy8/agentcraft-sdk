import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import {
  AgentWorkflow,
  AgentStep,
  ApprovalStep,
  ConditionStep,
  CustomStep,
  ParallelStep,
  ToolStep,
} from '../agent/workflow/index.js';
import { AgentWorkspace } from '../agent/workspace.js';
import { AgentCache } from '../agent/cache.js';
import { createAdapter } from '../agent/adapters/types.js';
import { MemoryArtifactStore } from '../artifact-store/memory.js';
import { Agent } from '../agent/agent.js';
import { Provider } from '../agent/provider-catalog.js';
import type { ToolDefinition } from '../protocols/types.js';
import type { AgentResponse, AgentRunParams } from '../agent/types.js';

describe('AgentWorkflow', () => {
  it('inspect returns the step graph', () => {
    const workflow = AgentWorkflow.create({
      steps: [CustomStep({ id: 'step1', run: async () => 'hello' })],
    });

    expect(workflow.inspect()).toMatchObject({
      steps: [{ stepId: 'step1', type: 'custom' }],
    });
  });

  it('runs custom steps in order', async () => {
    const order: number[] = [];
    const workflow = AgentWorkflow.create({
      steps: [
        CustomStep({
          id: 's1',
          run: async () => {
            order.push(1);
            return 'a';
          },
        }),
        CustomStep({
          id: 's2',
          run: async (ctx) => {
            order.push(2);
            return `${ctx.steps.s1?.output}-b`;
          },
        }),
      ],
    });

    const result = await workflow.run({ input: {} });

    expect(result.status).toBe('completed');
    expect(order).toEqual([1, 2]);
    expect(result.steps[1]?.output).toBe('a-b');
  });

  it('stops on a failed step', async () => {
    const step2 = vi.fn();
    const workflow = AgentWorkflow.create({
      steps: [
        CustomStep({
          id: 's1',
          run: async () => {
            throw new Error('boom');
          },
        }),
        CustomStep({ id: 's2', run: step2 }),
      ],
    });

    const result = await workflow.run({ input: {} });

    expect(result.status).toBe('failed');
    expect(result.steps[0]?.error).toBe('boom');
    expect(step2).not.toHaveBeenCalled();
  });

  it('validates input schema before any step runs', async () => {
    const step = vi.fn();
    const workflow = AgentWorkflow.create({
      input: z.object({ topic: z.string() }),
      steps: [CustomStep({ id: 'step', run: step })],
    });

    await expect(workflow.run({ input: { topic: 123 } as never })).rejects.toThrow('invalid input');
    expect(step).not.toHaveBeenCalled();
  });

  it('passes workspace, store, and validated input through context', async () => {
    const store = MemoryArtifactStore();
    const workspace = AgentWorkspace.create({ store });
    let seenStore: unknown;
    let seenWorkspace: unknown;
    let seenInput: unknown;

    const workflow = AgentWorkflow.create({
      workspace,
      input: z.object({ value: z.number() }),
      steps: [
        CustomStep({
          id: 'ctx',
          run: async (ctx) => {
            seenStore = ctx.store;
            seenWorkspace = ctx.workspace;
            seenInput = ctx.input;
            return 'ok';
          },
        }),
      ],
    });

    await workflow.run({ input: { value: 42 } });

    expect(seenStore).toBe(store);
    expect(seenWorkspace).toBe(workspace);
    expect(seenInput).toEqual({ value: 42 });
  });

  it('AgentStep exposes configured id and type and returns agent content', async () => {
    const agent = mockAgent('writer', 'draft');
    const step = AgentStep({ id: 'write', agent, prompt: 'Write' });
    const workflow = AgentWorkflow.create({ steps: [step] });

    const result = await workflow.run({ input: {} });

    expect(step.stepId).toBe('write');
    expect(step.type).toBe('agent');
    expect(result.steps[0]?.output).toBe('draft');
  });

  it('approval step handles approval and rejection', async () => {
    const onApproved = vi.fn();
    const approved = AgentWorkflow.create({
      steps: [ApprovalStep({ id: 'approve', description: 'approve draft', approve: () => true, onApproved })],
    });
    const rejected = AgentWorkflow.create({
      steps: [ApprovalStep({ id: 'reject', description: 'reject draft', approve: () => false })],
    });

    await expect(approved.run({ input: {} })).resolves.toMatchObject({ status: 'completed' });
    expect(onApproved).toHaveBeenCalledOnce();
    await expect(rejected.run({ input: {} })).resolves.toMatchObject({ status: 'failed' });
  });

  it('condition step runs only the matching branch', async () => {
    const trueBranch = vi.fn(async () => 'true-output');
    const falseBranch = vi.fn(async () => 'false-output');
    const workflow = AgentWorkflow.create({
      steps: [
        ConditionStep({
          id: 'condition',
          condition: () => true,
          ifTrue: CustomStep({ id: 'branch-true', run: trueBranch }),
          ifFalse: CustomStep({ id: 'branch-false', run: falseBranch }),
        }),
      ],
    });

    await workflow.run({ input: {} });

    expect(trueBranch).toHaveBeenCalledOnce();
    expect(falseBranch).not.toHaveBeenCalled();
  });

  it('parallel step runs children concurrently enough to resolve out of declaration order', async () => {
    const resolved: string[] = [];
    const workflow = AgentWorkflow.create({
      steps: [
        ParallelStep({
          id: 'parallel',
          steps: [
            CustomStep({
              id: 'slow',
              run: async () => {
                await new Promise((resolve) => setTimeout(resolve, 20));
                resolved.push('slow');
                return 'slow';
              },
            }),
            CustomStep({
              id: 'fast',
              run: async () => {
                resolved.push('fast');
                return 'fast';
              },
            }),
          ],
        }),
      ],
    });

    await workflow.run({ input: {} });

    expect(resolved).toEqual(['fast', 'slow']);
  });

  it('parallel step with failFast false completes when a child fails', async () => {
    const workflow = AgentWorkflow.create({
      steps: [
        ParallelStep({
          id: 'parallel',
          failFast: false,
          steps: [
            CustomStep({ id: 'ok', run: async () => 'ok' }),
            CustomStep({
              id: 'bad',
              run: async () => {
                throw new Error('bad');
              },
            }),
          ],
        }),
      ],
    });

    await expect(workflow.run({ input: {} })).resolves.toMatchObject({ status: 'completed' });
  });

  it('condition step without ifFalse does not throw when false', async () => {
    const workflow = AgentWorkflow.create({
      steps: [ConditionStep({ id: 'condition', condition: () => false })],
    });

    await expect(workflow.run({ input: {} })).resolves.toMatchObject({ status: 'completed' });
  });

  it('custom step retries before completing', async () => {
    let attempts = 0;
    const workflow = AgentWorkflow.create({
      steps: [
        CustomStep({
          id: 'retry',
          retry: { attempts: 3 },
          run: async () => {
            attempts += 1;
            if (attempts < 3) throw new Error('again');
            return 'done';
          },
        }),
      ],
    });

    const result = await workflow.run({ input: {} });

    expect(attempts).toBe(3);
    expect(result.steps[0]?.status).toBe('completed');
  });

  it('ApprovalStep auto-approves when approve callback is absent', async () => {
    const workflow = AgentWorkflow.create({
      steps: [ApprovalStep({ id: 'approval', description: 'default approval' })],
    });

    await expect(workflow.run({ input: {} })).resolves.toMatchObject({ status: 'completed' });
  });

  it('ToolStep resolves dynamic adapters at runtime', async () => {
    const adapter = createAdapter({
      name: 'dynamic-tools',
      requires: [],
      getTools: () => [
        {
          name: 'echo',
          description: 'Echo input',
          parameters: { type: 'object', properties: {}, required: [] },
          execute: async (args) => args.value,
        },
      ],
    });
    const workflow = AgentWorkflow.create({
      steps: [
        ToolStep({
          id: 'tool',
          adapter: () => adapter,
          toolName: 'echo',
          args: { value: 'dynamic' },
        }),
      ],
    });

    const result = await workflow.run({ input: {} });

    expect(result.steps[0]?.output).toBe('dynamic');
  });

  it('ToolStep reports available tools when a name is invalid', async () => {
    const adapter = createAdapter({
      name: 'tools',
      requires: [],
      getTools: () => [
        {
          name: 'known_tool',
          description: 'Known tool',
          parameters: { type: 'object', properties: {}, required: [] },
          execute: async () => 'ok',
        },
      ],
    });
    const workflow = AgentWorkflow.create({
      steps: [ToolStep({ id: 'tool', adapter, toolName: 'missing_tool', args: {} })],
    });

    const result = await workflow.run({ input: {} });

    expect(result.status).toBe('failed');
    expect(result.steps[0]?.error).toContain('known_tool');
  });

  it('emits workflow step events', async () => {
    const workspace = AgentWorkspace.create({});
    const started = vi.fn();
    const completed = vi.fn();
    workspace.events.on('workflow.step.started', started);
    workspace.events.on('workflow.step.completed', completed);

    const workflow = AgentWorkflow.create({
      workspace,
      steps: [CustomStep({ id: 's1', run: async () => 'x' })],
    });

    await workflow.run({ input: {} });

    expect(started).toHaveBeenCalledWith({ stepId: 's1', type: 'custom' });
    expect(completed).toHaveBeenCalledWith({ stepId: 's1', status: 'completed' });
  });

  it('emits cache.hit during an agent step inside a workflow', async () => {
    let calls = 0;
    const adapter = createAdapter({
      name: 'cache-tools',
      requires: [],
      getTools: () => [
        {
          name: 'read_cached',
          description: 'Read cached data',
          parameters: { type: 'object', properties: {}, required: [] },
          security: { sideEffect: 'read' },
          execute: async () => ({ calls: ++calls }),
        },
      ],
    });
    const workspace = AgentWorkspace.create({ cache: AgentCache.memory() });
    const cacheHit = vi.fn();
    workspace.events.on('cache.hit', cacheHit);
    const agent = Agent.create({ model: Provider.ollama['llama3.2'] }).use(adapter);
    const provider = (
      agent as unknown as {
        unifiedProvider: {
          callWithTools: (params: unknown, tools: ToolDefinition[]) => Promise<unknown>;
        };
      }
    ).unifiedProvider;
    provider.callWithTools = vi.fn(async (_params: unknown, tools: ToolDefinition[]) => {
      await tools.find((tool) => tool.name === 'read_cached')?.execute({});
      return {
        content: 'done',
        cost: 0,
        tokensUsed: { prompt: 1, completion: 1, total: 2 },
        finishReason: 'stop',
      };
    });
    const workflow = AgentWorkflow.create({
      workspace,
      steps: [AgentStep({ id: 'agent', agent, prompt: 'read' })],
    });

    await workflow.run({ input: {} });
    await workflow.run({ input: {} });

    expect(calls).toBe(1);
    expect(cacheHit).toHaveBeenCalledWith(expect.objectContaining({ toolName: 'read_cached' }));
  });

  it('does not duplicate workspace adapters across repeated workflow runs', async () => {
    const adapter = createAdapter({ name: 'workspace-adapter-once', requires: [] });
    const workspace = AgentWorkspace.create({ adapters: [adapter] });
    const agent = Agent.create({ model: Provider.ollama['llama3.2'] });
    agent.run = vi.fn(async () => ({
      content: 'ok',
      cost: 0,
      tokensUsed: { prompt: 1, completion: 1, total: 2 },
      finishReason: 'stop',
      model: Provider.ollama['llama3.2'],
      provider: 'ollama',
    }));
    const workflow = AgentWorkflow.create({
      workspace,
      steps: [AgentStep({ id: 'agent', agent, prompt: 'run' })],
    });

    await workflow.run({ input: {} });
    await workflow.run({ input: {} });

    expect(agent.getAttachedAdapters().filter((item) => item.name === adapter.name)).toHaveLength(1);
  });

  it('persists WorkflowRun artifacts and emits artifact writes', async () => {
    const store = MemoryArtifactStore();
    const workspace = AgentWorkspace.create({ store });
    const writes = vi.fn();
    workspace.events.on('artifact.write', writes);
    const workflow = AgentWorkflow.create({
      workspace,
      steps: [CustomStep({ id: 's1', run: async () => 'done' })],
    });

    const result = await workflow.run({ input: { topic: 'x' } });
    const completed = await store.query('WorkflowRun', { status: 'completed' });

    expect(result.status).toBe('completed');
    expect(completed).toHaveLength(1);
    expect(writes).toHaveBeenCalledWith(expect.objectContaining({ type: 'WorkflowRun', operation: 'put' }));
    expect(writes).toHaveBeenCalledWith(expect.objectContaining({ type: 'WorkflowRun', operation: 'update' }));
  });

  it('persists failed WorkflowRuns and resumes from the first failed step', async () => {
    const store = MemoryArtifactStore();
    const workspace = AgentWorkspace.create({ store });
    const reads = vi.fn();
    workspace.events.on('artifact.read', reads);
    let shouldFail = true;
    const first = vi.fn(async () => 'first');
    const second = vi.fn(async () => {
      if (shouldFail) throw new Error('temporary');
      return 'second';
    });

    const workflow = AgentWorkflow.create({
      workspace,
      steps: [
        CustomStep({ id: 'first', run: first }),
        CustomStep({ id: 'second', run: second }),
      ],
    });

    const failed = await workflow.run({ input: { id: 1 } });
    const failedRuns = await store.query('WorkflowRun', { status: 'failed' });
    shouldFail = false;
    const runArtifact = failedRuns[0] as Record<string, unknown>;
    const resumed = await workflow.resume(String(runArtifact.id));
    const completedRuns = await store.query('WorkflowRun', { status: 'completed' });

    expect(failed.status).toBe('failed');
    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(2);
    expect(resumed.status).toBe('completed');
    expect(completedRuns).toHaveLength(1);
    expect(reads).toHaveBeenCalledWith({ type: 'WorkflowRun', id: runArtifact.id });
  });

  it('resume without workspace.store throws a clear error', async () => {
    const workflow = AgentWorkflow.create({
      steps: [CustomStep({ id: 's1', run: async () => 'done' })],
    });

    await expect(workflow.resume('missing')).rejects.toThrow('workspace.store');
  });
});

function mockAgent(name: string, content: string): Agent {
  const agent = Agent.create({ model: Provider.ollama['llama3.2'], name });
  vi.spyOn(agent, 'run').mockImplementation(async (_params: AgentRunParams): Promise<AgentResponse> => ({
    content,
    cost: 0,
    tokensUsed: { prompt: 1, completion: 1, total: 2 },
    finishReason: 'stop',
    model: agent.model,
    provider: agent.provider,
  }));
  return agent;
}
