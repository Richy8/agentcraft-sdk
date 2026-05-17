import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";
import type { Agent } from "../agent.js";
import type { AgentResponse, AgentRunParams } from "../types.js";

export type AgentEvalStatus = "passed" | "failed" | "warning";

export interface AgentEvalGateDefaults {
  readonly maxCostUsd?: number;
  readonly maxPromptTokens?: number;
  readonly maxCompletionTokens?: number;
  readonly maxTotalTokens?: number;
  readonly maxToolCalls?: number;
  readonly minQualityScore?: number;
  readonly requireCacheReplay?: boolean;
  readonly requireSkillActivation?: boolean;
}

export interface AgentEvalSuiteConfig {
  readonly name: string;
  readonly description?: string;
  readonly defaults?: AgentEvalGateDefaults;
  readonly reporter?: AgentEvalReporter;
}

export interface AgentEvalCacheExpectation {
  readonly minHitRate?: number;
  readonly minHitRateOnReplay?: number;
  readonly maxMisses?: number;
}

export interface AgentEvalArtifactExpectation {
  readonly requiredTypes?: readonly string[];
}

export interface AgentEvalExpectation {
  readonly activeSkills?: readonly string[];
  readonly inactiveSkills?: readonly string[];
  readonly exposedTools?: readonly string[];
  readonly maxToolCalls?: number;
  readonly cache?: AgentEvalCacheExpectation;
  readonly artifacts?: AgentEvalArtifactExpectation;
}

export type AgentEvalRunOverride =
  | Partial<Omit<AgentRunParams, "prompt">>
  | ((
      context: AgentEvalRunContext,
    ) => Promise<AgentResponse> | AgentResponse);

export interface AgentEvalCaseConfig {
  readonly name: string;
  readonly prompt: string;
  readonly input?: Record<string, unknown>;
  readonly run?: AgentEvalRunOverride;
  readonly expect?: AgentEvalExpectation;
  readonly rubric?: readonly string[];
  readonly assertions?: readonly AgentEvalAssertion[];
}

export interface AgentEvalSuite {
  readonly name: string;
  readonly description?: string;
  readonly defaults?: AgentEvalGateDefaults;
  readonly cases: readonly AgentEvalCaseConfig[];
  case(config: AgentEvalCaseConfig): AgentEvalSuite;
}

export interface AgentEvalRunContext {
  readonly agent: Pick<Agent, "run">;
  readonly suite: AgentEvalSuiteConfig;
  readonly case: AgentEvalCaseConfig;
  readonly replayOf?: AgentResponse;
}

export interface AgentEvalAssertionResult {
  readonly name: string;
  readonly passed: boolean;
  readonly message?: string;
}

export interface AgentEvalAssertion {
  readonly name: string;
  evaluate(
    response: AgentResponse,
    context: AgentEvalCaseExecutionContext,
  ): AgentEvalAssertionResult | Promise<AgentEvalAssertionResult>;
}

export interface AgentEvalCaseExecutionContext {
  readonly case: AgentEvalCaseConfig;
  readonly suite: AgentEvalSuiteConfig;
  readonly replay?: AgentResponse;
}

export interface AgentEvalJudgeInput {
  readonly case: AgentEvalCaseConfig;
  readonly response: AgentResponse;
  readonly replay?: AgentResponse;
}

export interface AgentEvalJudgeResult {
  readonly score: number;
  readonly notes?: string;
}

export type AgentEvalJudge = (
  input: AgentEvalJudgeInput,
) => Promise<AgentEvalJudgeResult> | AgentEvalJudgeResult;

export interface AgentEvalRunOptions {
  readonly agent: Pick<Agent, "run">;
  readonly suite: AgentEvalSuite | AgentEvalSuiteConfig;
  readonly cases?: readonly AgentEvalCaseConfig[];
  readonly judge?: AgentEvalJudge;
}

