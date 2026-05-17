import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { describe, expect, it } from "vitest";
import { FileSystemCreatorMemoryStore } from "../creator/memory.js";
import {
  formatAgentBenchmarkMarkdown,
  runAgentBenchmark,
  writeAgentBenchmarkReport,
} from "../benchmark.js";
import type { AgentResponse } from "../types.js";

describe("Agent benchmark harness", () => {
  it("runs mocked benchmark variants and writes a markdown report without API keys", async () => {
    const fixture = {
      name: "AgentCraft Mock Cost And Cache Benchmark",
      description: "Synthetic benchmark used to validate report structure.",
      prompt: "Write a compact blog plan about cache-aware agents.",
      variants: [
        {
          name: "flat prompt",
          kind: "flat" as const,
          run: async () =>
            response({
              content: "Plain outline.",
              promptTokens: 40,
              completionTokens: 20,
            }),
          score: (result: AgentResponse) =>
            result.content.includes("Plain") ? 1 : 0,
        },
        {
          name: "cached replay",
          kind: "cache-replay" as const,
          run: async () =>
            response({
              content: "Cached outline.",
              promptTokens: 42,
              completionTokens: 18,
              activeSkills: ["blog-writer"],
              cacheHits: 1,
              cacheMisses: 0,
              toolCallsAvoided: 1,
            }),
          score: (result: AgentResponse) =>
            result.selection?.activeSkills.includes("blog-writer") ? 2 : 0,
        },
      ],
    };

    const report = await runAgentBenchmark(fixture);
    const markdown = formatAgentBenchmarkMarkdown(report);

    expect(report.results).toHaveLength(2);
    expect(report.results[1]?.cache?.summary?.hitRate).toBe(1);
    expect(markdown).toContain("Prompt And Cache Detail");
    expect(markdown).toContain("cached replay");
    expect(markdown).not.toContain("OPENAI_API_KEY");

    await mkdir("reports", { recursive: true });
    const filePath = "reports/agentcraft-mock-benchmark-report.md";
    await writeAgentBenchmarkReport(report, filePath);
    const written = await readFile(filePath, "utf8");
    expect(written).toContain("AgentCraft Mock Cost And Cache Benchmark");
  });

  it("captures a brand voice memory benchmark fixture without live providers", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "agentcraft-memory-benchmark-"));
    try {
      const memory = new FileSystemCreatorMemoryStore({ root });
      await memory.upsertBrandVoice({
        id: "default",
        tone: "specific and practical",
        preferredPhrases: ["name the tradeoff"],
        bannedPhrases: ["game changer"],
        examples: ["We choose cache boundaries where stale data is cheaper than repeated calls."],
      });
      const summary = await memory.summarizeContext({
        query: "cache costs",
        maxChars: 700,
      });
      const report = await runAgentBenchmark({
        name: "AgentCraft Brand Voice Memory Benchmark",
        description:
          "Mocked benchmark comparing cold prompt, inline examples, memory-backed context, and compact memory summary.",
        prompt: "Write a short product note about cache savings.",
        variants: [
          {
            name: "cold prompt",
            kind: "flat" as const,
            run: async () =>
              response({ content: "Cache saves money.", promptTokens: 30, completionTokens: 20 }),
            score: (result) => (result.content.includes("tradeoff") ? 2 : 1),
          },
          {
            name: "inline brand examples",
            kind: "memory" as const,
            run: async () =>
              response({
                content: "Name the tradeoff: cache saves repeated calls but needs freshness rules.",
                promptTokens: 90,
                completionTokens: 24,
              }),
            score: (result) => (result.content.includes("tradeoff") ? 3 : 1),
          },
          {
            name: "memory store",
            kind: "memory" as const,
            run: async () =>
              response({
                content: "Name the tradeoff: cache saves repeated calls but needs freshness rules.",
                promptTokens: 70,
                completionTokens: 24,
              }),
            score: (result) => (result.content.includes("tradeoff") ? 3 : 1),
          },
          {
            name: "compact memory summary",
            kind: "memory" as const,
            run: async () =>
              response({
                content: `Using summary: ${summary.includes("name the tradeoff") ? "name the tradeoff" : "cache"}.`,
                promptTokens: 52,
                completionTokens: 18,
              }),
            score: (result) => (result.content.includes("tradeoff") ? 3 : 1),
          },
        ],
      });
      const markdown = formatAgentBenchmarkMarkdown(report);

      expect(report.results.map((result) => result.name)).toEqual([
        "cold prompt",
        "inline brand examples",
        "memory store",
        "compact memory summary",
      ]);
      expect(markdown).toContain("compact memory summary");
      expect(markdown).not.toContain("vector");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

function response(config: {
  content: string;
  promptTokens: number;
  completionTokens: number;
  activeSkills?: string[];
  cacheHits?: number;
  cacheMisses?: number;
  toolCallsAvoided?: number;
}): AgentResponse {
  const total = config.promptTokens + config.completionTokens;
  const cacheHits = config.cacheHits ?? 0;
  const cacheMisses = config.cacheMisses ?? 0;
  const toolCallsAvoided = config.toolCallsAvoided ?? 0;
  return {
    content: config.content,
    tokensUsed: {
      prompt: config.promptTokens,
      completion: config.completionTokens,
      total,
    },
    cost: total / 1_000_000,
    finishReason: "stop",
    model: "mock",
    provider: "mock",
    selection: {
      skillActivation: "auto",
      toolSelection: "auto",
      activeSkills: config.activeSkills ?? [],
      activationReasons: (config.activeSkills ?? []).map((skill) => ({
        skill,
        reason: "keyword",
        confidence: 0.7,
        matched: skill,
      })),
      exposedTools: ["mock_tool"],
      executedToolCalls: cacheMisses,
    },
    measurement: {
      promptChars: config.promptTokens * 4,
      systemChars: 20,
      assembledPromptChars: config.promptTokens * 4 + 20,
      estimatedPromptTokens: config.promptTokens + 5,
      exposedToolCount: 1,
      modelToolCount: 1,
      promptMinified: false,
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
      toolCallsAvoided,
      estimatedSavedTokens: toolCallsAvoided * 100,
      summary: {
        lookups: cacheHits + cacheMisses,
        hitRate: cacheHits + cacheMisses === 0 ? 0 : cacheHits / (cacheHits + cacheMisses),
        missRate: cacheHits + cacheMisses === 0 ? 0 : cacheMisses / (cacheHits + cacheMisses),
        avoidedCallRate: toolCallsAvoided + cacheMisses === 0 ? 0 : toolCallsAvoided / (toolCallsAvoided + cacheMisses),
        estimatedSavedTokens: toolCallsAvoided * 100,
        estimatedCostSaved: 0,
      },
    },
  };
}
