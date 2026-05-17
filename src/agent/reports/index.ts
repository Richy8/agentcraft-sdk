import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { redactSecrets } from "../adapters/tool-policy.js";
import type { AgentEventEmitter, AgentEventMap, AgentEventType } from "../events.js";
import type { TeamResponse } from "../types.js";
import type { TraceSink, TraceSpan } from "../observability.js";
import type { WorkflowResult } from "../workflow/types.js";
import type { AgentResponse, CostReport, TokenUsage } from "../types.js";

export interface AgentReportIncludeOptions {
  readonly prompt?: boolean;
  readonly outputPreview?: boolean;
  readonly fullOutput?: boolean;
  readonly traces?: boolean;
  readonly toolCalls?: boolean;
  readonly cache?: boolean;
  readonly memory?: boolean;
  readonly artifacts?: boolean;
  readonly approvals?: boolean;
  readonly costs?: boolean;
}

export interface AgentReportOptions {
  readonly title?: string;
  readonly include?: AgentReportIncludeOptions;
  readonly redact?: boolean;
  readonly maxOutputChars?: number;
  readonly maxPromptChars?: number;
  readonly timeZone?: string;
  readonly events?: readonly AgentReportEvent[];
}

export interface AgentTraceCollector extends TraceSink {
  spans(): readonly TraceSpan[];
  replayFixture(): { version: 1; runId: string; spans: readonly TraceSpan[] };
  clear(): void;
}

export interface AgentReportEvent {
  readonly type: string;
  readonly at: string;
  readonly data: unknown;
}

export interface AgentReportEventCollector {
  attach(events: AgentEventEmitter): () => void;
  record(type: string, data: unknown): void;
  events(): readonly AgentReportEvent[];
  clear(): void;
}

export interface AgentRunReport {
  readonly title: string;
  readonly generatedAt: string;
  readonly kind: "agent" | "team" | "workflow" | "trace";
  readonly runId?: string;
  readonly status?: string;
  readonly provider?: string;
  readonly model?: string;
  readonly contentPreview?: string;
  readonly content?: string;
  readonly tokensUsed?: TokenUsage;
  readonly cost?: number;
  readonly costReport?: CostReport;
  readonly selection?: AgentResponse["selection"];
  readonly cache?: AgentResponse["cache"];
  readonly toolCalls?: AgentResponse["toolCalls"];
  readonly traces?: readonly TraceSpan[];
  readonly events?: readonly AgentReportEvent[];
  readonly approvals?: {
    readonly requested: number;
    readonly granted: number;
    readonly denied: number;
    readonly expired: number;
    readonly reviewerNotes: readonly string[];
  };
  readonly artifacts?: {
    readonly reads: number;
    readonly writes: number;
    readonly updates: number;
    readonly deletes: number;
  };
  readonly memory?: {
    readonly reads: number;
    readonly writes: number;
    readonly deletes: number;
    readonly blocked: number;
    readonly warnings: readonly string[];
  };
  readonly timeline: readonly AgentReportTimelineItem[];
  readonly workflow?: {
    readonly steps: WorkflowResult["steps"];
    readonly metrics?: WorkflowResult["metrics"];
  };
  readonly team?: {
    readonly rounds: number;
    readonly agentsUsed: number;
    readonly trace?: TeamResponse["trace"];
  };
}

export interface AgentReportTimelineItem {
  readonly name: string;
  readonly kind: string;
  readonly status: string;
  readonly startedAt?: string;
  readonly endedAt?: string;
  readonly durationMs?: number;
  readonly error?: string;
}

