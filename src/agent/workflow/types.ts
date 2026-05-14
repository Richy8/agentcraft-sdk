import type { z } from 'zod';
import type { AgentAdapter } from '../adapters/types.js';
import type { ToolPolicy } from '../adapters/tool-policy.js';
import type { Agent } from '../agent.js';
import type { AgentTeam } from '../agent-team.js';
import type { AgentWorkspaceInstance } from '../workspace.js';
import type { ArtifactStore } from '../../artifact-store/types.js';
import type { StructuredOutputSchema } from '../structured-output.js';
import type { TokenUsage } from '../types.js';

/** Status values recorded for workflow steps. */
export type WorkflowStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'awaiting_approval';

/** Result captured for one workflow step execution. */
export interface WorkflowStepResult {
  readonly stepId: string;
  readonly status: WorkflowStepStatus;
  readonly output?: unknown;
  readonly error?: string;
  readonly durationMs: number;
  readonly cost?: number;
  readonly tokensUsed?: TokenUsage;
}

/** Final result returned by workflow.run() and workflow.resume(). */
export interface WorkflowResult<TInput = unknown> {
  readonly runId: string;
  readonly status: 'completed' | 'failed' | 'partial';
  readonly input: TInput;
  readonly steps: WorkflowStepResult[];
  readonly totalCost: number;
  readonly durationMs: number;
}

/** Context object passed to every workflow step. */
export interface WorkflowContext<TInput = unknown> {
  readonly input: TInput;
  readonly steps: Record<string, WorkflowStepResult>;
  readonly workspace: AgentWorkspaceInstance;
  readonly store: ArtifactStore | undefined;
  readonly runId: string;
}

/** Executable workflow step contract implemented by all step factories. */
export interface WorkflowStep {
  readonly stepId: string;
  readonly type: string;
  execute(ctx: WorkflowContext): Promise<unknown>;
}

/** Retry settings shared by retryable step factories. */
export interface RetryStepConfig {
  readonly attempts: number;
  readonly delayMs?: number;
}

/** Configuration for AgentStep. */
export interface AgentStepConfig {
  readonly id?: string;
  readonly agent?: Agent;
  readonly prompt: string | ((ctx: WorkflowContext) => string | Promise<string>);
  readonly responseSchema?: StructuredOutputSchema;
  readonly toolPolicy?: ToolPolicy;
  readonly retry?: RetryStepConfig;
  readonly onError?: 'fail' | 'skip';
}

/** Configuration for ApprovalStep. */
export interface ApprovalStepConfig {
  readonly id?: string;
  readonly description: string;
  readonly onApproved?: (ctx: WorkflowContext) => void | Promise<void>;
  readonly onRejected?: (ctx: WorkflowContext, reason?: string) => void | Promise<void>;
  readonly approve?: (ctx: WorkflowContext) => boolean | Promise<boolean>;
  readonly timeoutMs?: number;
}

/** Configuration for ConditionStep. */
export interface ConditionStepConfig {
  readonly id?: string;
  readonly condition: (ctx: WorkflowContext) => boolean | Promise<boolean>;
  readonly ifTrue?: WorkflowStep | readonly WorkflowStep[];
  readonly ifFalse?: WorkflowStep | readonly WorkflowStep[];
}

/** Configuration for ParallelStep. */
export interface ParallelStepConfig {
  readonly id?: string;
  readonly steps: readonly WorkflowStep[];
  readonly failFast?: boolean;
}

/** Configuration for ToolStep; toolName must match adapter.getTools(). */
export interface ToolStepConfig {
  readonly id?: string;
  readonly adapter: AgentAdapter | ((ctx: WorkflowContext) => AgentAdapter);
  readonly toolName: string;
  readonly args:
    | Record<string, unknown>
    | ((ctx: WorkflowContext) => Record<string, unknown> | Promise<Record<string, unknown>>);
  readonly retry?: RetryStepConfig;
}

/** Configuration for TeamStep. */
export interface TeamStepConfig {
  readonly id?: string;
  readonly team: AgentTeam;
  readonly prompt: string | ((ctx: WorkflowContext) => string | Promise<string>);
  readonly retry?: RetryStepConfig;
}

/** Configuration for CustomStep. */
export interface CustomStepConfig {
  readonly id?: string;
  readonly run: (ctx: WorkflowContext) => unknown | Promise<unknown>;
  readonly retry?: RetryStepConfig;
}

/** Definition passed to AgentWorkflow.create(). */
export interface AgentWorkflowConfig<TInput = unknown> {
  readonly id?: string;
  readonly input?: z.ZodType<TInput>;
  readonly workspace?: AgentWorkspaceInstance;
  readonly steps: readonly WorkflowStep[];
  readonly onStepComplete?: (stepId: string, output: unknown, ctx: WorkflowContext<TInput>) => void | Promise<void>;
  readonly onStepError?: (stepId: string, error: Error, ctx: WorkflowContext<TInput>) => void | Promise<void>;
}

/** Static workflow graph returned by workflow.inspect(). */
export interface WorkflowInspection {
  readonly workflowId: string;
  readonly steps: Array<{
    readonly stepId: string;
    readonly type: string;
  }>;
}

/** Internal resume state used to skip already completed steps. */
export interface WorkflowResumeState {
  readonly completedSteps: readonly WorkflowStepResult[];
  readonly runArtifactId: string;
}

/** Options passed to workflow.run(). */
export interface WorkflowRunOptions<TInput> {
  readonly input: TInput;
  /** @internal Used by resume() to continue from persisted completed steps. */
  readonly _resumeFrom?: WorkflowResumeState;
}

/** Workflow instance returned by AgentWorkflow.create(). */
export interface WorkflowInstance<TInput = unknown> {
  run(options: WorkflowRunOptions<TInput>): Promise<WorkflowResult<TInput>>;
  inspect(): WorkflowInspection;
  /**
   * Resume a previously failed workflow run from the first incomplete step.
   * Requires `workspace.store` so the previous `WorkflowRun` artifact can be loaded.
   */
  resume(runArtifactId: string): Promise<WorkflowResult<TInput>>;
}

/** Persisted ArtifactStore record used for workflow resumability. */
export interface WorkflowRunArtifact {
  readonly id: string;
  readonly workflowId: string;
  readonly type: 'WorkflowRun';
  readonly status: 'running' | 'completed' | 'failed' | 'partial';
  readonly input: unknown;
  readonly steps: WorkflowStepResult[];
  readonly startedAt: string;
  readonly completedAt?: string;
  readonly createdAt: string;
}
