import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { Agent } from "../../agent/agent.js";
import { tool } from "../../agent/adapters/types.js";
import {
  runAgentBenchmark,
  writeAgentBenchmarkReport,
  type AgentBenchmarkResult,
} from "../../agent/benchmark.js";
import { AgentCache } from "../../agent/cache/index.js";
import { FileSystemCreatorMemoryStore } from "../../agent/creator/memory.js";
import { Provider } from "../../agent/provider-catalog.js";
import { CreatorPacks } from "../../agent/packs/index.js";
import { createTraitByName } from "../../agent/traits/index.js";
import { FileArtifactStore } from "../../artifact-store/file.js";

const integrationEnabled = process.env.INTEGRATION_TESTS === "true";
const benchmarkEnabled = process.env.AGENTCRAFT_LIVE_BENCHMARKS === "true";
const openAiEnabled = parseProviderSelection(
  process.env.AGENTCRAFT_LIVE_PROVIDERS,
).has("openai");
const openAiKey = process.env.OPENAI_API_KEY;
const liveIt =
  integrationEnabled && benchmarkEnabled && openAiEnabled && openAiKey
    ? it
    : it.skip;
const liveModel = process.env.AGENTCRAFT_LIVE_OPENAI_MODEL ?? "gpt-4o-mini";
const reportPath = "reports/agentcraft-live-cost-cache-benchmark.md";
let latestResults: readonly AgentBenchmarkResult[] = [];

