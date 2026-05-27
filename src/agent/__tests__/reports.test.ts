import { describe, expect, it } from 'vitest';
import { AgentReports } from '../reports/index.js';
import { RunTracer } from '../observability.js';
import type { AgentResponse } from '../types.js';

function makeResponse(overrides: Partial<AgentResponse> = {}): AgentResponse {
  return {
    content: 'Hello, this is a test response about agent routing.',
    tokensUsed: { prompt: 200, completion: 80, total: 280 },
    cost: 0.003,
    finishReason: 'stop',
    model: 'gpt-4o',
    provider: 'openai',
    runId: 'run_test_abc',
    ...overrides,
  } as AgentResponse;
}

describe('AgentReports.fromResponse', () => {
  it('builds a report with expected fields', () => {
    const report = AgentReports.fromResponse(makeResponse());

    expect(report.kind).toBe('agent');
    expect(report.provider).toBe('openai');
    expect(report.model).toBe('gpt-4o');
    expect(report.cost).toBe(0.003);
    expect(report.generatedAt).toBeTruthy();
    expect(report.runId).toBe('run_test_abc');
  });

  it('preserves tokensUsed when sanitization is disabled', () => {
    const report = AgentReports.fromResponse(makeResponse(), { redact: false });
    expect(report.tokensUsed?.total).toBe(280);
    expect(report.tokensUsed?.prompt).toBe(200);
  });

  it('includes a content preview by default', () => {
    const report = AgentReports.fromResponse(makeResponse());
    expect(report.contentPreview).toBeTruthy();
  });

  it('includes full output when include.fullOutput is true', () => {
    const report = AgentReports.fromResponse(makeResponse(), { include: { fullOutput: true } });
    expect(report.content).toBe(makeResponse().content);
  });

  it('omits content when include.fullOutput is false', () => {
    const report = AgentReports.fromResponse(makeResponse(), { include: { fullOutput: false, outputPreview: false } });
    expect(report.content).toBeUndefined();
  });

  it('uses custom title when provided', () => {
    const report = AgentReports.fromResponse(makeResponse(), { title: 'My Run' });
    expect(report.title).toBe('My Run');
  });

  it('includes selection data when present', () => {
    const response = makeResponse({
      selection: {
        traitActivation: 'auto',
        toolSelection: 'auto',
        activeTraits: ['blog-writer'],
        exposedTools: ['web-search'],
      },
    });
    const report = AgentReports.fromResponse(response, { include: { toolCalls: true } });
    expect(report.selection?.activeTraits).toContain('blog-writer');
  });

  it('redacts secrets when redact option is true', () => {
    const response = makeResponse({
      content: 'Here is your api_key: sk-secret123',
    });
    const report = AgentReports.fromResponse(response, { redact: true, include: { fullOutput: true } });
    expect(report.content ?? '').not.toContain('sk-secret123');
  });
});

describe('AgentReports.fromTrace', () => {
  it('builds a trace report from RunTracer spans', () => {
    const tracer = new RunTracer(undefined, 'run_trace_test');
    const span1 = tracer.start('agent', 'agent-run');
    const span2 = tracer.start('tool', 'tool-call', undefined, span1.spanId);
    tracer.end(span2);
    tracer.end(span1);

    const report = AgentReports.fromTrace(tracer.export());

    expect(report.kind).toBe('trace');
    expect(report.traces?.length).toBe(2);
  });

  it('handles empty span array', () => {
    const report = AgentReports.fromTrace([]);
    expect(report.kind).toBe('trace');
    expect(report.traces?.length ?? 0).toBe(0);
  });
});

describe('AgentReports.traceCollector', () => {
  it('collects spans via onSpanStart and onSpanEnd', () => {
    const collector = AgentReports.traceCollector();

    const span = {
      runId: 'r1', spanId: 's1', name: 'agent-run', kind: 'agent' as const,
      startedAt: new Date().toISOString(), status: 'ok' as const,
    };
    collector.onSpanStart!(span);
    collector.onSpanEnd!({ ...span, endedAt: new Date().toISOString() });

    expect(collector.spans()).toHaveLength(1);
    expect(collector.spans()[0]?.endedAt).toBeTruthy();
  });

  it('replaces span on onSpanEnd by matching spanId', () => {
    const collector = AgentReports.traceCollector();
    const span = {
      runId: 'r1', spanId: 's2', name: 'tool', kind: 'tool' as const,
      startedAt: new Date().toISOString(), status: 'ok' as const,
    };
    collector.onSpanStart!(span);
    collector.onSpanEnd!({ ...span, status: 'error', error: 'timeout', endedAt: new Date().toISOString() });

    expect(collector.spans()[0]?.status).toBe('error');
  });

  it('produces a replay fixture with version 1', () => {
    const collector = AgentReports.traceCollector();
    const span = {
      runId: 'run_fixture', spanId: 's3', name: 'run', kind: 'agent' as const,
      startedAt: new Date().toISOString(), status: 'ok' as const,
    };
    collector.onSpanStart!(span);

    const fixture = collector.replayFixture();
    expect(fixture.version).toBe(1);
    expect(fixture.runId).toBe('run_fixture');
  });

  it('clears spans on clear()', () => {
    const collector = AgentReports.traceCollector();
    const span = {
      runId: 'r1', spanId: 's4', name: 'x', kind: 'tool' as const,
      startedAt: new Date().toISOString(), status: 'ok' as const,
    };
    collector.onSpanStart!(span);
    expect(collector.spans()).toHaveLength(1);

    collector.clear();
    expect(collector.spans()).toHaveLength(0);
  });
});

describe('AgentReports.eventCollector', () => {
  it('records events via record()', () => {
    const collector = AgentReports.eventCollector();
    collector.record('run:start', { runId: 'r1' });
    collector.record('run:end', { cost: 0.001 });

    expect(collector.events()).toHaveLength(2);
    expect(collector.events()[0]?.type).toBe('run:start');
  });

  it('clears events on clear()', () => {
    const collector = AgentReports.eventCollector();
    collector.record('event', {});
    collector.clear();
    expect(collector.events()).toHaveLength(0);
  });

  it('events include timestamp', () => {
    const collector = AgentReports.eventCollector();
    collector.record('test', { value: 1 });
    expect(collector.events()[0]?.at).toBeTruthy();
  });
});
