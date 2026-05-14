import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import { createAdapter, tool } from './types.js';
import type { AgentAdapter } from './types.js';

export interface CitationManagerConfig {
  readonly root?: string;
}

export interface CitationRecord {
  readonly id: string;
  readonly url?: string;
  readonly title?: string;
  readonly retrievedAt: string;
  readonly summary: string;
  readonly quality: 'primary' | 'strong' | 'mixed' | 'weak' | 'unknown';
}

export class CitationManagerAdapter {
  static readonly adapterName = 'citation-manager';

  static connect(config: CitationManagerConfig = {}): AgentAdapter {
    const root = path.resolve(config.root ?? 'content/artifacts/sources');
    const resolve = (id: string) => {
      if (!/^[a-zA-Z0-9_.-]+$/.test(id)) throw new Error(`Invalid citation id '${id}'`);
      const target = path.resolve(root, `${id}.json`);
      if (!target.startsWith(`${root}${path.sep}`)) throw new Error('Citation path escapes root');
      return target;
    };

    return createAdapter({
      name: CitationManagerAdapter.adapterName,
      requires: ['tools'],
      metadata: {
        kind: 'custom',
        auth: 'none',
        sideEffects: ['read', 'write'],
        scopes: ['source.save', 'source.mapClaim'],
        readOnly: false,
      },
      tools: [
        tool({
          name: 'save_citation',
          description: 'Save a source note with provenance metadata.',
          security: { sideEffect: 'write', requiresConfirmation: true },
          params: {
            id: { type: 'string', description: 'Stable citation id.' },
            url: { type: 'string', description: 'Source URL.', required: false },
            title: { type: 'string', description: 'Source title.', required: false },
            summary: { type: 'string', description: 'Short source summary.' },
            quality: {
              type: 'string',
              description: 'Source quality rating.',
              options: ['primary', 'strong', 'mixed', 'weak', 'unknown'],
              required: false,
            },
          },
          run: async (args) => {
            const record: CitationRecord = {
              id: args.id,
              ...(args.url !== undefined && { url: args.url }),
              ...(args.title !== undefined && { title: args.title }),
              retrievedAt: new Date().toISOString(),
              summary: args.summary,
              quality: (args.quality as CitationRecord['quality'] | undefined) ?? 'unknown',
            };
            await mkdir(root, { recursive: true });
            await writeFile(resolve(record.id), `${JSON.stringify(record, null, 2)}\n`, 'utf8');
            return record;
          },
        }),
        tool({
          name: 'read_citation',
          description: 'Read a saved source note by id.',
          security: { sideEffect: 'read' },
          params: {
            id: { type: 'string', description: 'Stable citation id.' },
          },
          run: async (args) => JSON.parse(await readFile(resolve(args.id), 'utf8')),
        }),
      ],
    });
  }
}
