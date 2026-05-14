import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AnalyticsAdapter } from '../../adapters/analytics.adapter.js';
import { createArtifactBase } from '../artifacts.js';
import { FileSystemAnalyticsHistoryStore } from '../analytics-history.js';

describe('analytics history store', () => {
  it('persists performance reports, experiment plans, and experiment outcomes', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'agentcraft-analytics-history-'));
    const store = new FileSystemAnalyticsHistoryStore(root);
    const performance = {
      ...createArtifactBase({
        id: 'performance-1',
        type: 'PerformanceReport',
        sourceSkill: 'performance-analysis',
      }),
      metrics: [{ name: 'traffic', value: 1200, source: 'fixture' }],
      recommendations: ['Double down on tutorial posts.'],
    };
    const experiment = {
      ...createArtifactBase({
        id: 'experiment-1',
        type: 'ExperimentPlan',
        sourceSkill: 'experiment-planner',
      }),
      hypothesis: 'Sharper titles improve CTR.',
      variants: ['How to cache agents', 'Stop wasting tokens'],
      metric: 'ctr',
      duration: '14 days',
      decisionRule: 'Ship variant if CTR improves by 10%.',
    };

    await store.savePerformanceReport(performance);
    await store.saveExperimentPlan(experiment);
    await store.saveExperimentResult({
      id: 'result-1',
      experimentPlanId: 'experiment-1',
      metric: 'ctr',
      baseline: 4,
      variant: 5,
      source: 'fixture',
      decision: 'ship',
    });

    await expect(store.snapshot()).resolves.toMatchObject({
      performanceReports: [{ id: 'performance-1' }],
      experimentPlans: [{ id: 'experiment-1' }],
      experimentResults: [{ id: 'result-1', decision: 'ship' }],
    });
    await expect(store.summarizeInsights()).resolves.toEqual(
      expect.arrayContaining(['Double down on tutorial posts.', 'ctr: ship (+1)'])
    );
    await rm(root, { recursive: true, force: true });
  });

  it('feeds persisted metrics through the analytics adapter', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'agentcraft-analytics-adapter-'));
    const store = new FileSystemAnalyticsHistoryStore(root);
    await store.savePerformanceReport({
      ...createArtifactBase({
        id: 'performance-1',
        type: 'PerformanceReport',
        sourceSkill: 'performance-analysis',
      }),
      metrics: [{ name: 'engagement', value: 42, source: 'fixture' }],
      recommendations: [],
    });

    const read = (await AnalyticsAdapter.connect({ historyStore: store }).getTools!()).find(
      (tool) => tool.name === 'read_content_metrics'
    )!;

    await expect(read.execute({ metric: 'engagement' })).resolves.toMatchObject([
      { name: 'engagement', value: 42, source: 'fixture', dateRange: 'historical' },
    ]);
    await rm(root, { recursive: true, force: true });
  });

  it('rejects traversal-shaped analytics ids', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'agentcraft-analytics-invalid-'));
    const store = new FileSystemAnalyticsHistoryStore(root);

    await expect(
      store.saveExperimentResult({
        id: '../bad',
        experimentPlanId: 'experiment-1',
        metric: 'ctr',
        baseline: 1,
        variant: 2,
        source: 'fixture',
        decision: 'iterate',
      })
    ).rejects.toThrow('Invalid analytics history id');
    await rm(root, { recursive: true, force: true });
  });
});
