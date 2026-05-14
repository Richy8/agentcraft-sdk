import { createAdapter, tool } from './types.js';
import type { AgentAdapter } from './types.js';
import type { FileSystemAnalyticsHistoryStore } from '../creator/analytics-history.js';

export interface AnalyticsMetric {
  readonly name: 'traffic' | 'ranking' | 'ctr' | 'retention' | 'engagement' | 'conversion';
  readonly value: number;
  readonly source: string;
  readonly dateRange: string;
}

export interface AnalyticsAdapterConfig {
  readonly metrics?: AnalyticsMetric[];
  readonly historyStore?: FileSystemAnalyticsHistoryStore;
}

export class AnalyticsAdapter {
  static readonly adapterName = 'analytics';

  static connect(config: AnalyticsAdapterConfig = {}): AgentAdapter {
    return createAdapter({
      name: AnalyticsAdapter.adapterName,
      requires: ['tools'],
      metadata: {
        kind: 'custom',
        auth: 'custom',
        sideEffects: ['read'],
        scopes: ['analytics.read'],
        readOnly: true,
      },
      tools: [
        tool({
          name: 'read_content_metrics',
          description: 'Read fixture or provider-backed content metrics.',
          security: { sideEffect: 'read' },
          params: {
            metric: {
              type: 'string',
              description: 'Metric name.',
              options: ['traffic', 'ranking', 'ctr', 'retention', 'engagement', 'conversion'],
              required: false,
            },
          },
          run: async (args) => {
            const history = await config.historyStore?.snapshot();
            const historicalMetrics: AnalyticsMetric[] = [];
            for (const report of history?.performanceReports ?? []) {
              const metrics = (report as { readonly metrics?: unknown }).metrics;
              if (!Array.isArray(metrics)) continue;
              for (const metric of metrics) {
                if (isAnalyticsMetricShape(metric)) {
                  historicalMetrics.push({ ...metric, dateRange: 'historical' });
                }
              }
            }
            return [...(config.metrics ?? []), ...historicalMetrics].filter(
              (metric) => !args.metric || metric.name === args.metric
            );
          },
        }),
      ],
    });
  }
}

function isAnalyticsMetricShape(value: unknown): value is Omit<AnalyticsMetric, 'dateRange'> {
  return (
    typeof value === 'object' &&
    value !== null &&
    ['traffic', 'ranking', 'ctr', 'retention', 'engagement', 'conversion'].includes(
      String((value as { readonly name?: unknown }).name)
    ) &&
    typeof (value as { readonly value?: unknown }).value === 'number' &&
    typeof (value as { readonly source?: unknown }).source === 'string'
  );
}