export const AgentReports = {
  fromResponse(response: AgentResponse, options: AgentReportOptions = {}): AgentRunReport {
    return sanitizeReport(buildResponseReport(response, options), options);
  },

  fromWorkflow(result: WorkflowResult, options: AgentReportOptions = {}): AgentRunReport {
    return sanitizeReport(buildWorkflowReport(result, options), options);
  },

  fromTeam(response: TeamResponse, options: AgentReportOptions = {}): AgentRunReport {
    return sanitizeReport(buildTeamReport(response, options), options);
  },

  fromTrace(spans: readonly TraceSpan[], options: AgentReportOptions = {}): AgentRunReport {
    return sanitizeReport(buildTraceReport(spans, options), options);
  },

  async writeMarkdown(
    subject: AgentReportSubject,
    filePath: string,
    options: AgentReportOptions = {},
  ): Promise<void> {
    const report = toReport(subject, options);
    await writeText(filePath, formatMarkdown(report));
  },

  async writeJson(
    subject: AgentReportSubject,
    filePath: string,
    options: AgentReportOptions = {},
  ): Promise<void> {
    const report = toReport(subject, options);
    await writeText(filePath, `${JSON.stringify(report, null, 2)}\n`);
  },

  async writeHtml(
    subject: AgentReportSubject,
    filePath: string,
    options: AgentReportOptions = {},
  ): Promise<void> {
    const report = toReport(subject, options);
    await writeText(filePath, formatHtml(report));
  },

  traceCollector(): AgentTraceCollector {
    const spans: TraceSpan[] = [];
    return {
      onSpanStart(span) {
        spans.push({ ...span });
      },
      onSpanEnd(span) {
        const index = spans.findIndex((item) => item.spanId === span.spanId);
        if (index === -1) {
          spans.push({ ...span });
          return;
        }
        spans[index] = { ...span };
      },
      spans() {
        return spans.map((span) => ({ ...span }));
      },
      replayFixture() {
        return {
          version: 1,
          runId: spans[0]?.runId ?? "trace",
          spans: this.spans(),
        };
      },
      clear() {
        spans.splice(0, spans.length);
      },
    };
  },

  eventCollector(events?: AgentEventEmitter): AgentReportEventCollector {
    const records: AgentReportEvent[] = [];
    const collector: AgentReportEventCollector = {
      attach(source) {
        const unsubscribers = EVENT_TYPES.map((type) =>
          source.on(type, (data) => {
            collector.record(type, data);
          }),
        );
        return () => {
          for (const unsubscribe of unsubscribers) unsubscribe();
        };
      },
      record(type, data) {
        records.push({ type, at: new Date().toISOString(), data });
      },
      events() {
        return records.map((record) => ({ ...record }));
      },
      clear() {
        records.splice(0, records.length);
      },
    };
    if (events) collector.attach(events);
    return collector;
  },
} as const;

export type AgentReportSubject =
  | AgentResponse
  | TeamResponse
  | WorkflowResult
  | AgentRunReport
  | readonly TraceSpan[];

function buildResponseReport(
  response: AgentResponse,
  options: AgentReportOptions,
): AgentRunReport {
  const traces = asTraceSpans(response.trace);
  const events = options.events ?? [];
  const content = include(options, "fullOutput", false) ? response.content : undefined;
  return {
    title: options.title ?? "Agent Run Report",
    generatedAt: new Date().toISOString(),
    kind: "agent",
    ...(response.runId !== undefined && { runId: response.runId }),
    status: response.finishReason,
    provider: response.provider,
    model: response.model,
    ...(include(options, "outputPreview", true) && {
      contentPreview: truncate(response.content, options.maxOutputChars ?? 1200),
    }),
    ...(content !== undefined && { content }),
    tokensUsed: response.tokensUsed,
    cost: response.cost,
    ...(include(options, "costs", true) && response.costReport !== undefined && {
      costReport: response.costReport,
    }),
    ...(response.selection !== undefined && { selection: response.selection }),
    ...(include(options, "cache", true) && response.cache !== undefined && {
      cache: response.cache,
    }),
    ...(include(options, "toolCalls", true) && response.toolCalls !== undefined && {
      toolCalls: response.toolCalls,
    }),
    ...(include(options, "traces", true) && traces.length > 0 && { traces }),
    ...(events.length > 0 && { events }),
    ...(include(options, "approvals", true) && {
      approvals: approvalSummary(events),
    }),
    ...(include(options, "artifacts", true) && {
      artifacts: artifactSummary(events),
    }),
    ...(include(options, "memory", true) && {
      memory: memorySummary(events),
    }),
    timeline: [...timelineFromSpans(traces), ...timelineFromEvents(events)],
  };
}

function buildTeamReport(
  response: TeamResponse,
  options: AgentReportOptions,
): AgentRunReport {
  const base = buildResponseReport(response, {
    ...options,
    title: options.title ?? "Agent Team Report",
  });
  const traces = response.traceSpans ?? base.traces ?? [];
  return {
    ...base,
    kind: "team",
    ...(traces.length > 0 && { traces }),
    timeline: timelineFromSpans(traces),
    team: {
      rounds: response.rounds,
      agentsUsed: response.agentsUsed,
      ...(response.trace !== undefined && { trace: response.trace }),
    },
  };
}

