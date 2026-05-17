import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";
import type { AgentResponse } from "./types.js";

export type BenchmarkVariantKind =
  | "flat"
  | "directive"
  | "auto-skill"
  | "creator-pack"
  | "cache-warm"
  | "cache-replay"
  | "memory"
  | "artifact-resume"
  | "workflow"
  | "custom";

export interface AgentBenchmarkVariant {
  readonly name: string;
  readonly kind: BenchmarkVariantKind;
  readonly description?: string;
  readonly run: () => Promise<AgentResponse>;
  readonly score?: (response: AgentResponse) => number;
}

export interface AgentBenchmarkFixture {
  readonly name: string;
  readonly description?: string;
  readonly prompt?: string;
  readonly variants: readonly AgentBenchmarkVariant[];
}

export interface AgentBenchmarkResult {
  readonly name: string;
  readonly kind: BenchmarkVariantKind;
  readonly description?: string;
  readonly ok: boolean;
  readonly durationMs: number;
  readonly contentPreview: string;
  readonly tokensUsed: AgentResponse["tokensUsed"];
  readonly cost: number;
  readonly model: string;
  readonly provider: string;
  readonly activeSkills: readonly string[];
  readonly activationReasons: NonNullable<
    NonNullable<AgentResponse["selection"]>["activationReasons"]
  >;
  readonly exposedTools: readonly string[];
  readonly executedToolCalls: number;
  readonly cache?: AgentResponse["cache"];
  readonly costReport?: AgentResponse["costReport"];
  readonly measurement?: AgentResponse["measurement"];
  readonly qualityScore?: number;
  readonly error?: string;
}

export interface AgentBenchmarkReport {
  readonly name: string;
  readonly description?: string;
  readonly prompt?: string;
  readonly generatedAt: string;
  readonly results: readonly AgentBenchmarkResult[];
}

