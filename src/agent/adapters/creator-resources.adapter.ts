import { createAdapter, tool } from './types.js';
import type { AgentAdapter } from './types.js';
import type { CreatorMemoryStore } from '../creator/memory.js';

export interface CreatorResourcesConfig {
  readonly brandVoice?: Record<string, unknown>;
  readonly corpus?: Array<{ id: string; text: string; tags?: string[] }>;
  readonly assets?: Array<{ id: string; type: string; description: string }>;
  readonly memoryStore?: CreatorMemoryStore;
}

export class CreatorResourcesAdapter {
  static readonly adapterName = 'creator-resources';

  static connect(config: CreatorResourcesConfig = {}): AgentAdapter {
    return createAdapter({
      name: CreatorResourcesAdapter.adapterName,
      requires: ['tools'],
      metadata: {
        kind: 'custom',
        auth: 'none',
        sideEffects: ['read'],
        scopes: ['brand.memory', 'content.corpus', 'asset.library'],
        readOnly: true,
      },
      tools: [
        tool({
          name: 'read_brand_voice',
          description: 'Read the configured brand voice profile.',
          security: { sideEffect: 'read' },
          params: {},
          run: async () => (await config.memoryStore?.readBrandVoice()) ?? config.brandVoice ?? {},
        }),
        tool({
          name: 'search_content_corpus',
          description: 'Search the configured prior-work corpus.',
          security: { sideEffect: 'read' },
          params: {
            query: { type: 'string', description: 'Search query.' },
          },
          run: async (args) => {
            const persisted = await config.memoryStore?.searchCorpus(args.query);
            if (persisted && persisted.length > 0) return persisted;
            return (config.corpus ?? []).filter((item) =>
              item.text.toLowerCase().includes(args.query.toLowerCase())
            );
          },
        }),
        tool({
          name: 'list_creator_assets',
          description: 'List configured creator assets.',
          security: { sideEffect: 'read' },
          params: {
            type: { type: 'string', description: 'Optional asset type.', required: false },
          },
          run: async (args) =>
            (config.assets ?? []).filter((item) => !args.type || item.type === args.type),
        }),
      ],
    });
  }
}
