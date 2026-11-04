import type { AgentAdapter } from '../adapters/types.js';

const nativeCapabilities: Record<string, string[]> = {
  fetch: ['web.fetch'],
  tavily: ['web.search'],
  database: ['db.query', 'db.write'],
  'image-generation': ['image.generate'],
};

const mcpCapabilities: Record<string, string[]> = {
  'fetch-mcp': ['web.fetch'],
  'firecrawl-mcp': ['web.scrape'],
  'filesystem-mcp': ['filesystem.read', 'filesystem.write'],
  'memory-mcp': ['brand.memory', 'content.memory'],
  'context7-mcp': ['web.search'],
};

export function capabilitiesForAdapter(adapter: AgentAdapter): string[] {
  return [
    ...(nativeCapabilities[adapter.name] ?? []),
    ...(mcpCapabilities[adapter.name] ?? []),
    ...(adapter.metadata?.scopes ?? []),
  ];
}

export function capabilitiesForAdapters(adapters: readonly AgentAdapter[]): Set<string> {
  return new Set(adapters.flatMap((adapter) => capabilitiesForAdapter(adapter)));
}
