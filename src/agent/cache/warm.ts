import type { Agent } from "../agent.js";
import type { AgentRunParams, TokenUsage } from "../types.js";
import type { AgentCacheWarmOptions, AgentCacheWarmResult } from "./types.js";

export async function warmAgentCache(
  agent: Pick<Agent, "run">,
  prompts: readonly (string | AgentRunParams)[],
  options: AgentCacheWarmOptions,
): Promise<AgentCacheWarmResult> {
  const dryRun = options.dryRun === true;
  const concurrency = Math.max(1, options.concurrency ?? 2);
  const errors: string[] = [];
  let cursor = 0;
  let succeeded = 0;
  let failed = 0;
  let cost = 0;
  let tokensUsed: TokenUsage = { prompt: 0, completion: 0, total: 0 };
  let cache = { hits: 0, misses: 0, writes: 0 };

  if (dryRun) {
    return {
      dryRun,
      attempted: prompts.length,
      succeeded: prompts.length,
      failed: 0,
      cost: 0,
      tokensUsed: prompts.reduce<TokenUsage>(
        (sum, prompt) => {
          const text = typeof prompt === "string" ? prompt : prompt.prompt ?? "";
          const estimate = Math.ceil(text.length / 4);
          return {
            prompt: sum.prompt + estimate,
            completion: sum.completion,
            total: sum.total + estimate,
          };
        },
        { prompt: 0, completion: 0, total: 0 },
      ),
      cache,
      errors,
    };
  }

  async function worker(): Promise<void> {
    while (cursor < prompts.length) {
      const index = cursor++;
      const prompt = prompts[index]!;
      try {
        const response = await agent.run(
          typeof prompt === "string" ? { prompt } : prompt,
        );
        succeeded++;
        cost += response.cost;
        tokensUsed = addTokens(tokensUsed, response.tokensUsed);
        cache = {
          hits: cache.hits + (response.cache?.hits ?? 0),
          misses: cache.misses + (response.cache?.misses ?? 0),
          writes: cache.writes + (response.cache?.writes ?? 0),
        };
      } catch (error) {
        failed++;
        errors.push(error instanceof Error ? error.message : String(error));
        if (options.stopOnError !== false) break;
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, prompts.length) }, () => worker()));
  return {
    dryRun,
    attempted: prompts.length,
    succeeded,
    failed,
    cost,
    tokensUsed,
    cache,
    errors,
  };
}

function addTokens(left: TokenUsage, right: TokenUsage): TokenUsage {
  return {
    prompt: left.prompt + right.prompt,
    completion: left.completion + right.completion,
    total: left.total + right.total,
  };
}