export interface AgentEvalCaseResult {
  readonly name: string;
  readonly status: AgentEvalStatus;
  readonly durationMs: number;
  readonly response: AgentResponse;
  readonly replay?: AgentResponse;
  readonly qualityScore?: number;
  readonly judgeNotes?: string;
  readonly assertions: readonly AgentEvalAssertionResult[];
  readonly failures: readonly string[];
  readonly warnings: readonly string[];
  readonly metrics: {
    readonly cost: number;
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly totalTokens: number;
    readonly activeSkills: readonly string[];
    readonly exposedTools: readonly string[];
    readonly executedToolCalls: number;
    readonly cacheHitRate?: number;
    readonly replayCacheHitRate?: number;
  };
}

export interface AgentEvalReport {
  readonly name: string;
  readonly description?: string;
  readonly generatedAt: string;
  readonly status: AgentEvalStatus;
  readonly results: readonly AgentEvalCaseResult[];
  readonly summary: {
    readonly total: number;
    readonly passed: number;
    readonly failed: number;
    readonly warnings: number;
    readonly totalCost: number;
    readonly totalTokens: number;
  };
}

export interface AgentEvalReporter {
  report(report: AgentEvalReport): void | Promise<void>;
}

export interface AgentEvalComparisonInput {
  readonly name?: string;
  readonly baseline: AgentEvalReport;
  readonly candidate: AgentEvalReport;
}

export interface AgentEvalComparison {
  readonly name: string;
  readonly generatedAt: string;
  readonly baselineStatus: AgentEvalStatus;
  readonly candidateStatus: AgentEvalStatus;
  readonly deltas: {
    readonly cost: number;
    readonly totalTokens: number;
    readonly promptTokens: number;
    readonly completionTokens: number;
    readonly averageQualityScore: number;
    readonly averageCacheHitRate: number;
  };
}

class EvalSuite implements AgentEvalSuite {
  readonly name: string;
  readonly description?: string;
  readonly defaults?: AgentEvalGateDefaults;
  private readonly items: AgentEvalCaseConfig[] = [];

  constructor(private readonly config: AgentEvalSuiteConfig) {
    this.name = config.name;
    if (config.description !== undefined) this.description = config.description;
    if (config.defaults !== undefined) this.defaults = config.defaults;
  }

  get cases(): readonly AgentEvalCaseConfig[] {
    return this.items;
  }

  case(config: AgentEvalCaseConfig): AgentEvalSuite {
    this.items.push(config);
    return this;
  }

  toConfig(): AgentEvalSuiteConfig {
    return this.config;
  }
}

