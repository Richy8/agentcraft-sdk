import { createAdapter, tool } from './types.js';
import type { AgentAdapter } from './types.js';

export class PublishingAdapter {
  static readonly adapterName = 'publishing';

  static connect(): AgentAdapter {
    return createAdapter({
      name: PublishingAdapter.adapterName,
      requires: ['tools'],
      metadata: {
        kind: 'custom',
        auth: 'custom',
        sideEffects: ['write'],
        scopes: ['publish.draft', 'publish.publish'],
        readOnly: false,
      },
      tools: [
        tool({
          name: 'create_publish_draft',
          description: 'Create an external draft. Requires explicit confirmation.',
          security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['publish.draft'] },
          params: {
            title: { type: 'string', description: 'Draft title.' },
            body: { type: 'string', description: 'Draft body.' },
            platform: { type: 'string', description: 'Target platform.' },
          },
          run: async (args) => ({
            id: `draft-${Date.now()}`,
            status: 'draft',
            platform: args.platform,
            title: args.title,
          }),
        }),
        tool({
          name: 'publish_content',
          description: 'Publish an approved draft. Requires explicit confirmation.',
          security: { sideEffect: 'write', requiresConfirmation: true, scopes: ['publish.publish'] },
          params: {
            draftId: { type: 'string', description: 'Draft id.' },
          },
          run: async (args) => ({ id: args.draftId, status: 'published' }),
        }),
      ],
    });
  }
}
