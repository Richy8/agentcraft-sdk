import { createAdapter, tool } from './types.js';
import type { AgentAdapter } from './types.js';

export type SeoMetric<T> = { available: true; value: T } | { available: false; reason: string };

export interface SerpResult {
  readonly position: number;
  readonly url: string;
  readonly title: string;
  readonly snippet?: string;
}

export interface KeywordMetrics {
  readonly keyword: string;
  readonly volume: SeoMetric<number>;
  readonly difficulty: SeoMetric<number>;
  readonly cpc: SeoMetric<number>;
}

export interface SeoMockConfig {
  readonly serpResults?: SerpResult[];
  readonly keywordMetrics?: KeywordMetrics[];
}

export class SeoAdapter {
  static readonly adapterName = 'seo';

  static connect(config: SeoMockConfig = {}): AgentAdapter {
    return createAdapter({
      name: SeoAdapter.adapterName,
      requires: ['tools'],
      metadata: {
        kind: 'custom',
        auth: 'none',
        sideEffects: ['read'],
        scopes: ['seo.serp', 'seo.keywordMetrics'],
        readOnly: true,
      },
      tools: [
        tool({
          name: 'get_serp_results',
          description: 'Return provider-neutral SERP results.',
          security: { sideEffect: 'read' },
          params: {
            query: { type: 'string', description: 'Search query.' },
          },
          run: async () => config.serpResults ?? [],
        }),
        tool({
          name: 'get_keyword_metrics',
          description: 'Return keyword metrics without inventing unavailable values.',
          security: { sideEffect: 'read' },
          params: {
            keyword: { type: 'string', description: 'Keyword to inspect.' },
          },
          run: async (args) =>
            config.keywordMetrics?.find((item) => item.keyword === args.keyword) ?? {
              keyword: args.keyword,
              volume: { available: false, reason: 'No keyword provider configured' },
              difficulty: { available: false, reason: 'No keyword provider configured' },
              cpc: { available: false, reason: 'No keyword provider configured' },
            },
        }),
      ],
    });
  }
}