function buildWorkflowReport(
  result: WorkflowResult,
  options: AgentReportOptions,
): AgentRunReport {
  return {
    title: options.title ?? "Agent Workflow Report",
    generatedAt: new Date().toISOString(),
    kind: "workflow",
    runId: result.runId,
    status: result.status,
    cost: result.totalCost,
    ...(result.metrics?.tokensUsed !== undefined && {
      tokensUsed: result.metrics.tokensUsed,
    }),
    ...(include(options, "costs", true) && result.costReport !== undefined && {
      costReport: result.costReport,
    }),
    timeline: result.steps.map((step) => ({
      name: step.stepId,
      kind: "workflow.step",
      status: step.status,
      durationMs: step.durationMs,
      ...(step.error !== undefined && { error: step.error }),
    })),
    workflow: {
      steps: result.steps,
      ...(result.metrics !== undefined && { metrics: result.metrics }),
    },
    ...(include(options, "artifacts", true) && result.metrics !== undefined && {
      artifacts: {
        reads: result.metrics.artifacts.reads,
        writes: result.metrics.artifacts.writes,
        updates: result.metrics.artifacts.updates,
        deletes: result.metrics.artifacts.deletes,
      },
    }),
    ...(include(options, "memory", true) && result.metrics !== undefined && {
      memory: {
        reads: result.metrics.memory.reads,
        writes: result.metrics.memory.writes,
        deletes: result.metrics.memory.deletes,
        blocked: result.metrics.memory.blocked,
        warnings: [],
      },
    }),
  };
}

function buildTraceReport(
  spans: readonly TraceSpan[],
  options: AgentReportOptions,
): AgentRunReport {
  return {
    title: options.title ?? "Agent Trace Report",
    generatedAt: new Date().toISOString(),
    kind: "trace",
    ...(spans[0]?.runId !== undefined && { runId: spans[0].runId }),
    traces: spans.map((span) => ({ ...span })),
    timeline: timelineFromSpans(spans),
  };
}

function toReport(
  subject: AgentReportSubject,
  options: AgentReportOptions,
): AgentRunReport {
  if (isTraceSpanArray(subject)) return AgentReports.fromTrace(subject, options);
  if (isReport(subject)) return sanitizeReport(subject, options);
  if (isWorkflowResult(subject)) return AgentReports.fromWorkflow(subject, options);
  if (isTeamResponse(subject)) return AgentReports.fromTeam(subject, options);
  return AgentReports.fromResponse(subject, options);
}

function sanitizeReport(
  report: AgentRunReport,
  options: AgentReportOptions,
): AgentRunReport {
  if (options.redact === false) return report;
  return sanitizeValue(report) as AgentRunReport;
}

function sanitizeValue(value: unknown): unknown {
  return redactSecrets(redactUrls(value));
}

function redactUrls(value: unknown): unknown {
  if (typeof value === "string") return redactUrlString(value);
  if (Array.isArray(value)) return value.map((item) => redactUrls(item));
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      redactUrls(item),
    ]),
  );
}

function redactUrlString(value: string): string {
  return value.replace(
    /\b(?:redis|rediss|postgres|postgresql|mysql|mongodb|https?):\/\/[^\s)'"<>]+/gi,
    (candidate) => {
      try {
        const url = new URL(candidate);
        if (url.username) url.username = "[REDACTED]";
        if (url.password) url.password = "[REDACTED]";
        for (const key of [...url.searchParams.keys()]) {
          if (/key|token|secret|password|signature/i.test(key)) {
            url.searchParams.set(key, "[REDACTED]");
          }
        }
        return url.toString();
      } catch {
        return candidate;
      }
    },
  );
}