export async function runAgentBenchmark(
  fixture: AgentBenchmarkFixture,
): Promise<AgentBenchmarkReport> {
  const results: AgentBenchmarkResult[] = [];

  for (const variant of fixture.variants) {
    const started = Date.now();
    try {
      const response = await variant.run();
      results.push({
        name: variant.name,
        kind: variant.kind,
        ...(variant.description !== undefined && {
          description: variant.description,
        }),
        ok: true,
        durationMs: Date.now() - started,
        contentPreview: preview(response.content),
        tokensUsed: response.tokensUsed,
        cost: response.cost,
        model: response.model,
        provider: response.provider,
        activeSkills: response.selection?.activeSkills ?? [],
        activationReasons: response.selection?.activationReasons ?? [],
        exposedTools: response.selection?.exposedTools ?? [],
        executedToolCalls: response.selection?.executedToolCalls ?? 0,
        cache: response.cache,
        costReport: response.costReport,
        measurement: response.measurement,
        ...(variant.score !== undefined && {
          qualityScore: variant.score(response),
        }),
      });
    } catch (error) {
      results.push({
        name: variant.name,
        kind: variant.kind,
        ...(variant.description !== undefined && {
          description: variant.description,
        }),
        ok: false,
        durationMs: Date.now() - started,
        contentPreview: "",
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        cost: 0,
        model: "unknown",
        provider: "unknown",
        activeSkills: [],
        activationReasons: [],
        exposedTools: [],
        executedToolCalls: 0,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return {
    name: fixture.name,
    ...(fixture.description !== undefined && { description: fixture.description }),
    ...(fixture.prompt !== undefined && { prompt: fixture.prompt }),
    generatedAt: new Date().toISOString(),
    results,
  };
}

export function formatAgentBenchmarkMarkdown(
  report: AgentBenchmarkReport,
): string {
  return [
    `# ${report.name}`,
    "",
    `Generated: ${report.generatedAt}`,
    "",
    report.description ? `${report.description}\n` : undefined,
    report.prompt ? `Prompt fixture:\n\n${fenced(report.prompt)}\n` : undefined,
    "## Summary",
    "",
    "| Variant | Kind | OK | Prompt tokens | Completion tokens | Total tokens | Cost | Active skills | Cache hits | Cache misses | Tool calls |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: |",
    ...report.results.map(
      (result) =>
        `| ${escapeCell(result.name)} | ${result.kind} | ${
          result.ok ? "yes" : "no"
        } | ${result.tokensUsed.prompt} | ${result.tokensUsed.completion} | ${
          result.tokensUsed.total
        } | ${formatCost(result.cost)} | ${
          result.activeSkills.length ? result.activeSkills.map(code).join(", ") : "-"
        } | ${result.cache?.hits ?? 0} | ${result.cache?.misses ?? 0} | ${
          result.executedToolCalls
        } |`,
    ),
    "",
    "## Quality Detail",
    "",
    "| Variant | Quality rubric score | Factuality / citation score | Notes |",
    "| --- | ---: | ---: | --- |",
    ...report.results.map((result) => {
      const factualityScore = scoreFactualityAndCitation(result.contentPreview);
      return `| ${escapeCell(result.name)} | ${
        result.qualityScore ?? 0
      } | ${factualityScore} | ${qualityNote(result)} |`;
    }),
    "",
    "## Prompt And Cache Detail",
    "",
    "| Variant | Prompt chars | Estimated prompt tokens | Exposed tools | Cache hit rate | Avoided call rate | Estimated tokens saved |",
    "| --- | ---: | ---: | ---: | ---: | ---: | ---: |",
    ...report.results.map(
      (result) =>
        `| ${escapeCell(result.name)} | ${
          result.measurement?.assembledPromptChars ?? 0
        } | ${result.measurement?.estimatedPromptTokens ?? 0} | ${
          result.exposedTools.length
        } | ${percent(result.cache?.summary?.hitRate ?? 0)} | ${percent(
          result.cache?.summary?.avoidedCallRate ?? 0,
        )} | ${Math.round(result.cache?.summary?.estimatedSavedTokens ?? 0)} |`,
    ),
    "",
    "## Cost Detail",
    "",
    "| Variant | Actual model cost | Tool/search estimate | Cache savings estimate | Budget mode | Stale pricing |",
    "| --- | ---: | ---: | ---: | --- | --- |",
    ...report.results.map((result) => {
      const toolSearch =
        (result.costReport?.costs.toolCostEstimate ?? 0) +
        (result.costReport?.costs.searchCostEstimate ?? 0);
      return `| ${escapeCell(result.name)} | ${formatCost(
        result.costReport?.costs.actualModelCost ?? result.cost,
      )} | ${formatCost(toolSearch)} | ${formatCost(
        result.costReport?.costs.cacheSavingsEstimate ?? 0,
      )} | ${result.costReport?.budgetMode ?? "-"} | ${
        result.costReport?.stalePricing ? "yes" : "no"
      } |`;
    }),
    "",
    "## Skill Activation",
    "",
    "| Variant | Active skills | Reasons |",
    "| --- | --- | --- |",
    ...report.results.map(
      (result) =>
        `| ${escapeCell(result.name)} | ${
          result.activeSkills.length ? result.activeSkills.map(code).join(", ") : "-"
        } | ${formatActivationReasons(result.activationReasons)} |`,
    ),
    "",
    "## Output Previews",
    "",
    ...report.results.flatMap((result) => [
      `### ${result.name}`,
      "",
      result.error ? `Error: ${result.error}` : fenced(result.contentPreview),
      "",
    ]),
    "## External Guidance Cross-Check",
    "",
    "- OpenAI prompt caching is automatic on supported models for prompts longer than 1,024 tokens and exposes cached-token counts in usage metadata. AgentCraft cache replay is therefore reported separately from provider prompt caching. Source: https://openai.com/index/api-prompt-caching/",
    "- OpenAI pricing separates model tokens from tool costs such as web search, hosted shell/code interpreter, and file search. AgentCraft cost reports keep model cost, tool/search estimates, and cache savings in separate fields for this reason. Source: https://developers.openai.com/api/docs/pricing",
    "- Gemini context caching guidance recommends stable common content at the beginning of prompts and exposes cache-hit tokens in usage metadata. AgentCraft prompt compression and skill hoisting should preserve stable high-value prefixes where provider caching is used. Source: https://ai.google.dev/gemini-api/docs/caching",
    "- Anthropic prompt caching is explicitly configured with cache-control blocks, so AgentCraft should keep provider-cache claims provider-specific rather than assuming all vendors behave like OpenAI. Source: https://platform.claude.com/docs/en/build-with-claude/prompt-caching",
    "- OpenAI evaluation guidance calls out instruction following, functional correctness, tool selection, data precision, and agent handoff as separate eval targets. This benchmark is a light certification, not a replacement for a larger continuous eval suite. Source: https://developers.openai.com/api/docs/guides/evaluation-best-practices",
    "- Tau-bench evaluates dynamic tool-agent-user interaction and rule following over multiple turns. AgentCraft's Phase 8 report records tool execution and cache replay, but should not be marketed as tau-bench-equivalent. Source: https://arxiv.org/abs/2406.12045",
    "- Google Search helpful-content guidance emphasizes people-first, reliable content and warns against search-engine-first mass automation. Creator-skill quality claims should remain tied to audience usefulness, evidence, and original value. Source: https://developers.google.com/search/docs/fundamentals/creating-helpful-content",
    "",
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n");
}

function scoreFactualityAndCitation(content: string): number {
  if (!content.trim()) return 0;
  const signals = [
    /source|citation|evidence|verify|claim/i,
    /uncertain|unknown|unavailable|assumption|gap/i,
    /do not|cannot|without .*evidence|needs verification/i,
  ];
  return signals.reduce(
    (score, pattern) => score + (pattern.test(content) ? 1 : 0),
    0,
  );
}

function qualityNote(result: AgentBenchmarkResult): string {
  if (!result.ok) return "failed";
  const notes: string[] = [];
  if ((result.qualityScore ?? 0) > 0) notes.push("rubric signals present");
  if ((result.cache?.hits ?? 0) > 0) notes.push("cache hit observed");
  if (result.activeSkills.length > 0) notes.push("skill activation observed");
  if (notes.length === 0) return "-";
  return notes.join(", ");
}

export async function writeAgentBenchmarkReport(
  report: AgentBenchmarkReport,
  filePath: string,
): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, formatAgentBenchmarkMarkdown(report), "utf8");
}

function preview(content: string): string {
  const normalized = content.trim();
  return normalized.length > 900 ? `${normalized.slice(0, 900)}...` : normalized;
}

function fenced(content: string): string {
  return ["```text", content.trim(), "```"].join("\n");
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function code(value: string): string {
  return `\`${value}\``;
}

function formatCost(value: number): string {
  return value === 0 ? "0" : value.toFixed(6);
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function formatActivationReasons(
  reasons: AgentBenchmarkResult["activationReasons"],
): string {
  if (reasons.length === 0) return "-";
  return reasons
    .map((reason) => {
      const matched = reason.matched ? `:${reason.matched}` : "";
      return `${code(reason.skill)} ${reason.reason}${matched} (${Math.round(reason.confidence * 100)}%)`;
    })
    .join("<br>");
}
