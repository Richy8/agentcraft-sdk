import { ContextWindowError, QuotaExceededError } from '../errors/index.js';
import { MODEL_CATALOG } from '../model-registry/catalog.js';
import type { ModelCapabilities } from '../types/provider.types.js';
import type { CostOptions, TokensUsed } from '../cost-calculator/index.js';
import { costCalculator } from '../cost-calculator/index.js';
import type { AgentResponse, AgentRunParams, CostReport, RunBudget } from './types.js';

export interface CostEstimate {
  tokens: TokensUsed;
  estimatedCost: number;
  stalePricing: boolean;
}

export interface PricingStalenessReport {
  readonly generatedAt: string;
  readonly thresholdDays: number;
  readonly totalModels: number;
  readonly staleModels: number;
  readonly freshModels: number;
  readonly entries: readonly {
    readonly model: string;
    readonly provider: string;
    readonly updatedAt?: string;
    readonly stale: boolean;
    readonly reason: 'missing' | 'local' | 'invalid' | 'expired' | 'fresh';
  }[];
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
    throw new QuotaExceededError(provider, {
      budget: 'maxCost',
      limit: budget.maxCost,
      estimated: estimate.estimatedCost,
      mode: budget.mode ?? 'fail-closed',
      preferCache: budget.mode === 'prefer-cache',
      downgradeRecommended: budget.mode === 'downgrade-model',
      approvalRecommended: budget.mode === 'request-approval',
    });
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

export function createPricingStalenessReport(config: {
  catalog?: Record<string, ModelCapabilities>;
  now?: Date;
  thresholdDays?: number;
} = {}): PricingStalenessReport {
  const now = config.now ?? new Date();
  const thresholdDays = config.thresholdDays ?? 90;
  const thresholdMs = 1000 * 60 * 60 * 24 * thresholdDays;
  const entries = Object.entries(config.catalog ?? MODEL_CATALOG).map(
    ([modelKey, caps]) => {
      const updatedAt = caps.pricingMetadata?.updatedAt;
      const provider = modelKey.split(':')[0] ?? 'unknown';
      const parsed = updatedAt ? new Date(updatedAt) : undefined;
      const reason: PricingStalenessReport['entries'][number]['reason'] =
        !updatedAt
          ? 'missing'
          : updatedAt === 'local' || updatedAt === 'package-default'
            ? 'local'
            : !parsed || Number.isNaN(parsed.getTime())
              ? 'invalid'
              : now.getTime() - parsed.getTime() > thresholdMs
                ? 'expired'
                : 'fresh';
      const stale = reason !== 'fresh';
      return {
        model: modelKey,
        provider,
        ...(updatedAt !== undefined && { updatedAt }),
        stale,
        reason,
      };
    },
  );
  const staleModels = entries.filter((entry) => entry.stale).length;
  return {
    generatedAt: now.toISOString(),
    thresholdDays,
    totalModels: entries.length,
    staleModels,
    freshModels: entries.length - staleModels,
    entries,
  };
}

export function createRunCostReport(config: {
  scope: CostReport['scope'];
  provider: string;
  model: string;
  caps: ModelCapabilities;
  response: Pick<AgentResponse, 'tokensUsed' | 'cost' | 'cache' | 'selection'>;
  budget?: RunBudget;
  estimate?: CostEstimate;
}): CostReport {
  const options = config.budget?.costOptions ?? {};
  const executedToolCalls = config.response.selection?.executedToolCalls ?? 0;
  const exposedTools = config.response.selection?.exposedTools ?? [];
  const searchCount = exposedTools.filter((name) => /search|serp/i.test(name)).length;
  const breakdown = costCalculator.calculateBreakdown(config.response.tokensUsed, config.caps, {
    ...options,
    toolCalls: options.toolCalls ?? executedToolCalls,
    searches: options.searches ?? searchCount,
  });
  return {
    scope: config.scope,
    provider: config.provider,
    model: config.model,
    tokens: {
      ...(config.estimate !== undefined && { estimated: config.estimate.tokens }),
      actual: config.response.tokensUsed,
    },
    costs: {
      ...(config.estimate !== undefined && { estimatedModelCost: config.estimate.estimatedCost }),
      actualModelCost: config.response.cost,
      toolCostEstimate: breakdown.toolCost,
      searchCostEstimate: breakdown.searchCost,
      cacheSavingsEstimate: config.response.cache?.summary?.estimatedCostSaved ?? 0,
      totalEstimate: config.response.cost + breakdown.toolCost + breakdown.searchCost,
    },
    ...(config.response.cache?.summary !== undefined && { cache: config.response.cache.summary }),
    stalePricing: config.estimate?.stalePricing ?? isPricingStale(config.caps.pricingMetadata?.updatedAt),
    budgetMode: config.budget?.mode ?? 'fail-closed',
  };
}

function estimateTextTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}