function formatMarkdown(report: AgentRunReport): string {
  return [
    `# ${report.title}`,
    "",
    `Generated: ${report.generatedAt}`,
    `Kind: ${report.kind}`,
    report.runId ? `Run ID: ${report.runId}` : undefined,
    report.status ? `Status: ${report.status}` : undefined,
    report.provider && report.model
      ? `Model: ${report.provider}/${report.model}`
      : undefined,
    "",
    "## Cost And Tokens",
    "",
    "| Prompt | Completion | Total | Cost | Budget mode | Stale pricing |",
    "| ---: | ---: | ---: | ---: | --- | --- |",
    `| ${report.tokensUsed?.prompt ?? 0} | ${report.tokensUsed?.completion ?? 0} | ${report.tokensUsed?.total ?? 0} | ${formatCost(report.cost ?? 0)} | ${report.costReport?.budgetMode ?? "-"} | ${report.costReport?.stalePricing ? "yes" : "no"} |`,
    "",
    report.selection ? "## Skills And Tools" : undefined,
    report.selection ? "" : undefined,
    report.selection
      ? `Active skills: ${report.selection.activeSkills.length ? report.selection.activeSkills.map(code).join(", ") : "-"}`
      : undefined,
    report.selection
      ? `Exposed tools: ${report.selection.exposedTools.length ? report.selection.exposedTools.map(code).join(", ") : "-"}`
      : undefined,
    report.selection
      ? `Executed tool calls: ${report.selection.executedToolCalls ?? 0}`
      : undefined,
    report.cache ? "" : undefined,
    report.cache ? "## Cache" : undefined,
    report.cache ? "" : undefined,
    report.cache
      ? `Hits: ${report.cache.hits}, misses: ${report.cache.misses}, writes: ${report.cache.writes}, hit rate: ${percent(report.cache.summary?.hitRate ?? 0)}, estimated saved tokens: ${Math.round(report.cache.estimatedSavedTokens)}`
      : undefined,
    report.approvals ? "" : undefined,
    report.approvals ? "## Approvals" : undefined,
    report.approvals ? "" : undefined,
    report.approvals
      ? `Requested: ${report.approvals.requested}, granted: ${report.approvals.granted}, denied: ${report.approvals.denied}, expired: ${report.approvals.expired}`
      : undefined,
    ...(report.approvals?.reviewerNotes.map((note) => `- Reviewer note: ${note}`) ?? []),
    report.artifacts ? "" : undefined,
    report.artifacts ? "## Artifacts" : undefined,
    report.artifacts ? "" : undefined,
    report.artifacts
      ? `Reads: ${report.artifacts.reads}, writes: ${report.artifacts.writes}, updates: ${report.artifacts.updates}, deletes: ${report.artifacts.deletes}`
      : undefined,
    report.memory ? "" : undefined,
    report.memory ? "## Memory" : undefined,
    report.memory ? "" : undefined,
    report.memory
      ? `Reads: ${report.memory.reads}, writes: ${report.memory.writes}, deletes: ${report.memory.deletes}, blocked: ${report.memory.blocked}, warnings: ${report.memory.warnings.length}`
      : undefined,
    report.workflow ? "" : undefined,
    report.workflow ? "## Workflow" : undefined,
    report.workflow ? "" : undefined,
    ...(report.workflow?.steps.map(
      (step) =>
        `- ${step.stepId}: ${step.status} (${step.durationMs}ms)${step.error ? ` - ${step.error}` : ""}`,
    ) ?? []),
    report.team ? "" : undefined,
    report.team ? "## Team" : undefined,
    report.team ? "" : undefined,
    report.team
      ? `Rounds: ${report.team.rounds}, agents used: ${report.team.agentsUsed}`
      : undefined,
    "",
    "## Timeline",
    "",
    ...(report.timeline.length
      ? report.timeline.map(
          (item) =>
            `- ${item.name} (${item.kind}) ${item.status}${item.durationMs !== undefined ? `, ${item.durationMs}ms` : ""}${item.error ? ` - ${item.error}` : ""}`,
        )
      : ["- No trace timeline captured."]),
    report.contentPreview ? "" : undefined,
    report.contentPreview ? "## Output Preview" : undefined,
    report.contentPreview ? "" : undefined,
    report.contentPreview ? fenced(report.contentPreview) : undefined,
    report.content ? "" : undefined,
    report.content ? "## Full Output" : undefined,
    report.content ? "" : undefined,
    report.content ? fenced(report.content) : undefined,
    "",
  ]
    .filter((line): line is string => line !== undefined)
    .join("\n");
}

function formatHtml(report: AgentRunReport): string {
  const markdown = formatMarkdown(report);
  const body = markdown
    .split("\n")
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("\n");
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(report.title)}</title>
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.55; margin: 2rem auto; max-width: 960px; padding: 0 1rem; color: #172033; }
    p { white-space: pre-wrap; margin: 0.35rem 0; }
  </style>
