import { describe, expect, it } from 'vitest';
import { QuotaExceededError } from '../../../errors/index.js';
import { createToolExecutionBudget, executeToolWithBudget } from '../tool-budget.js';

const tool = {
  name: 'search',
  description: 'Search.',
  parameters: { type: 'object' as const, properties: {}, required: [] },
  execute: async () => 'ok',
};

describe('ToolBudgetEnforcer', () => {
  it('counts tool calls and fails closed after the configured limit', async () => {
    const budget = createToolExecutionBudget({
      prompt: 'use tools',
      budget: { maxToolCalls: 1 },
    });

    await expect(
      executeToolWithBudget({
        provider: 'openai',
        tool,
        args: {},
        execute: tool.execute,
        budget,
      })
    ).resolves.toBe('ok');
    await expect(
      executeToolWithBudget({
        provider: 'openai',
        tool,
        args: {},
        execute: tool.execute,
        budget,
      })
    ).rejects.toBeInstanceOf(QuotaExceededError);
  });
});