export const AgentEval = {
  suite(config: AgentEvalSuiteConfig): AgentEvalSuite {
    return new EvalSuite(config);
  },

  async run(options: AgentEvalRunOptions): Promise<AgentEvalReport> {
    const suiteConfig = suiteToConfig(options.suite);
    const cases = options.cases ?? suiteCases(options.suite);
    const results: AgentEvalCaseResult[] = [];

    for (const evalCase of cases) {
      const runCaseOptions: {
        readonly agent: Pick<Agent, "run">;
        readonly suite: AgentEvalSuiteConfig;
        readonly case: AgentEvalCaseConfig;
        readonly judge?: AgentEvalJudge;
      } = {
        agent: options.agent,
        suite: suiteConfig,
        case: evalCase,
        ...(options.judge !== undefined && { judge: options.judge }),
      };
      results.push(
        await runCase(runCaseOptions),
      );
    }

    const summary = summarizeResults(results);
    const report: AgentEvalReport = {
      name: suiteConfig.name,
      ...(suiteConfig.description !== undefined && {
        description: suiteConfig.description,
      }),
      generatedAt: new Date().toISOString(),
      status:
        summary.failed > 0
          ? "failed"
          : summary.warnings > 0
            ? "warning"
            : "passed",
      results,
      summary,
    };
    await suiteConfig.reporter?.report(report);
    return report;
  },

  compare(input: AgentEvalComparisonInput): AgentEvalComparison {
    const baseline = aggregate(input.baseline);
    const candidate = aggregate(input.candidate);
    return {
      name: input.name ?? `${input.baseline.name} vs ${input.candidate.name}`,
      generatedAt: new Date().toISOString(),
      baselineStatus: input.baseline.status,
      candidateStatus: input.candidate.status,
      deltas: {
        cost: candidate.cost - baseline.cost,
        totalTokens: candidate.totalTokens - baseline.totalTokens,
        promptTokens: candidate.promptTokens - baseline.promptTokens,
        completionTokens: candidate.completionTokens - baseline.completionTokens,
        averageQualityScore:
          candidate.averageQualityScore - baseline.averageQualityScore,
        averageCacheHitRate:
          candidate.averageCacheHitRate - baseline.averageCacheHitRate,
      },
    };
  },

  formatMarkdown(report: AgentEvalReport): string {
    return formatAgentEvalMarkdown(report);
  },

  async writeMarkdown(
    report: AgentEvalReport,
    filePath: string,
  ): Promise<void> {
    await writeText(filePath, formatAgentEvalMarkdown(report));
  },

  async writeJson(report: AgentEvalReport, filePath: string): Promise<void> {
    await writeText(filePath, `${JSON.stringify(report, null, 2)}\n`);
  },

  assert: {
    contains(text: string): AgentEvalAssertion {
      return assertion(`contains:${text}`, (response) => {
        const passed = response.content.includes(text);
        return {
          name: `contains '${text}'`,
          passed,
          ...(passed
            ? {}
            : { message: `Expected output to contain '${text}'.` }),
        };
      });
    },

    notContains(text: string): AgentEvalAssertion {
      return assertion(`notContains:${text}`, (response) => {
        const passed = !response.content.includes(text);
        return {
          name: `does not contain '${text}'`,
          passed,
          ...(passed
            ? {}
            : { message: `Expected output not to contain '${text}'.` }),
        };
      });
    },

    matches(pattern: RegExp): AgentEvalAssertion {
      return assertion(`matches:${pattern.source}`, (response) => {
        const passed = pattern.test(response.content);
        return {
          name: `matches ${pattern.toString()}`,
          passed,
          ...(passed
            ? {}
            : { message: `Expected output to match ${pattern.toString()}.` }),
        };
      });
    },

    jsonPath(pathExpression: string, matcher: unknown): AgentEvalAssertion {
      return assertion(`jsonPath:${pathExpression}`, (response) => {
        const value = readPath(response.structuredResponse, pathExpression);
        const passed = matchesValue(value, matcher);
        return {
          name: `jsonPath ${pathExpression}`,
          passed,
          ...(passed
            ? {}
            : {
                message: `Expected structuredResponse.${pathExpression} to match ${formatMatcher(matcher)}, got ${JSON.stringify(value)}.`,
              }),
        };
      });
    },

    toolCalled(name: string): AgentEvalAssertion {
      return assertion(`toolCalled:${name}`, (response) => {
        const names = toolCallNames(response);
        const executed = response.selection?.executedToolCalls ?? 0;
        const passed = Boolean(
          names.includes(name) ||
            (executed > 0 && response.selection?.exposedTools.includes(name)),
        );
        return {
          name: `tool called '${name}'`,
          passed,
          ...(passed
            ? {}
            : { message: `Expected tool '${name}' to be called.` }),
        };
      });
    },

    skillActivated(name: string): AgentEvalAssertion {
      return assertion(`skillActivated:${name}`, (response) => {
        const passed = response.selection?.activeSkills.includes(name) ?? false;
        return {
          name: `skill activated '${name}'`,
          passed,
          ...(passed
            ? {}
            : { message: `Expected skill '${name}' to be active.` }),
        };
      });
    },

    cacheHitRateAtLeast(rate: number): AgentEvalAssertion {
      return assertion(`cacheHitRateAtLeast:${rate}`, (response) => {
        const observed = response.cache?.summary?.hitRate ?? 0;
        const passed = observed >= rate;
        return {
          name: `cache hit rate >= ${rate}`,
          passed,
          ...(passed
            ? {}
            : {
                message: `Expected cache hit rate >= ${rate}, observed ${observed}.`,
              }),
        };
      });
    },
  },
} as const;

