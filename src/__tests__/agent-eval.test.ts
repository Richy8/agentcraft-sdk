import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AgentEval } from "../agent/eval/index.js";
import type { AgentResponse } from "../agent/types.js";

describe("AgentEval", () => {
  it("runs deterministic assertions and writes markdown/json reports", async () => {
    const suite = AgentEval.suite({
      name: "mock eval",
      defaults: {
        maxCostUsd: 0.01,
        maxTotalTokens: 100,
        minQualityScore: 0.5,
      },
    }).case({
      name: "cache-aware answer",
      prompt: "Explain cache-aware agents.",
      assertions: [
        AgentEval.assert.contains("cache"),
        AgentEval.assert.skillActivated("writing"),
      ],
      expect: {
        activeSkills: ["writing"],
        maxToolCalls: 1,
        cache: { minHitRate: 0.5 },
      },
      rubric: ["Mentions cache savings."],
    });

    const report = await AgentEval.run({
      agent: {
        run: async () =>
          response({
            content: "cache savings improve repeated agent runs.",
            activeSkills: ["writing"],
            cacheHits: 1,
            cacheMisses: 1,
            toolCalls: 1,
          }),
      },
      suite,
    });

    expect(report.status).toBe("passed");
    expect(report.results[0]?.assertions.every((item) => item.passed)).toBe(true);

    const root = await mkdtemp(join(tmpdir(), "agentcraft-eval-"));
    try {
      const markdownPath = join(root, "eval.md");
      const jsonPath = join(root, "eval.json");
      await AgentEval.writeMarkdown(report, markdownPath);
      await AgentEval.writeJson(report, jsonPath);

      expect(await readFile(markdownPath, "utf8")).toContain("mock eval");
      expect(JSON.parse(await readFile(jsonPath, "utf8"))).toMatchObject({
        status: "passed",
      });
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails with actionable messages when gates are violated", async () => {
    const suite = AgentEval.suite({
      name: "failing eval",
      defaults: { maxPromptTokens: 10 },
    }).case({
      name: "bad answer",
      prompt: "Write.",
      assertions: [AgentEval.assert.notContains("forbidden")],
      expect: { activeSkills: ["research"] },
    });

    const report = await AgentEval.run({
      agent: {
        run: async () =>
          response({
            content: "forbidden generic output",
            promptTokens: 20,
            activeSkills: [],
          }),
      },
      suite,
    });

    expect(report.status).toBe("failed");
    expect(report.results[0]?.failures.join("\n")).toContain(
      "Prompt token gate failed",
    );
    expect(report.results[0]?.failures.join("\n")).toContain(
      "Expected skill 'research' to be active",
    );
  });

  it("can evaluate cache replay without live providers", async () => {
    let calls = 0;
    const report = await AgentEval.run({
      agent: {
        run: async () => {
          calls += 1;
          return response({
            content: "cache replay",
            cacheHits: calls === 1 ? 0 : 1,
            cacheMisses: calls === 1 ? 1 : 0,
          });
        },
      },
      suite: AgentEval.suite({
        name: "replay eval",
        defaults: { requireCacheReplay: true },
      }).case({
        name: "cache replay",
        prompt: "Run twice.",
        expect: { cache: { minHitRateOnReplay: 1 } },
      }),
    });

    expect(report.status).toBe("passed");
    expect(report.results[0]?.metrics.replayCacheHitRate).toBe(1);
  });
});

function response(config: {
  content: string;
  promptTokens?: number;
  completionTokens?: number;
  activeSkills?: string[];
  cacheHits?: number;
  cacheMisses?: number;
  toolCalls?: number;
}): AgentResponse {
  const prompt = config.promptTokens ?? 20;
  const completion = config.completionTokens ?? 10;
  const total = prompt + completion;
  const cacheHits = config.cacheHits ?? 0;
  const cacheMisses = config.cacheMisses ?? 0;
  return {
    content: config.content,
    tokensUsed: { prompt, completion, total },
    cost: total / 1_000_000,
    finishReason: "stop",
    model: "mock",
    provider: "mock",
    selection: {
      skillActivation: "auto",
      toolSelection: "auto",
      activeSkills: config.activeSkills ?? [],
      activationReasons: [],
      exposedTools: ["mock_tool"],
      executedToolCalls: config.toolCalls ?? 0,
    },
    cache: {
      hits: cacheHits,
      misses: cacheMisses,
      writes: cacheMisses,
      bypassed: false,
      skippedUnsafe: 0,
      stale: 0,
      corrupt: 0,
      oversized: 0,
      toolCallsAvoided: cacheHits,
      estimatedSavedTokens: cacheHits * 100,
      summary: {
        lookups: cacheHits + cacheMisses,
        hitRate:
          cacheHits + cacheMisses === 0
            ? 0
            : cacheHits / (cacheHits + cacheMisses),
        missRate:
          cacheHits + cacheMisses === 0
            ? 0
            : cacheMisses / (cacheHits + cacheMisses),
        avoidedCallRate:
          cacheHits + cacheMisses === 0
            ? 0
            : cacheHits / (cacheHits + cacheMisses),
        estimatedSavedTokens: cacheHits * 100,
        estimatedCostSaved: 0,
      },
    },
  };
}
