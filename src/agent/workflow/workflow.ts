import { randomUUID } from 'node:crypto';
import { AgentWorkspace } from '../workspace.js';
import type {
  AgentWorkflowConfig,
  WorkflowContext,
  WorkflowInstance,
  WorkflowInspection,
  WorkflowResult,
  WorkflowRunArtifact,
  WorkflowRunOptions,
  WorkflowStep,
  WorkflowStepResult,
} from './types.js';

type WorkflowStatus = WorkflowResult['status'];

export const AgentWorkflow = {
  /** Create a workflow instance with run, resume, and inspect methods. */
  create<TInput = unknown>(config: AgentWorkflowConfig<TInput>): WorkflowInstance<TInput> {
    const workflowId = config.id ?? `workflow-${randomUUID().slice(0, 8)}`;
    const workspace = config.workspace ?? AgentWorkspace.memory();

    async function run(options: WorkflowRunOptions<TInput>): Promise<WorkflowResult<TInput>> {
      const startTime = Date.now();
      const startedAt = new Date().toISOString();
      const validatedInput = validateInput(workflowId, config, options.input);
      const previousSteps = options._resumeFrom?.completedSteps ?? [];
      const previousById = new Map(previousSteps.map((step) => [step.stepId, step]));
      let runId = options._resumeFrom?.runArtifactId ?? randomUUID();

      const ctx: WorkflowContext<TInput> = {
        input: validatedInput,
        steps: Object.fromEntries(previousSteps.map((step) => [step.stepId, step])),
        workspace,
        store: workspace.store,
        runId,
      };

      let runArtifactId = options._resumeFrom?.runArtifactId;
      if (ctx.store && !runArtifactId) {
        runArtifactId = await ctx.store.put('WorkflowRun', {
          workflowId,
          type: 'WorkflowRun',
          status: 'running',
          input: validatedInput,
          steps: [],
          startedAt,
        });
        runId = runArtifactId;
        workspace.events.emit('artifact.write', {
          type: 'WorkflowRun',
          id: runArtifactId,
          operation: 'put',
        });
      }

      const stepResults: WorkflowStepResult[] = [...previousSteps];
      let workflowStatus: WorkflowStatus = 'completed';

      for (const step of config.steps) {
        if (previousById.has(step.stepId)) continue;
        const result = await runOneStep(step, ctx, config);
        stepResults.push(result);
        ctx.steps[step.stepId] = result;

        if (ctx.store && runArtifactId) {
          await ctx.store.update(runArtifactId, {
            steps: stepResults,
            status: result.status === 'failed' ? 'failed' : 'running',
          });
          workspace.events.emit('artifact.write', {
            type: 'WorkflowRun',
            id: runArtifactId,
            operation: 'update',
          });
        }

        if (result.status === 'failed') {
          workflowStatus = 'failed';
          break;
        }
      }

      if (workflowStatus !== 'failed') {
        workflowStatus = stepResults.some((step) => step.status === 'skipped') ? 'partial' : 'completed';
      }

      if (ctx.store && runArtifactId) {
        await ctx.store.update(runArtifactId, {
          status: workflowStatus,
          steps: stepResults,
          completedAt: new Date().toISOString(),
        });
        workspace.events.emit('artifact.write', {
          type: 'WorkflowRun',
          id: runArtifactId,
          operation: 'update',
        });
      }

      return {
        runId,
        status: workflowStatus,
        input: validatedInput,
        steps: stepResults,
        totalCost: sumCost(stepResults),
        durationMs: Date.now() - startTime,
      };
    }

    return {
      inspect(): WorkflowInspection {
        return {
          workflowId,
          steps: config.steps.map((step) => ({ stepId: step.stepId, type: step.type })),
        };
      },

      run,

      async resume(runArtifactId: string): Promise<WorkflowResult<TInput>> {
        if (!workspace.store) {
          throw new Error(
            `AgentWorkflow '${workflowId}': resume() requires workspace.store. Add an ArtifactStore to the workspace to enable resumability.`,
          );
        }

        const stored = (await workspace.store.get('WorkflowRun', runArtifactId)) as WorkflowRunArtifact | undefined;
        workspace.events.emit('artifact.read', { type: 'WorkflowRun', id: runArtifactId });
        if (!stored) throw new Error(`AgentWorkflow: WorkflowRun '${runArtifactId}' not found in store`);

        const completedSteps = stored.steps.filter((step) => step.status === 'completed');
        return await run({
          input: stored.input as TInput,
          _resumeFrom: { completedSteps, runArtifactId },
        });
      },
    };
  },
} as const;

async function runOneStep<TInput>(
  step: WorkflowStep,
  ctx: WorkflowContext<TInput>,
  config: AgentWorkflowConfig<TInput>,
): Promise<WorkflowStepResult> {
  const startedAt = Date.now();
  ctx.workspace.events.emit('workflow.step.started', {
    stepId: step.stepId,
    type: step.type,
  });

  try {
    const output = await step.execute(ctx);
    const result: WorkflowStepResult = {
      stepId: step.stepId,
      status: 'completed',
      output,
      durationMs: Date.now() - startedAt,
    };
    await config.onStepComplete?.(step.stepId, output, ctx);
    ctx.workspace.events.emit('workflow.step.completed', {
      stepId: step.stepId,
      status: 'completed',
    });
    return result;
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error(String(error));
    const result: WorkflowStepResult = {
      stepId: step.stepId,
      status: 'failed',
      error: normalized.message,
      durationMs: Date.now() - startedAt,
    };
    await config.onStepError?.(step.stepId, normalized, ctx);
    ctx.workspace.events.emit('workflow.step.completed', {
      stepId: step.stepId,
      status: 'failed',
    });
    return result;
  }
}

function validateInput<TInput>(
  workflowId: string,
  config: AgentWorkflowConfig<TInput>,
  input: TInput,
): TInput {
  if (!config.input) return input;
  const result = config.input.safeParse(input);
  if (!result.success) {
    throw new Error(`AgentWorkflow '${workflowId}': invalid input - ${result.error.message}`);
  }
  return result.data;
}

function sumCost(results: readonly WorkflowStepResult[]): number {
  return results.reduce((total, step) => total + (step.cost ?? 0), 0);
}
