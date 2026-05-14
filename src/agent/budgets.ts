import { ContextWindowError, QuotaExceededError } from '../errors/index.js';
import type { ModelCapabilities } from '../types/provider.types.js';
import type { CostOptions, TokensUsed } from '../cost-calculator/index.js';
import { costCalculator } from '../cost-calculator/index.js';
import type { AgentResponse, AgentRunParams, RunBudget } from './types.js';

export interface CostEstimate {
  tokens: TokensUsed;
  estimatedCost: number;
  stalePricing: boolean;
}

export function estimateTokens(params: Pick<AgentRunParams, 'prompt' | 'system' | 'maxTokens' | 'tools'>, caps: ModelCapabilities): TokensUsed {
  const promptText = [params.system, params.prompt].filter(Boolean).join('\n\n');
  const prompt = estimateTextTokens(promptText) + estimateTextTokens(JSON.stringify(params.tools?.map((tool) => tool.parameters) ?? []));
  const completion = Math.min(params.maxTokens ?? Math.min(1024, caps.maxOutputTokens), caps.maxOutputTokens);
  return { prompt, completion, total: prompt + completion };
}

export function estimateRunCost(
  params: Pick<AgentRunParams, 'prompt' | 'system' | 'maxTokens' | 'tools'>,
  caps: ModelCapabilities,
  options: CostOptions = {}
): CostEstimate {
  const tokens = estimateTokens(params, caps);
  return {
    tokens,
    estimatedCost: costCalculator.calculate(tokens, caps, options),
    stalePricing: isPricingStale(caps.pricingMetadata?.updatedAt),
  };
}

export function enforcePreflight(params: AgentRunParams, caps: ModelCapabilities, model: string, provider: string, budget?: RunBudget): void {
  const estimate = estimateRunCost(params, caps, budget?.costOptions);
  if (estimate.tokens.total > caps.maxContextLength) {
    throw new ContextWindowError(model, provider, { estimatedTokens: estimate.tokens.total, contextWindow: caps.maxContextLength });
  }
  if (budget?.maxInputTokens !== undefined && estimate.tokens.prompt > budget.maxInputTokens) {
    throw new QuotaExceededError(provider, { budget: 'maxInputTokens', limit: budget.maxInputTokens, estimated: estimate.tokens.prompt });
  }
  if (budget?.maxOutputTokens !== undefined && estimate.tokens.completion > budget.maxOutputTokens) {
    throw new QuotaExceededError(provider, { budget: 'maxOutputTokens', limit: budget.maxOutputTokens, estimated: estimate.tokens.completion });
  }
  if (budget?.maxTokens !== undefined && estimate.tokens.total > budget.maxTokens) {
    throw new QuotaExceededError(provider, { budget: 'maxTokens', limit: budget.maxTokens, estimated: estimate.tokens.total });
  }
  if (budget?.maxCost !== undefined && estimate.estimatedCost > budget.maxCost) {
    throw new QuotaExceededError(provider, { budget: 'maxCost', limit: budget.maxCost, estimated: estimate.estimatedCost });
  }
}

export function enforcePostRunBudget(response: AgentResponse, budget: RunBudget | undefined, provider: string): void {
  if (!budget) return;
  if (budget.maxCost !== undefined && response.cost > budget.maxCost) {
    throw new QuotaExceededError(provider, { budget: 'maxCost', limit: budget.maxCost, actual: response.cost });
  }
  if (budget.maxTokens !== undefined && response.tokensUsed.total > budget.maxTokens) {
    throw new QuotaExceededError(provider, { budget: 'maxTokens', limit: budget.maxTokens, actual: response.tokensUsed.total });
  }
}

export function isPricingStale(updatedAt: string | undefined, now = new Date()): boolean {
  if (!updatedAt || updatedAt === 'local' || updatedAt === 'package-default') return true;
  const updated = new Date(updatedAt);
  if (Number.isNaN(updated.getTime())) return true;
  return now.getTime() - updated.getTime() > 1000 * 60 * 60 * 24 * 90;
}

function estimateTextTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
