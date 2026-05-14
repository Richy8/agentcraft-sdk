import { randomUUID } from 'node:crypto';
import type { Agent } from '../agent.js';
import type { AgentWorkspaceInstance } from '../workspace.js';
import type {
  AgentStepConfig,
  ApprovalStepConfig,
  ConditionStepConfig,
  CustomStepConfig,
  ParallelStepConfig,
  RetryStepConfig,
  TeamStepConfig,
  ToolStepConfig,
  WorkflowContext,
  WorkflowStep,
  WorkflowStepResult,
} from './types.js';

function makeId(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

/** Create a step that runs one Agent. */
export function AgentStep(config: AgentStepConfig): WorkflowStep {
  const stepId = config.id ?? makeId('agent');
  return {
    stepId,
    type: 'agent',
    async execute(ctx: WorkflowContext): Promise<unknown> {
      return withRetry(config.retry, async () => {
        if (!config.agent) throw new Error(`AgentStep '${stepId}': no agent provided`);
        applyWorkspaceToAgent(config.agent, ctx.workspace);
        const prompt = typeof config.prompt === 'function' ? await config.prompt(ctx) : config.prompt;
        const response = await config.agent.run({
          prompt,
          ...(config.toolPolicy !== undefined && { toolPolicy: config.toolPolicy }),
          ...(config.responseSchema !== undefined && { responseSchema: config.responseSchema }),
        });
        return response.structuredResponse ?? response.content;
      });
    },
  };
}

/** Create a step that gates execution through an approval callback. */
export function ApprovalStep(config: ApprovalStepConfig): WorkflowStep {
  const stepId = config.id ?? makeId('approval');
  return {
    stepId,
    type: 'approval',
    async execute(ctx: WorkflowContext): Promise<unknown> {
      const approved = await withOptionalTimeout(
        Promise.resolve(config.approve ? config.approve(ctx) : true),
        config.timeoutMs,
        `ApprovalStep '${stepId}' timed out`,
      );
      if (approved) {
        await config.onApproved?.(ctx);
        return { approved: true, description: config.description };
      }
      await config.onRejected?.(ctx, 'Rejected by approval callback');
      throw new Error(`ApprovalStep '${stepId}': rejected - ${config.description}`);
    },
  };
}

/** Create a step that executes one branch based on a predicate. */
export function ConditionStep(config: ConditionStepConfig): WorkflowStep {
  const stepId = config.id ?? makeId('condition');
  return {
    stepId,
    type: 'condition',
    async execute(ctx: WorkflowContext): Promise<unknown> {
      const result = await config.condition(ctx);
      const branch = result ? config.ifTrue : config.ifFalse;
      if (!branch) return { conditionResult: result, branchExecuted: false };

      const steps = Array.isArray(branch) ? branch : [branch];
      const outputs: unknown[] = [];
      for (const step of steps) {
        const start = Date.now();
        const output = await step.execute(ctx);
        ctx.steps[step.stepId] = {
          stepId: step.stepId,
          status: 'completed',
          output,
          durationMs: Date.now() - start,
        };
        outputs.push(output);
      }
      return { conditionResult: result, branchExecuted: true, outputs };
    },
  };
}

/** Create a step that runs child steps concurrently. */
export function ParallelStep(config: ParallelStepConfig): WorkflowStep {
  const stepId = config.id ?? makeId('parallel');
  const failFast = config.failFast ?? true;
  return {
    stepId,
    type: 'parallel',
    async execute(ctx: WorkflowContext): Promise<unknown> {
      const results = await Promise.allSettled(
        config.steps.map(async (step): Promise<{ step: WorkflowStep; result: WorkflowStepResult }> => {
          const start = Date.now();
          try {
            const output = await step.execute(ctx);
            return {
              step,
              result: {
                stepId: step.stepId,
                status: 'completed',
                output,
                durationMs: Date.now() - start,
              },
            };
          } catch (error) {
            return {
              step,
              result: {
                stepId: step.stepId,
                status: 'failed',
                error: errorMessage(error),
                durationMs: Date.now() - start,
              },
            };
          }
        }),
      );

      const outputs: Record<string, unknown> = {};
      const errors: string[] = [];
      for (const settled of results) {
        if (settled.status === 'rejected') {
          errors.push(errorMessage(settled.reason));
          continue;
        }
        ctx.steps[settled.value.step.stepId] = settled.value.result;
        if (settled.value.result.status === 'completed') {
          outputs[settled.value.step.stepId] = settled.value.result.output;
        } else {
          errors.push(`${settled.value.step.stepId}: ${settled.value.result.error ?? 'failed'}`);
        }
      }

      if (failFast && errors.length > 0) {
        throw new Error(`ParallelStep '${stepId}' had failures:\n${errors.join('\n')}`);
      }
      return outputs;
    },
  };
}

/** Create a step that calls a named tool returned by adapter.getTools(). */
export function ToolStep(config: ToolStepConfig): WorkflowStep {
  const stepId = config.id ?? makeId('tool');
  return {
    stepId,
    type: 'tool',
    async execute(ctx: WorkflowContext): Promise<unknown> {
      return withRetry(config.retry, async () => {
        const adapter = typeof config.adapter === 'function' ? config.adapter(ctx) : config.adapter;
        const args = typeof config.args === 'function' ? await config.args(ctx) : config.args;
        const tools = (await adapter.getTools?.()) ?? [];
        const tool = tools.find((item) => item.name === config.toolName);
        if (!tool) {
          throw new Error(
            `ToolStep '${stepId}': tool '${config.toolName}' not found in adapter '${adapter.name}'. ` +
              `Available tools: ${tools.map((item) => item.name).join(', ')}`,
          );
        }
        return await tool.execute(args);
      });
    },
  };
}

/** Create a step that runs an AgentTeam. */
export function TeamStep(config: TeamStepConfig): WorkflowStep {
  const stepId = config.id ?? makeId('team');
  return {
    stepId,
    type: 'team',
    async execute(ctx: WorkflowContext): Promise<unknown> {
      return withRetry(config.retry, async () => {
        const prompt = typeof config.prompt === 'function' ? await config.prompt(ctx) : config.prompt;
        const response = await config.team.run({ prompt });
        return response.content;
      });
    },
  };
}

/** Create a step that runs arbitrary async application logic. */
export function CustomStep(config: CustomStepConfig): WorkflowStep {
  const stepId = config.id ?? makeId('custom');
  return {
    stepId,
    type: 'custom',
    async execute(ctx: WorkflowContext): Promise<unknown> {
      return withRetry(config.retry, () => config.run(ctx));
    },
  };
}

function applyWorkspaceToAgent(agent: Agent, workspace: AgentWorkspaceInstance): void {
  if (workspace.cache) agent.setCache(workspace.cache);
  agent.setEventEmitter(workspace.events);
  agent.mergeToolPolicy(workspace.toolPolicy);
  for (const adapter of workspace.adapters) agent.use(adapter);
  for (const mcp of workspace.mcps) agent.use(mcp);
}

async function withRetry<T>(retry: RetryStepConfig | undefined, run: () => T | Promise<T>): Promise<T> {
  const attempts = Math.max(1, retry?.attempts ?? 1);
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      if (attempt < attempts && retry?.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, retry.delayMs));
      }
    }
  }
  throw lastError;
}

async function withOptionalTimeout<T>(value: Promise<T>, timeoutMs: number | undefined, message: string): Promise<T> {
  if (!timeoutMs) return await value;
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      value,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
