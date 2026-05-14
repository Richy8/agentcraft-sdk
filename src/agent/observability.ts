import { redactSecrets } from './adapters/tool-policy.js';

export interface TraceSpan {
  runId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: 'agent' | 'model' | 'tool' | 'mcp' | 'adapter' | 'team' | 'retry' | 'guardrail';
  startedAt: string;
  endedAt?: string;
  status: 'ok' | 'error';
  attributes?: Record<string, unknown>;
  error?: string;
}

export interface TraceSink {
  onSpanStart?: (span: TraceSpan) => void;
  onSpanEnd?: (span: TraceSpan) => void;
}

export interface TraceReplayFixture {
  version: 1;
  runId: string;
  spans: TraceSpan[];
}

export interface OpenTelemetryLikeTracer {
  startSpan(name: string, options?: { attributes?: Record<string, unknown> }): { end(): void; recordException?(error: unknown): void; setStatus?(status: { code: number; message?: string }): void };
}

export function createOpenTelemetryTraceSink(tracer: OpenTelemetryLikeTracer): TraceSink {
  const active = new Map<string, ReturnType<OpenTelemetryLikeTracer['startSpan']>>();
  return {
    onSpanStart: (span) => {
      active.set(span.spanId, tracer.startSpan(span.name, span.attributes !== undefined ? { attributes: span.attributes } : undefined));
    },
    onSpanEnd: (span) => {
      const otelSpan = active.get(span.spanId);
      if (!otelSpan) return;
      if (span.status === 'error') {
        otelSpan.recordException?.(span.error);
        otelSpan.setStatus?.({ code: 2, ...(span.error !== undefined && { message: span.error }) });
      }
      otelSpan.end();
      active.delete(span.spanId);
    },
  };
}

export class RunTracer {
  readonly runId: string;
  private readonly spans: TraceSpan[] = [];

  constructor(private readonly sink?: TraceSink, runId = createId('run')) {
    this.runId = runId;
  }

  start(kind: TraceSpan['kind'], name: string, attributes?: Record<string, unknown>, parentSpanId?: string): TraceSpan {
    const span: TraceSpan = {
      runId: this.runId,
      spanId: createId('span'),
      ...(parentSpanId !== undefined && { parentSpanId }),
      name,
      kind,
      startedAt: new Date().toISOString(),
      status: 'ok',
      ...(attributes !== undefined && { attributes: redactSecrets(attributes) as Record<string, unknown> }),
    };
    this.spans.push(span);
    this.sink?.onSpanStart?.(span);
    return span;
  }

  end(span: TraceSpan, error?: unknown): TraceSpan {
    span.endedAt = new Date().toISOString();
    if (error) {
      span.status = 'error';
      span.error = error instanceof Error ? error.message : String(error);
    }
    this.sink?.onSpanEnd?.(span);
    return span;
  }

  export(): TraceSpan[] {
    return this.spans.map((span) => redactSecrets(span) as TraceSpan);
  }

  replayFixture(): TraceReplayFixture {
    return { version: 1, runId: this.runId, spans: this.export() };
  }
}

export function createId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}
