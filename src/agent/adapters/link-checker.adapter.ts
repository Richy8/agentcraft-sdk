import { request } from 'node:https';
import { createAdapter, tool } from './types.js';
import type { AgentAdapter } from './types.js';

export interface LinkCheckerConfig {
  readonly timeoutMs?: number;
}

export class LinkCheckerAdapter {
  static readonly adapterName = 'link-checker';

  static connect(config: LinkCheckerConfig = {}): AgentAdapter {
    return createAdapter({
      name: LinkCheckerAdapter.adapterName,
      requires: ['tools'],
      metadata: {
        kind: 'custom',
        auth: 'none',
        sideEffects: ['read'],
        scopes: ['web.fetch', 'link.check'],
        readOnly: true,
      },
      tools: [
        tool({
          name: 'check_link',
          description: 'Check a URL status without mutating external systems.',
          security: { sideEffect: 'read' },
          params: {
            url: { type: 'string', description: 'URL to check.' },
          },
          run: async (args) => checkLink(args.url, config.timeoutMs ?? 5_000),
        }),
      ],
    });
  }
}

async function checkLink(url: string, timeoutMs: number): Promise<{ url: string; status: number | 'error'; ok: boolean; error?: string }> {
  if (!/^https:\/\//.test(url)) {
    return { url, status: 'error', ok: false, error: 'Only https URLs are supported by the default link checker' };
  }

  return await new Promise((resolve) => {
    const req = request(url, { method: 'HEAD', timeout: timeoutMs }, (res) => {
      resolve({ url, status: res.statusCode ?? 0, ok: Boolean(res.statusCode && res.statusCode < 400) });
      res.resume();
    });
    req.on('timeout', () => {
      req.destroy();
      resolve({ url, status: 'error', ok: false, error: 'timeout' });
    });
    req.on('error', (error) => resolve({ url, status: 'error', ok: false, error: error.message }));
    req.end();
  });
}
