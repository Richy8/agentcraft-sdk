import { QuotaExceededError } from '../../errors/index.js';
import type { ToolDefinition } from '../../protocols/types.js';
import type { AgentRunParams } from '../types.js';

export interface ToolExecutionBudget {
  max?: number;
  count: number;
}

export function createToolExecutionBudget(params: AgentRunParams): ToolExecutionBudget {
  return {
    ...(params.budget?.maxToolCalls !== undefined && { max: params.budget.maxToolCalls }),
    count: 0,
  };
}

export async function executeToolWithBudget(input: {
  readonly provider: string;
  readonly tool: ToolDefinition;
  readonly args: Record<string, unknown>;
  readonly execute: (args: Record<string, unknown>) => Promise<unknown>;
  readonly budget: ToolExecutionBudget;
}): Promise<unknown> {
  if (input.budget.max !== undefined && input.budget.count >= input.budget.max) {
    throw new QuotaExceededError(input.provider, {
      budget: 'maxToolCalls',
      limit: input.budget.max,
      actual: input.budget.count + 1,
      toolName: input.tool.name,
    });
  }
  input.budget.count++;
  return await input.execute(input.args);
}

export function wrapToolExecutionBudget(
  tool: ToolDefinition,
  budget: ToolExecutionBudget,
  provider: string
): ToolDefinition {
  return {
    ...tool,
    execute: async (args) =>
      await executeToolWithBudget({
        provider,
        tool,
        args,
        execute: tool.execute.bind(tool),
        budget,
      }),
  };
}