async function runCase(options: {
  readonly agent: Pick<Agent, "run">;
  readonly suite: AgentEvalSuiteConfig;
  readonly case: AgentEvalCaseConfig;
  readonly judge?: AgentEvalJudge;
}): Promise<AgentEvalCaseResult> {
  const started = Date.now();
  const response = await executeCase(options.agent, options.suite, options.case);
  const replay = shouldRunReplay(options.suite, options.case)
    ? await executeCase(options.agent, options.suite, options.case, response)
    : undefined;
  const assertions = await runAssertions(response, {
    case: options.case,
    suite: options.suite,
    ...(replay !== undefined && { replay }),
  });
  const gateResults = evaluateGates(
    response,
    replay,
    options.case,
    options.suite.defaults,
  );
  const judged = await scoreQuality(options.case, response, replay, options.judge);
  const qualityFailures = evaluateQualityGate(
    judged.score,
    options.suite.defaults?.minQualityScore,
  );
  const failures = [
    ...assertions
      .filter((result) => !result.passed)
      .map((result) => result.message ?? `${result.name} failed.`),
    ...gateResults.failures,
    ...qualityFailures,
  ];
  const warnings = gateResults.warnings;

  return {
    name: options.case.name,
    status:
      failures.length > 0 ? "failed" : warnings.length > 0 ? "warning" : "passed",
    durationMs: Date.now() - started,
    response,
    ...(replay !== undefined && { replay }),
    qualityScore: judged.score,
    ...(judged.notes !== undefined && { judgeNotes: judged.notes }),
    assertions,
    failures,
    warnings,
    metrics: caseMetrics(response, replay),
  };
}

async function executeCase(
  agent: Pick<Agent, "run">,
  suite: AgentEvalSuiteConfig,
  evalCase: AgentEvalCaseConfig,
  replayOf?: AgentResponse,
): Promise<AgentResponse> {
  if (typeof evalCase.run === "function") {
    return evalCase.run({
      agent,
      suite,
      case: evalCase,
      ...(replayOf !== undefined && { replayOf }),
    });
  }

  const runOverride = evalCase.run ?? {};
  const params: AgentRunParams = {
    ...runOverride,
    prompt: evalCase.prompt,
  };
  if (replayOf !== undefined && params.replay === undefined) {
    params.replay = replayOf;
  }
  return agent.run(params);
}

function shouldRunReplay(
  suite: AgentEvalSuiteConfig,
  evalCase: AgentEvalCaseConfig,
): boolean {
  return Boolean(
    suite.defaults?.requireCacheReplay ||
      evalCase.expect?.cache?.minHitRateOnReplay !== undefined,
  );
}

async function runAssertions(
  response: AgentResponse,
  context: AgentEvalCaseExecutionContext,
): Promise<AgentEvalAssertionResult[]> {
  const assertions = context.case.assertions ?? [];
  const results: AgentEvalAssertionResult[] = [];
  for (const item of assertions) {
    results.push(await item.evaluate(response, context));
  }
  return results;
}

