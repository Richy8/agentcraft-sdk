import { UnsupportedOperationError } from '../../errors/index.js';
import { placeholderMetadata } from './adapter-runtime.js';
import { createAdapter, tool } from './types.js';
import type { AgentAdapter, ToolDefinition } from './types.js';

export type AdapterRequirement = AgentAdapter['requires'][number];

export function unsupportedTool(name: string, adapterName: string) {
  return tool({
    name,
    description: `${name.replace(/_/g, ' ')} via the ${adapterName} adapter.`,
    security: inferToolSecurity(name),
    params: {
      input: {
        type: 'object',
        description: 'Tool input payload. Concrete integration schemas are adapter-specific.',
        required: false,
      },
    },
    run: async () => {
      throw new UnsupportedOperationError(`adapter tool '${name}'`, adapterName);
    },
  });
}

export function inferToolSecurity(name: string): NonNullable<ToolDefinition['security']> {
  const destructive = /^(delete|remove|drop|truncate|destroy)_/.test(name);
  const mutating = /^(write|create|update|insert|move|send|clone|run|execute|schedule)_/.test(name);
  if (destructive || mutating) {
    return { sideEffect: 'write', requiresConfirmation: true };
  }
  if (/^(browse|scrape|crawl|search|fetch|get|list|read|extract)_/.test(name)) {
    return { sideEffect: 'read' };
  }
  return { sideEffect: 'external' };
}

export function createStaticAdapter(
  name: string,
  toolNames: string[],
  requires: AdapterRequirement[] = ['tools'],
  extras?: {
    metadata?: AgentAdapter['metadata'];
    init?: () => Promise<void>;
    cleanup?: () => Promise<void>;
  }
): AgentAdapter {
  return createAdapter({
    name,
    requires,
    metadata: extras?.metadata ?? placeholderMetadata([name]),
    tools: toolNames.map((toolName) => unsupportedTool(toolName, name)),
    ...(extras?.init !== undefined && { init: extras.init }),
    ...(extras?.cleanup !== undefined && { cleanup: extras.cleanup }),
  });
}
