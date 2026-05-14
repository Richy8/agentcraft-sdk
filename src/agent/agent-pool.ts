import { ConfigurationError, AgentCraftError, QuotaExceededError } from '../errors/index.js';
import type { ModelCapabilities, StreamChunk } from '../types/provider.types.js';
import type { Agent } from './agent.js';
import type { AgentPoolOptions, AgentResponse, AgentRunParams } from './types.js';

export class AgentPool {
  readonly agents: readonly Agent[];
  private readonly fallback: Agent | undefined;
  private counter = 0;

  private constructor(agents: Agent[], private readonly options: AgentPoolOptions) {
    this.agents = agents;
    this.fallback = options.fallback;
  }

  static create(agents: Agent[], options: AgentPoolOptions): AgentPool {
    if (agents.length === 0) {
      throw new ConfigurationError('AgentPool requires at least one agent');
    }
    if (options.fallback && agents.includes(options.fallback)) {
      throw new ConfigurationError('AgentPool fallback must not be one of the primary agents');
    }
    return new AgentPool(agents, options);
  }

  async run(params: AgentRunParams): Promise<AgentResponse> {
    const candidates = this.selectCandidates(params);
    let firstError: unknown;
    for (const candidate of candidates) {
      try {
        return await candidate.run(params);
      } catch (err) {
        firstError ??= err;
        if (!this.shouldFallback(err)) break;
      }
    }
    throw firstError;
  }

  async *stream(params: AgentRunParams): AsyncGenerator<StreamChunk> {
    const selected = this.selectAgent(this.options.strategy);
    let yielded = false;
    try {
      for await (const chunk of selected.stream(params)) {
        yielded = true;
        yield chunk;
      }
    } catch (err) {
      if (!yielded && this.fallback) {
        yield* this.fallback.stream(params);
        return;
      }
      throw err;
    }
  }

  get(name: string): Agent | undefined {
    return this.agents.find((agent) => agent.name === name);
  }

  private selectAgent(strategy: AgentPoolOptions['strategy']): Agent {
    if (strategy === 'round-robin') {
      return this.agents[this.counter++ % this.agents.length]!;
    }

    if (strategy === 'random') {
      return this.agents[Math.floor(Math.random() * this.agents.length)]!;
    }

    return this.agents.reduce((best, agent) => {
      const caps = agent.getCapabilities();
      const bestCaps = best.getCapabilities();
      const resolvedStrategy = strategy === 'best-fit' ? 'quality' : strategy;
      return score(caps, resolvedStrategy) >= score(bestCaps, resolvedStrategy) ? agent : best;
    });
  }

  private selectCandidates(params: AgentRunParams): Agent[] {
    const selected = this.selectAgent(this.options.strategy);
    const ordered = [selected, ...this.agents.filter((agent) => agent !== selected)];
    if (this.options.downgradeOnBudgetPressure && params.budget?.maxCost !== undefined) {
      ordered.sort((a, b) => score(b.getCapabilities(), 'cost') - score(a.getCapabilities(), 'cost'));
    }
    if (this.options.upgradeOnQualityFailure) {
      ordered.sort((a, b) => score(b.getCapabilities(), 'quality') - score(a.getCapabilities(), 'quality'));
    }
    return this.fallback ? [...ordered, this.fallback] : ordered;
  }

  private shouldFallback(err: unknown): boolean {
    const mode = this.options.fallbackMode ?? 'first-error';
    if (mode === 'none') return false;
    if (mode === 'all' || mode === 'first-error') return true;
    if (!(err instanceof AgentCraftError)) return false;
    if (this.options.downgradeOnBudgetPressure && err instanceof QuotaExceededError) return true;
    return mode === 'retryable' ? err.retryable : !err.retryable;
  }
}

function score(caps: ModelCapabilities, strategy: 'cost' | 'speed' | 'quality'): number {
  if (strategy === 'quality') return caps.qualityScore;
  if (strategy === 'speed') return caps.speedScore;

  const avg = (caps.costPerMInputToken + caps.costPerMOutputToken) / 2;
  const assumedTokensPerRequest = 2_000;
  const perCallFeeEquivalent = (caps.costPerRequest ?? 0) * (1_000_000 / assumedTokensPerRequest);
  const effectiveCost = avg + perCallFeeEquivalent;
  return effectiveCost === 0 ? Number.MAX_SAFE_INTEGER : 1 / effectiveCost;
}
