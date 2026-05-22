import { describe, expect, it, vi } from 'vitest';
import { RunTracer, createId, createOpenTelemetryTraceSink } from '../observability.js';

describe('createId', () => {
  it('returns a prefixed string with timestamp and random suffix', () => {
    const id = createId('run');
    expect(id).toMatch(/^run_[a-z0-9]+_[a-z0-9]+$/);
  });

  it('produces unique ids across calls', () => {
    const ids = new Set(Array.from({ length: 20 }, () => createId('span')));
    expect(ids.size).toBe(20);
  });
});

describe('RunTracer', () => {
  it('creates a tracer with a stable runId', () => {
    const tracer = new RunTracer(undefined, 'run_test123');
    expect(tracer.runId).toBe('run_test123');
  });

  it('starts a span and records it', () => {
    const tracer = new RunTracer();
    const span = tracer.start('agent', 'test-span');

    expect(span.runId).toBe(tracer.runId);
    expect(span.name).toBe('test-span');
    expect(span.kind).toBe('agent');
    expect(span.status).toBe('ok');
    expect(span.startedAt).toBeTruthy();
    expect(span.endedAt).toBeUndefined();
  });

  it('ends a span and sets endedAt', () => {
    const tracer = new RunTracer();
    const span = tracer.start('tool', 'run-tool');
    tracer.end(span);

    expect(span.endedAt).toBeTruthy();
    expect(span.status).toBe('ok');
  });

  it('records error status and message on end with error', () => {
    const tracer = new RunTracer();
    const span = tracer.start('model', 'llm-call');
    tracer.end(span, new Error('provider timeout'));

    expect(span.status).toBe('error');
    expect(span.error).toBe('provider timeout');
  });

  it('records non-Error errors as string', () => {
    const tracer = new RunTracer();
    const span = tracer.start('adapter', 'fetch');
    tracer.end(span, 'something went wrong');

    expect(span.status).toBe('error');
    expect(span.error).toBe('something went wrong');
  });

  it('tracks parent-child relationship via parentSpanId', () => {
    const tracer = new RunTracer();
    const parent = tracer.start('agent', 'parent');
    const child = tracer.start('tool', 'child', undefined, parent.spanId);

    expect(child.parentSpanId).toBe(parent.spanId);
  });

  it('exports all spans', () => {
    const tracer = new RunTracer();
    tracer.start('agent', 'a');
    tracer.start('tool', 'b');

    const exported = tracer.export();
    expect(exported).toHaveLength(2);
    expect(exported.map((s) => s.name)).toEqual(['a', 'b']);
  });

  it('redacts secrets from attributes in export', () => {
    const tracer = new RunTracer();
    tracer.start('tool', 'call', { api_key: 'sk-abc123', model: 'gpt-4o' });

    const exported = tracer.export();
    const attrs = exported[0]?.attributes ?? {};

    expect(String(attrs.api_key ?? '')).not.toContain('sk-abc123');
    expect(attrs.model).toBe('gpt-4o');
  });

  it('produces a replay fixture with version 1', () => {
    const tracer = new RunTracer(undefined, 'run_fixed');
    tracer.start('agent', 'run');

    const fixture = tracer.replayFixture();
    expect(fixture.version).toBe(1);
    expect(fixture.runId).toBe('run_fixed');
    expect(fixture.spans).toHaveLength(1);
  });

  it('fires sink callbacks on start and end', () => {
    const onStart = vi.fn();
    const onEnd = vi.fn();
    const tracer = new RunTracer({ onSpanStart: onStart, onSpanEnd: onEnd });

    const span = tracer.start('retry', 'retry-op');
    expect(onStart).toHaveBeenCalledOnce();

    tracer.end(span);
    expect(onEnd).toHaveBeenCalledOnce();
  });

  it('does not throw when no sink is provided', () => {
    const tracer = new RunTracer();
    const span = tracer.start('guardrail', 'check');
    expect(() => tracer.end(span)).not.toThrow();
  });
});

describe('createOpenTelemetryTraceSink', () => {
  it('starts an OTel span on onSpanStart', () => {
    const startSpan = vi.fn(() => ({ end: vi.fn() }));
    const sink = createOpenTelemetryTraceSink({ startSpan });

    sink.onSpanStart?.({
      runId: 'r1', spanId: 's1', name: 'test', kind: 'tool',
      startedAt: new Date().toISOString(), status: 'ok',
    });

    expect(startSpan).toHaveBeenCalledWith('test', undefined);
  });

  it('passes attributes to OTel startSpan when present', () => {
    const startSpan = vi.fn(() => ({ end: vi.fn() }));
    const sink = createOpenTelemetryTraceSink({ startSpan });

    sink.onSpanStart?.({
      runId: 'r1', spanId: 's2', name: 'tool-call', kind: 'tool',
      startedAt: new Date().toISOString(), status: 'ok',
      attributes: { toolName: 'fetch' },
    });

    expect(startSpan).toHaveBeenCalledWith('tool-call', { attributes: { toolName: 'fetch' } });
  });

  it('calls end on the OTel span when onSpanEnd fires for ok span', () => {
    const mockEnd = vi.fn();
    const startSpan = vi.fn(() => ({ end: mockEnd }));
    const sink = createOpenTelemetryTraceSink({ startSpan });

    const span = {
      runId: 'r1', spanId: 's3', name: 'ok-span', kind: 'agent' as const,
      startedAt: new Date().toISOString(), status: 'ok' as const,
    };
    sink.onSpanStart?.(span);
    sink.onSpanEnd?.(span);

    expect(mockEnd).toHaveBeenCalledOnce();
  });

  it('records exception and sets error status on OTel span', () => {
    const mockEnd = vi.fn();
    const mockRecordException = vi.fn();
    const mockSetStatus = vi.fn();
    const startSpan = vi.fn(() => ({
      end: mockEnd,
      recordException: mockRecordException,
      setStatus: mockSetStatus,
    }));
    const sink = createOpenTelemetryTraceSink({ startSpan });

    const startedSpan = {
      runId: 'r1', spanId: 's4', name: 'err-span', kind: 'model' as const,
      startedAt: new Date().toISOString(), status: 'ok' as const,
    };
    const endedSpan = { ...startedSpan, status: 'error' as const, error: 'timeout' };

    sink.onSpanStart?.(startedSpan);
    sink.onSpanEnd?.(endedSpan);

    expect(mockRecordException).toHaveBeenCalledWith('timeout');
    expect(mockSetStatus).toHaveBeenCalledWith({ code: 2, message: 'timeout' });
    expect(mockEnd).toHaveBeenCalled();
  });

  it('does nothing on onSpanEnd when spanId is not tracked', () => {
    const startSpan = vi.fn(() => ({ end: vi.fn() }));
    const sink = createOpenTelemetryTraceSink({ startSpan });

    expect(() =>
      sink.onSpanEnd?.({
        runId: 'r1', spanId: 'unknown', name: 'ghost', kind: 'tool',
        startedAt: new Date().toISOString(), status: 'ok',
      }),
    ).not.toThrow();
  });
});