function evaluateGates(
  response: AgentResponse,
  replay: AgentResponse | undefined,
  evalCase: AgentEvalCaseConfig,
  defaults: AgentEvalGateDefaults | undefined,
): { failures: string[]; warnings: string[] } {
  const failures: string[] = [];
  const warnings: string[] = [];
  const expect = evalCase.expect;
  const activeSkills = response.selection?.activeSkills ?? [];
  const exposedTools = response.selection?.exposedTools ?? [];
  const executedToolCalls = response.selection?.executedToolCalls ?? 0;

  if (defaults?.maxCostUsd !== undefined && response.cost > defaults.maxCostUsd) {
    failures.push(
      `Cost gate failed: ${formatNumber(response.cost)} > ${formatNumber(defaults.maxCostUsd)}.`,
    );
  }
  if (
    defaults?.maxPromptTokens !== undefined &&
    response.tokensUsed.prompt > defaults.maxPromptTokens
  ) {
    failures.push(
      `Prompt token gate failed: ${response.tokensUsed.prompt} > ${defaults.maxPromptTokens}.`,
    );
  }
  if (
    defaults?.maxCompletionTokens !== undefined &&
    response.tokensUsed.completion > defaults.maxCompletionTokens
  ) {
    failures.push(
      `Completion token gate failed: ${response.tokensUsed.completion} > ${defaults.maxCompletionTokens}.`,
    );
  }
  if (
    defaults?.maxTotalTokens !== undefined &&
    response.tokensUsed.total > defaults.maxTotalTokens
  ) {
    failures.push(
      `Total token gate failed: ${response.tokensUsed.total} > ${defaults.maxTotalTokens}.`,
    );
  }
  if (
    defaults?.maxToolCalls !== undefined &&
    executedToolCalls > defaults.maxToolCalls
  ) {
    failures.push(
      `Tool-call gate failed: ${executedToolCalls} > ${defaults.maxToolCalls}.`,
    );
  }
  if (defaults?.requireSkillActivation && activeSkills.length === 0) {
    failures.push("Skill activation gate failed: no skill was activated.");
  }

  for (const skill of expect?.activeSkills ?? []) {
    if (!activeSkills.includes(skill)) {
      failures.push(`Expected skill '${skill}' to be active.`);
    }
  }
  for (const skill of expect?.inactiveSkills ?? []) {
    if (activeSkills.includes(skill)) {
      failures.push(`Expected skill '${skill}' to remain inactive.`);
    }
  }
  for (const tool of expect?.exposedTools ?? []) {
    if (!exposedTools.includes(tool)) {
      failures.push(`Expected tool '${tool}' to be exposed.`);
    }
  }
  if (expect?.maxToolCalls !== undefined && executedToolCalls > expect.maxToolCalls) {
    failures.push(
      `Case tool-call gate failed: ${executedToolCalls} > ${expect.maxToolCalls}.`,
    );
  }
  if (
    expect?.cache?.minHitRate !== undefined &&
    (response.cache?.summary?.hitRate ?? 0) < expect.cache.minHitRate
  ) {
    failures.push(
      `Cache hit-rate gate failed: ${response.cache?.summary?.hitRate ?? 0} < ${expect.cache.minHitRate}.`,
    );
  }
  if (
    expect?.cache?.maxMisses !== undefined &&
    (response.cache?.misses ?? 0) > expect.cache.maxMisses
  ) {
    failures.push(
      `Cache miss gate failed: ${response.cache?.misses ?? 0} > ${expect.cache.maxMisses}.`,
    );
  }
  if (expect?.cache?.minHitRateOnReplay !== undefined) {
    if (!replay) {
      failures.push("Cache replay gate failed: replay was not executed.");
    } else if ((replay.cache?.summary?.hitRate ?? 0) < expect.cache.minHitRateOnReplay) {
      failures.push(
        `Cache replay hit-rate gate failed: ${replay.cache?.summary?.hitRate ?? 0} < ${expect.cache.minHitRateOnReplay}.`,
      );
    }
  }
  if (expect?.artifacts?.requiredTypes?.length) {
    warnings.push(
      "Artifact expectation is recorded but no artifact registry is attached to this eval result yet.",
    );
  }
  return { failures, warnings };
}

