import type { BestFitCriteria, ModelConfig } from '../types/config.types.js';
import { type ModelRegistry, modelRegistry } from './registry.js';

const ASSUMED_TOKENS_PER_REQUEST = 2_000;

export class BestFitResolver {
  constructor(private readonly registry: ModelRegistry = modelRegistry) {}

  resolve(candidates: ModelConfig[], criteria: BestFitCriteria): ModelConfig {
    if (candidates.length === 0) {
      throw new Error('BestFitResolver: no candidate models provided.');
    }

    if (candidates.length === 1) return candidates[0]!;

    return candidates.reduce((best, current) => {
      const bestScore = this.score(best, criteria);
      const currentScore = this.score(current, criteria);
      return currentScore > bestScore ? current : best;
    });
  }

  resolveForWorkload(candidates: ModelConfig[], workload: { promptTokens?: number; outputTokens?: number; qualityFloor?: number; maxCost?: number; needsTools?: boolean; needsVision?: boolean }): ModelConfig {
    const viable = candidates.filter((candidate) => {
      const caps = this.registry.getCapabilities(candidate.provider, candidate.model);
      if (workload.qualityFloor !== undefined && caps.qualityScore < workload.qualityFloor) return false;
      if (workload.needsTools && !caps.supportsTools) return false;
      if (workload.needsVision && !caps.supportsVision) return false;
      if (workload.maxCost !== undefined) {
        const cost = ((workload.promptTokens ?? 0) / 1_000_000) * caps.costPerMInputToken
          + ((workload.outputTokens ?? 0) / 1_000_000) * caps.costPerMOutputToken
          + (caps.costPerRequest ?? 0);
        if (cost > workload.maxCost) return false;
      }
      return true;
    });
    return this.resolve(viable.length ? viable : candidates, workload.maxCost !== undefined ? 'cost' : 'quality');
  }

  private score(model: ModelConfig, criteria: BestFitCriteria): number {
    const caps = this.registry.getCapabilities(model.provider, model.model);

    switch (criteria) {
      case 'quality':
        return caps.qualityScore;
      case 'speed':
        return caps.speedScore;
      case 'cost': {
        const avgCostPerM = (caps.costPerMInputToken + caps.costPerMOutputToken) / 2;
        const perCallFeeEquiv = (caps.costPerRequest ?? 0) * (1_000_000 / ASSUMED_TOKENS_PER_REQUEST);
        const effectiveCostPerM = avgCostPerM + perCallFeeEquiv;
        if (effectiveCostPerM === 0) return Number.MAX_SAFE_INTEGER;
        return 1 / effectiveCostPerM;
      }
    }
  }
}