describe("live cost, cache, and skill benchmark", () => {
  afterAll(async () => {
    if (latestResults.length === 0) return;
  });

  liveIt(
    "compares flat prompt, directive skill, auto creator pack, compressed pack, cache replay, memory, and artifact resume",
    async () => {
      const root = await mkdtemp(
        path.join(tmpdir(), "agentcraft-live-benchmark-"),
      );
      let toolExecutions = 0;
      const prompt =
        "Create a compact Medium blog article plan about reducing wasted tokens in agent workflows. Keep it under 160 words.";
      const cacheProbe = tool({
        name: "get_cache_benchmark_fact",
        description: "Return one stable benchmark fact for cache validation.",
        security: {
          sideEffect: "read",
          cache: { safe: true, deterministic: true, ttlMs: 60_000 },
        },
        params: {},
        run: async () => {
          toolExecutions += 1;
          return {
            fact: "cache replay should avoid repeated deterministic tool execution",
          };
        },
      });

      try {
        const report = await runAgentBenchmark({
          name: "AgentCraft Live Cost Cache Skill Benchmark",
          description:
            "OpenAI light benchmark for flat prompt, directive skill, creator-pack always, creator-pack auto activation, compressed creator pack, cache warm/replay, memory-informed output, and artifact-resume output.",
          prompt,
          variants: [
            {
              name: "flat prompt",
              kind: "flat",
              run: () =>
                Agent.create({
                  model:
                    Provider.openai[
                      liveModel as keyof typeof Provider.openai
                    ] ?? `openai:${liveModel}`,
                  apiKey: openAiKey!,
                  temperature: 0,
                  maxTokens: 180,
                  retry: {
                    maxAttempts: 1,
                    backoff: "fixed",
                    initialDelay: 100,
                    maxDelay: 100,
                  },
                }).run({ prompt, temperature: 0, maxTokens: 180 }),
              score: (response) => scoreArticlePlan(response.content),
            },
            {
              name: "directive blog skill",
              kind: "directive",
              run: () =>
                Agent.create({
                  model:
                    Provider.openai[
                      liveModel as keyof typeof Provider.openai
                    ] ?? `openai:${liveModel}`,
                  apiKey: openAiKey!,
                  temperature: 0,
                  maxTokens: 180,
                  traitActivation: "directive-only",
                  retry: {
                    maxAttempts: 1,
                    backoff: "fixed",
                    initialDelay: 100,
                    maxDelay: 100,
                  },
                })
                  .use(createTraitByName("blog-writer"))
                  .run({
                    prompt: `/write-blog ${prompt}`,
                    temperature: 0,
                    maxTokens: 180,
                  }),
              score: (response) => scoreArticlePlan(response.content),
            },
            {
              name: "creator pack always",
              kind: "creator-pack",
              run: () =>
                Agent.create({
                  model:
                    Provider.openai[
                      liveModel as keyof typeof Provider.openai
                    ] ?? `openai:${liveModel}`,
                  apiKey: openAiKey!,
                  temperature: 0,
                  maxTokens: 180,
                  traitActivation: "always",
                  toolSelection: "auto",
                  retry: {
                    maxAttempts: 1,
                    backoff: "fixed",
                    initialDelay: 100,
                    maxDelay: 100,
                  },
                })
                  .use(
                    CreatorPacks.blog({
                      cache: "auto",
                      readOnlyByDefault: true,
                    }),
                  )
                  .run({ prompt, temperature: 0, maxTokens: 180 }),
              score: (response) => scoreArticlePlan(response.content),
            },
            {
              name: "creator pack auto",
              kind: "creator-pack",
              run: () =>
                Agent.create({
                  model:
                    Provider.openai[
                      liveModel as keyof typeof Provider.openai
                    ] ?? `openai:${liveModel}`,
                  apiKey: openAiKey!,
                  temperature: 0,
                  maxTokens: 180,
                  traitActivation: "auto",
                  toolSelection: "auto",
                  retry: {
                    maxAttempts: 1,
                    backoff: "fixed",
                    initialDelay: 100,
                    maxDelay: 100,
                  },
                })
                  .use(
                    CreatorPacks.blog({
                      cache: "auto",
                      readOnlyByDefault: true,
                    }),
                  )
                  .run({ prompt, temperature: 0, maxTokens: 180 }),
              score: (response) => scoreArticlePlan(response.content),
            },
            {
              name: "creator pack compressed",
              kind: "creator-pack",
              run: () =>
                Agent.create({
                  model:
                    Provider.openai[
                      liveModel as keyof typeof Provider.openai
                    ] ?? `openai:${liveModel}`,
                  apiKey: openAiKey!,
                  temperature: 0,
                  maxTokens: 180,
                  traitActivation: "auto",
                  toolSelection: "auto",
                  promptCompression: "balanced",
                  retry: {
                    maxAttempts: 1,
                    backoff: "fixed",
                    initialDelay: 100,
                    maxDelay: 100,
                  },
                })
                  .use(
                    CreatorPacks.blog({
                      cache: "auto",
                      readOnlyByDefault: true,
                    }),
                  )
                  .run({ prompt, temperature: 0, maxTokens: 180 }),
              score: (response) => scoreArticlePlan(response.content),
            },
            {
              name: "cache warm",
              kind: "cache-warm",
              run: () =>
                Agent.create({
                  model:
                    Provider.openai[
                      liveModel as keyof typeof Provider.openai
                    ] ?? `openai:${liveModel}`,
                  apiKey: openAiKey!,
                  temperature: 0,
                  maxTokens: 120,
                  cache: AgentCache.file(root, {
                    strategy: "conservative",
                    namespace: "live-benchmark",
                    defaultTtlMs: 60_000,
                  }),
                  retry: {
                    maxAttempts: 1,
                    backoff: "fixed",
                    initialDelay: 100,
                    maxDelay: 100,
                  },
                }).run({
                  prompt:
                    "Call get_cache_benchmark_fact exactly once, then answer with the fact only.",
                  tools: [cacheProbe],
                  temperature: 0,
                  maxTokens: 120,
                }),
            },
            {
              name: "cache replay",
              kind: "cache-replay",
              run: () =>
                Agent.create({
                  model:
                    Provider.openai[
                      liveModel as keyof typeof Provider.openai
                    ] ?? `openai:${liveModel}`,
                  apiKey: openAiKey!,
                  temperature: 0,
                  maxTokens: 120,
                  cache: AgentCache.file(root, {
                    strategy: "conservative",
                    namespace: "live-benchmark",
                    defaultTtlMs: 60_000,
                  }),
                  retry: {
                    maxAttempts: 1,
                    backoff: "fixed",
                    initialDelay: 100,
                    maxDelay: 100,
                  },
                }).run({
                  prompt:
                    "Call get_cache_benchmark_fact exactly once, then answer with the fact only.",
                  tools: [cacheProbe],
                  temperature: 0,
                  maxTokens: 120,
                }),
            },
            {
              name: "memory-informed run",
              kind: "memory",
              run: async () => {
                const memory = new FileSystemCreatorMemoryStore({
                  root: path.join(root, "memory"),
                  requireWriteApproval: true,
                  approveWrite: () => true,
                  staleAfterMs: 86_400_000,
                });
                await memory.upsertBrandVoice({
                  id: "default",
                  tone:
                    "crisp, practical, lightly opinionated, and allergic to token waste",
                  preferredPhrases: [
                    "show the cost before the cleverness",
                    "cache what is stable",
                  ],
                  bannedPhrases: ["in today's fast-paced world"],
                  examples: [
                    "Use the expensive model only after the cheap path proves it cannot answer.",
                  ],
                });
                await memory.addCorpusDocument({
                  id: "cache-guideline",
                  text:
                    "Agent workflows should cache deterministic read tools and expose replay savings before marketing cost-reduction claims.",
                  tags: ["cache", "cost"],
                  source: "live-benchmark-fixture",
                });
                const memoryContext = await memory.summarizeContext({
                  query: "agent workflow token cache cost",
                  tags: ["cache", "cost"],
                  maxChars: 700,
                });
                return await Agent.create({
                  model:
                    Provider.openai[
                      liveModel as keyof typeof Provider.openai
                    ] ?? `openai:${liveModel}`,
                  apiKey: openAiKey!,
                  temperature: 0,
                  maxTokens: 160,
                  retry: {
                    maxAttempts: 1,
                    backoff: "fixed",
                    initialDelay: 100,
                    maxDelay: 100,
                  },
                }).run({
                  prompt: [
                    "Use this creator memory context, then write a two-bullet Medium article angle about cache-first agent workflows.",
                    memoryContext,
                  ].join("\n\n"),
                  temperature: 0,
                  maxTokens: 160,
                });
              },
              score: (response) => scoreMemoryUse(response.content),
            },
            {
              name: "artifact-resume workflow",
              kind: "artifact-resume",
              run: async () => {
                const store = FileArtifactStore({
                  root: path.join(root, "artifacts"),
                  validateSchemas: true,
                });
                const briefId = await store.put("ContentBrief", {
                  type: "ContentBrief",
                  title: "Cache-first agent workflows",
                  sourceSkill: "blog-brief",
                  provenance: [{ kind: "user", ref: "live-benchmark" }],
                  inputs: ["phase-8-live-benchmark"],
                  status: "draft",
                  audience: "developers building cost-aware agent systems",
                  intent:
                    "turn a persisted brief into a compact resumed article plan",
                  outline: [
                    "Cache deterministic tool reads",
                    "Use auto skill activation to avoid prompt bloat",
                    "Show cost and cache reports",
                  ],
                });
                await store.updateByType("ContentBrief", briefId, {
                  status: "reviewed",
                });
                const resumed = await store.get("ContentBrief", briefId);
                const history = await store.history("ContentBrief", briefId);
                return await Agent.create({
                  model:
                    Provider.openai[
                      liveModel as keyof typeof Provider.openai
                    ] ?? `openai:${liveModel}`,
                  apiKey: openAiKey!,
                  temperature: 0,
                  maxTokens: 160,
                  traitActivation: "auto",
                  promptCompression: "balanced",
                  retry: {
                    maxAttempts: 1,
                    backoff: "fixed",
                    initialDelay: 100,
                    maxDelay: 100,
                  },
                })
                  .use(createTraitByName("blog-writer"))
                  .run({
                    prompt: [
                      "Resume from this stored ContentBrief artifact and produce a compact execution plan with audience, angle, outline, evidence, and takeaway/CTA.",
                      `Artifact history revisions: ${history.length}`,
                      JSON.stringify(resumed),
                    ].join("\n\n"),
                    temperature: 0,
                    maxTokens: 160,
                  });
              },
              score: (response) => scoreArticlePlan(response.content),
            },
          ],
        });

        latestResults = report.results;
        await writeAgentBenchmarkReport(report, reportPath);

        expect(report.results.every((result) => result.ok)).toBe(true);
        const creator = report.results.find(
          (result) => result.name === "creator pack auto",
        );
        const always = report.results.find(
          (result) => result.name === "creator pack always",
        );
        const directive = report.results.find(
          (result) => result.name === "directive blog skill",
        );
        const compressed = report.results.find(
          (result) => result.name === "creator pack compressed",
        );
        const replay = report.results.find(
          (result) => result.name === "cache replay",
        );
        expect(directive?.activeTraits).toContain("blog-writer");
        expect(always?.activeTraits).toContain("blog-writer");
        expect(creator?.activeTraits).toContain("blog-writer");
        expect(compressed?.activeTraits).toContain("blog-writer");
        expect(
          creator?.tokensUsed.prompt ?? Number.POSITIVE_INFINITY,
        ).toBeLessThan(always?.tokensUsed.prompt ?? 0);
        expect(compressed?.qualityScore ?? 0).toBeGreaterThanOrEqual(
          (creator?.qualityScore ?? 0) - 1,
        );
        expect(compressed?.measurement?.assembledPromptChars ?? 0).toBeLessThan(
          creator?.measurement?.assembledPromptChars ?? Number.POSITIVE_INFINITY,
        );
        expect(replay?.cache?.hits ?? 0).toBeGreaterThanOrEqual(1);
        expect(
          report.results.find((result) => result.name === "memory-informed run")
            ?.qualityScore ?? 0,
        ).toBeGreaterThanOrEqual(2);
        expect(
          report.results.find(
            (result) => result.name === "artifact-resume workflow",
          )?.qualityScore ?? 0,
        ).toBeGreaterThanOrEqual(3);
        expect(toolExecutions).toBe(1);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
    120_000,
  );
});

function scoreArticlePlan(content: string): number {
  const signals = [
    /audience/i,
    /angle|thesis|hook/i,
    /outline|section/i,
    /evidence|example/i,
    /takeaway|cta/i,
  ];
  return signals.reduce(
    (score, pattern) => score + (pattern.test(content) ? 1 : 0),
    0,
  );
}

function scoreMemoryUse(content: string): number {
  const signals = [
    /cache/i,
    /cost|token/i,
    /deterministic|stable|replay/i,
    /show|expose|report/i,
  ];
  return signals.reduce(
    (score, pattern) => score + (pattern.test(content) ? 1 : 0),
    0,
  );
}

function parseProviderSelection(value: string | undefined): Set<string> {
  if (!value || value.trim() === "") return new Set(["openai"]);
  const selected = value
    .split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean);
  return selected.includes("all") ? new Set(["openai"]) : new Set(selected);
}
