import type { ModelCapabilities } from '../types/provider.types.js';

export interface TokensUsed {
  prompt: number;
  completion: number;
  total: number;
  cachedPrompt?: number;
  cacheWritePrompt?: number;
}

export interface CostOptions {
  region?: string;
  batch?: boolean;
  priority?: boolean;
  flex?: boolean;
  toolCalls?: number;
  searches?: number;
}

export interface CostBreakdown {
  inputCost: number;
  outputCost: number;
  cacheReadCost: number;
  cacheWriteCost: number;
  toolCost: number;
  searchCost: number;
  callCost: number;
  totalCost: number;
}

export class CostCalculator {
  calculate(tokensUsed: TokensUsed, caps: ModelCapabilities, options: CostOptions = {}): number {
    return this.calculateBreakdown(tokensUsed, caps, options).totalCost;
  }

  calculateBreakdown(tokensUsed: TokensUsed, caps: ModelCapabilities, options: CostOptions = {}): CostBreakdown {
    const pricing = resolvePricing(caps, tokensUsed, options.region);
    const cachedPrompt = tokensUsed.cachedPrompt ?? 0;
    const cacheWritePrompt = tokensUsed.cacheWritePrompt ?? 0;
    const billablePrompt = Math.max(0, tokensUsed.prompt - cachedPrompt - cacheWritePrompt);
    let inputCost = (billablePrompt / 1_000_000) * pricing.inputPerM;
    let outputCost = (tokensUsed.completion / 1_000_000) * pricing.outputPerM;
    let cacheReadCost = (cachedPrompt / 1_000_000) * pricing.inputPerM * (caps.cacheReadMultiplier ?? caps.cachedInputDiscount ?? 1);
    let cacheWriteCost = (cacheWritePrompt / 1_000_000) * pricing.inputPerM * (caps.cacheWriteMultiplier ?? 1);
    const discount = options.batch ? (caps.batchDiscount ?? 1) : options.flex ? (caps.flexDiscount ?? 1) : 1;
    const multiplier = options.priority ? (caps.priorityMultiplier ?? 1) : 1;
    inputCost *= discount * multiplier;
    outputCost *= discount * multiplier;
    cacheReadCost *= discount * multiplier;
    cacheWriteCost *= discount * multiplier;
    const toolCost = (options.toolCalls ?? 0) * (caps.toolCallCost ?? 0);
    const searchCost = (options.searches ?? 0) * (caps.searchCost ?? 0);
    const callCost = caps.costPerRequest ?? 0;

    return {
      inputCost,
      outputCost,
      cacheReadCost,
      cacheWriteCost,
      toolCost,
      searchCost,
      callCost,
      totalCost: inputCost + outputCost + cacheReadCost + cacheWriteCost + toolCost + searchCost + callCost,
    };
  }
}

function resolvePricing(caps: ModelCapabilities, tokensUsed: TokensUsed, region?: string): { inputPerM: number; outputPerM: number } {
  const tier = [...(caps.pricingTiers ?? [])]
    .sort((a, b) => b.minTokens - a.minTokens)
    .find((candidate) => tokensUsed.total >= candidate.minTokens);
  const regionOverride = region ? caps.regionPricing?.[region] : undefined;
  return {
    inputPerM: regionOverride?.inputPerM ?? tier?.inputPerM ?? caps.costPerMInputToken,
    outputPerM: regionOverride?.outputPerM ?? tier?.outputPerM ?? caps.costPerMOutputToken,
  };
}

// Module-level singleton - import this, do not instantiate CostCalculator directly.
export const costCalculator = new CostCalculator();