async function scoreQuality(
  evalCase: AgentEvalCaseConfig,
  response: AgentResponse,
  replay: AgentResponse | undefined,
  judge: AgentEvalJudge | undefined,
): Promise<AgentEvalJudgeResult> {
  if (judge) return judge({ case: evalCase, response, ...(replay !== undefined && { replay }) });
  if (!evalCase.rubric?.length) return { score: 1 };
  const content = response.content.toLowerCase();
  const hits = evalCase.rubric.filter((item) =>
    rubricKeywords(item).some((keyword) => content.includes(keyword)),
  ).length;
  return {
    score: hits / evalCase.rubric.length,
    notes: "Deterministic keyword rubric score. Provide a judge for model-graded evaluation.",
  };
}

function evaluateQualityGate(
  score: number | undefined,
  minQualityScore: number | undefined,
): string[] {
  if (score === undefined || minQualityScore === undefined) return [];
  return score < minQualityScore
    ? [`Quality gate failed: ${formatNumber(score)} < ${formatNumber(minQualityScore)}.`]
    : [];
}

function caseMetrics(
  response: AgentResponse,
  replay: AgentResponse | undefined,
): AgentEvalCaseResult["metrics"] {
  return {
    cost: response.cost,
    promptTokens: response.tokensUsed.prompt,
    completionTokens: response.tokensUsed.completion,
    totalTokens: response.tokensUsed.total,
    activeSkills: response.selection?.activeSkills ?? [],
    exposedTools: response.selection?.exposedTools ?? [],
    executedToolCalls: response.selection?.executedToolCalls ?? 0,
    ...(response.cache?.summary?.hitRate !== undefined && {
      cacheHitRate: response.cache.summary.hitRate,
    }),
    ...(replay?.cache?.summary?.hitRate !== undefined && {
      replayCacheHitRate: replay.cache.summary.hitRate,
    }),
  };
}

function summarizeResults(results: readonly AgentEvalCaseResult[]): AgentEvalReport["summary"] {
  return {
    total: results.length,
    passed: results.filter((result) => result.status === "passed").length,
    failed: results.filter((result) => result.status === "failed").length,
    warnings: results.filter((result) => result.status === "warning").length,
    totalCost: results.reduce((sum, result) => sum + result.metrics.cost, 0),
    totalTokens: results.reduce(
      (sum, result) => sum + result.metrics.totalTokens,
      0,
    ),
  };
}

function assertion(
  name: string,
  evaluate: AgentEvalAssertion["evaluate"],
): AgentEvalAssertion {
  return { name, evaluate };
}

function suiteToConfig(suite: AgentEvalSuite | AgentEvalSuiteConfig): AgentEvalSuiteConfig {
  if (suite instanceof EvalSuite) return suite.toConfig();
  const reporter = "reporter" in suite ? suite.reporter : undefined;
  return {
    name: suite.name,
    ...(suite.description !== undefined && { description: suite.description }),
    ...(suite.defaults !== undefined && { defaults: suite.defaults }),
    ...(reporter !== undefined && { reporter }),
  };
}

function suiteCases(suite: AgentEvalSuite | AgentEvalSuiteConfig): readonly AgentEvalCaseConfig[] {
  return suite instanceof EvalSuite ? suite.cases : [];
}