</head>
<body>
${body}
</body>
</html>
`;
}

function timelineFromSpans(spans: readonly TraceSpan[]): AgentReportTimelineItem[] {
  return spans.map((span) => ({
    name: span.name,
    kind: span.kind,
    status: span.status,
    startedAt: span.startedAt,
    ...(span.endedAt !== undefined && { endedAt: span.endedAt }),
    ...(span.endedAt !== undefined && {
      durationMs: Math.max(
        0,
        new Date(span.endedAt).getTime() - new Date(span.startedAt).getTime(),
      ),
    }),
    ...(span.error !== undefined && { error: span.error }),
  }));
}

function timelineFromEvents(events: readonly AgentReportEvent[]): AgentReportTimelineItem[] {
  return events.map((event) => ({
    name: event.type,
    kind: "event",
    status: "observed",
    startedAt: event.at,
  }));
}

function approvalSummary(
  events: readonly AgentReportEvent[],
): NonNullable<AgentRunReport["approvals"]> {
  const reviewerNotes = events
    .filter((event) => event.type.startsWith("approval."))
    .map((event) => {
      const data = event.data as Record<string, unknown>;
      return typeof data.reason === "string"
        ? data.reason
        : typeof data.note === "string"
          ? data.note
          : undefined;
    })
    .filter((note): note is string => note !== undefined);
  return {
    requested: events.filter((event) => event.type === "approval.requested").length,
    granted: events.filter((event) => event.type === "approval.granted").length,
    denied: events.filter((event) => event.type === "approval.denied").length,
    expired: events.filter((event) => event.type === "approval.expired").length,
    reviewerNotes,
  };
}

function artifactSummary(
  events: readonly AgentReportEvent[],
): NonNullable<AgentRunReport["artifacts"]> {
  return {
    reads: events.filter((event) => event.type === "artifact.read").length,
    writes: events.filter(
      (event) =>
        event.type === "artifact.write" &&
        (event.data as AgentEventMap["artifact.write"]).operation === "put",
    ).length,
    updates: events.filter(
      (event) =>
        event.type === "artifact.write" &&
        (event.data as AgentEventMap["artifact.write"]).operation === "update",
    ).length,
    deletes: events.filter(
      (event) =>
        event.type === "artifact.write" &&
        (event.data as AgentEventMap["artifact.write"]).operation === "delete",
    ).length,
  };
}

function memorySummary(
  events: readonly AgentReportEvent[],
): NonNullable<AgentRunReport["memory"]> {
  const memoryEvents = events.filter((event) => String(event.type).startsWith("memory."));
  const warnings = memoryEvents
    .filter((event) => event.type === "memory.blocked")
    .map((event) => {
      const data = event.data as Record<string, unknown>;
      return typeof data.reason === "string" ? data.reason : undefined;
    })
    .filter((warning): warning is string => warning !== undefined);
  return {
    reads: memoryEvents.filter((event) => String(event.type) === "memory.read").length,
    writes: memoryEvents.filter((event) => String(event.type) === "memory.write").length,
    deletes: memoryEvents.filter((event) => String(event.type) === "memory.delete").length,
    blocked: memoryEvents.filter((event) => String(event.type) === "memory.blocked").length,
    warnings,
  };
}

const EVENT_TYPES: readonly AgentEventType[] = [
  "cache.hit",
  "cache.miss",
  "cache.write",
  "cost.updated",
  "tool.called",
  "approval.requested",
  "approval.granted",
  "approval.denied",
  "approval.queued",
  "approval.expired",
  "workflow.step.started",
  "workflow.step.completed",
  "artifact.read",
  "artifact.write",
  "memory.read",
  "memory.write",
  "memory.delete",
  "memory.blocked",
];

function asTraceSpans(value: unknown): TraceSpan[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isTraceSpan);
}

function isTraceSpanArray(value: AgentReportSubject): value is readonly TraceSpan[] {
  return Array.isArray(value) && value.every(isTraceSpan);
}

function isTraceSpan(value: unknown): value is TraceSpan {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.runId === "string" &&
    typeof record.spanId === "string" &&
    typeof record.name === "string" &&
    typeof record.kind === "string"
  );
}

function isReport(value: AgentReportSubject): value is AgentRunReport {
  return Boolean(
    value &&
      !Array.isArray(value) &&
      typeof value === "object" &&
      "generatedAt" in value &&
      "kind" in value &&
      "timeline" in value,
  );
}

function isWorkflowResult(value: AgentReportSubject): value is WorkflowResult {
  return Boolean(
    value &&
      !Array.isArray(value) &&
      typeof value === "object" &&
      "steps" in value &&
      "totalCost" in value &&
      "durationMs" in value,
  );
}

function isTeamResponse(value: AgentReportSubject): value is TeamResponse {
  return Boolean(
    value &&
      !Array.isArray(value) &&
      typeof value === "object" &&
      "rounds" in value &&
      "agentsUsed" in value,
  );
}

function include(
  options: AgentReportOptions,
  key: keyof AgentReportIncludeOptions,
  defaultValue: boolean,
): boolean {
  return options.include?.[key] ?? defaultValue;
}

async function writeText(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

function truncate(value: string, maxChars: number): string {
  return value.length > maxChars ? `${value.slice(0, Math.max(0, maxChars - 1))}…` : value;
}

function fenced(value: string): string {
  return ["```", value, "```"].join("\n");
}

function code(value: string): string {
  return `\`${value}\``;
}

function formatCost(value: number): string {
  return `$${value.toFixed(value < 0.01 ? 6 : 4)}`;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