function formatAgentEvalMarkdown(report: AgentEvalReport): string {
  return [
    `# ${report.name}`,
    "",
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    "",
    report.description,
    "## Summary",
    "",
    "| Cases | Passed | Failed | Warnings | Total tokens | Total cost |",
    "| ---: | ---: | ---: | ---: | ---: | ---: |",
    `| ${report.summary.total} | ${report.summary.passed} | ${report.summary.failed} | ${report.summary.warnings} | ${report.summary.totalTokens} | ${formatCost(report.summary.totalCost)} |`,
    "",
    "## Results",
    "",
    "| Case | Status | Prompt tokens | Total tokens | Cost | Quality | Skills | Tools | Cache hit rate |",
    "| --- | --- | ---: | ---: | ---: | ---: | --- | ---: | ---: |",
    ...report.results.map(
      (result) =>
        `| ${escapeCell(result.name)} | ${result.status} | ${result.metrics.promptTokens} | ${result.metrics.totalTokens} | ${formatCost(result.metrics.cost)} | ${formatNumber(result.qualityScore ?? 0)} | ${result.metrics.activeSkills.length ? result.metrics.activeSkills.map(code).join(", ") : "-"} | ${result.metrics.executedToolCalls} | ${percent(result.metrics.cacheHitRate ?? 0)} |`,
    ),
    "",
    "## Findings",
    "",
    ...report.results.flatMap((result) => [
      `### ${result.name}`,
      "",
      result.failures.length ? "**Failures**" : undefined,
      ...result.failures.map((failure) => `- ${failure}`),
      result.warnings.length ? "**Warnings**" : undefined,
      ...result.warnings.map((warning) => `- ${warning}`),
      result.assertions.length ? "**Assertions**" : undefined,
      ...result.assertions.map(
        (item) =>
          `- ${item.passed ? "pass" : "fail"}: ${item.name}${item.message ? ` - ${item.message}` : ""}`,
      ),
      result.judgeNotes ? `Judge notes: ${result.judgeNotes}` : undefined,
      "",
    ]),
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n");
}

function aggregate(report: AgentEvalReport): {
  cost: number;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  averageQualityScore: number;
  averageCacheHitRate: number;
} {
  const count = report.results.length || 1;
  return {
    cost: report.summary.totalCost,
    totalTokens: report.summary.totalTokens,
    promptTokens: report.results.reduce(
      (sum, result) => sum + result.metrics.promptTokens,
      0,
    ),
    completionTokens: report.results.reduce(
      (sum, result) => sum + result.metrics.completionTokens,
      0,
    ),
    averageQualityScore:
      report.results.reduce(
        (sum, result) => sum + (result.qualityScore ?? 0),
        0,
      ) / count,
    averageCacheHitRate:
      report.results.reduce(
        (sum, result) => sum + (result.metrics.cacheHitRate ?? 0),
        0,
      ) / count,
  };
}

async function writeText(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

function readPath(value: unknown, pathExpression: string): unknown {
  return pathExpression.split(".").reduce<unknown>((current, segment) => {
    if (current === null || typeof current !== "object") return undefined;
    return (current as Record<string, unknown>)[segment];
  }, value);
}

function matchesValue(value: unknown, matcher: unknown): boolean {
  if (matcher instanceof RegExp) return typeof value === "string" && matcher.test(value);
  if (typeof matcher === "function") return Boolean((matcher as (item: unknown) => boolean)(value));
  return Object.is(value, matcher);
}

function formatMatcher(matcher: unknown): string {
  if (matcher instanceof RegExp) return matcher.toString();
  if (typeof matcher === "function") return "[function matcher]";
  return JSON.stringify(matcher);
}

function toolCallNames(response: AgentResponse): string[] {
  return (response.toolCalls ?? [])
    .map((toolCall) => {
      const record = toolCall as unknown as Record<string, unknown>;
      return String(record.name ?? record.toolName ?? record.functionName ?? "");
    })
    .filter(Boolean);
}

function rubricKeywords(item: string): string[] {
  return item
    .toLowerCase()
    .match(/[a-z0-9]{5,}/g)
    ?.filter((word) => !STOP_WORDS.has(word)) ?? [];
}

const STOP_WORDS = new Set([
  "about",
  "after",
  "before",
  "claim",
  "claims",
  "first",
  "section",
  "specific",
  "without",
  "quality",
]);

function escapeCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

function code(value: string): string {
  return `\`${value}\``;
}

function formatCost(value: number): string {
  return `$${value.toFixed(value < 0.01 ? 6 : 4)}`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
