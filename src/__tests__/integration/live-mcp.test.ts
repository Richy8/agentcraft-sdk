import { mkdir, writeFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  ApifyMCP,
  Context7MCP,
  FilesystemMCP,
  FirecrawlMCP,
  MemoryMCP,
} from '../../agent/mcp-servers/index.js';

const integrationEnabled = process.env.INTEGRATION_TESTS === 'true';
const liveMcps = parseSelection(process.env.AGENTCRAFT_LIVE_MCPS);

describe('live MCP smoke tests', () => {
  const memoryIt = integrationEnabled && liveMcps.has('memory') ? it : it.skip;

  memoryIt(
    'memory MCP discovers tools and reads the graph through a real stdio package',
    async () => {
      const adapter = MemoryMCP.connect({ filePath: '/private/tmp/agentcraft-live-memory-mcp.json' });
      try {
        const tools = await adapter.getTools?.();
        const readGraph = tools?.find((tool) => tool.name === 'read_graph');

        expect(tools?.map((tool) => tool.name)).toContain('read_graph');
        const result = await readGraph?.execute({});
        expect(JSON.stringify(result)).toContain('entities');
      } finally {
        await adapter.cleanup?.();
      }
    },
    90_000
  );

  const context7It = integrationEnabled && liveMcps.has('context7') ? it : it.skip;

  context7It(
    'context7 MCP resolves current library documentation through a real stdio package',
    async () => {
      const adapter = Context7MCP.connect();
      try {
        const tools = await adapter.getTools?.();
        const resolveLibrary = tools?.find((tool) => tool.name === 'resolve-library-id');

        expect(tools?.map((tool) => tool.name)).toContain('resolve-library-id');
        const result = await resolveLibrary?.execute({ query: 'vitepress', libraryName: 'vitepress' });
        expect(JSON.stringify(result).toLowerCase()).toContain('vitepress');
      } finally {
        await adapter.cleanup?.();
      }
    },
    90_000
  );

  const filesystemIt = integrationEnabled && liveMcps.has('filesystem') ? it : it.skip;

  filesystemIt(
    'filesystem MCP reads a file from an allowed local root through a real stdio package',
    async () => {
      const rootPath = process.env.AGENTCRAFT_LIVE_MCP_FILESYSTEM_PATH ?? '/private/tmp/agentcraft-live-fixture';
      await mkdir(rootPath, { recursive: true });
      await writeFile(`${rootPath}/mcp-smoke.txt`, 'agentcraft filesystem mcp smoke', 'utf8');

      const adapter = FilesystemMCP.connect({ allowedPaths: [rootPath] });
      try {
        const tools = await adapter.getTools?.();
        const readFile = tools?.find((tool) => tool.name === 'read_file');

        expect(tools?.map((tool) => tool.name)).toContain('read_file');
        const result = await readFile?.execute({ path: `${rootPath}/mcp-smoke.txt` });
        expect(JSON.stringify(result)).toContain('agentcraft filesystem mcp smoke');
        await expect(readFile?.execute({ path: '/etc/passwd' })).rejects.toThrow();
      } finally {
        await adapter.cleanup?.();
      }
    },
    90_000
  );

  const firecrawlIt =
    integrationEnabled &&
    liveMcps.has('firecrawl') &&
    isConfiguredSecret(process.env.FIRECRAWL_API_KEY)
      ? it
      : it.skip;

  firecrawlIt(
    'firecrawl MCP scrapes a real public URL through a real stdio package',
    async () => {
      const url = process.env.AGENTCRAFT_LIVE_FIRECRAWL_URL ?? process.env.AGENTCRAFT_LIVE_PUBLIC_URL ?? 'https://vitepress.dev/';
      const adapter = FirecrawlMCP.connect({ apiKey: process.env.FIRECRAWL_API_KEY! });
      try {
        const tools = await adapter.getTools?.();
        const scrape = tools?.find((tool) => tool.name === 'firecrawl_scrape');

        expect(tools?.map((tool) => tool.name)).toContain('firecrawl_scrape');
        const result = await scrape?.execute({ url, formats: ['markdown'], onlyMainContent: true });
        expect(JSON.stringify(result).toLowerCase()).toContain(new URL(url).hostname.split('.')[0]);
      } finally {
        await adapter.cleanup?.();
      }
    },
    120_000
  );

  const apifyIt =
    integrationEnabled &&
    liveMcps.has('apify') &&
    isConfiguredSecret(process.env.APIFY_TOKEN) &&
    process.env.AGENTCRAFT_LIVE_APIFY_DATASET_ID
      ? it
      : it.skip;

  apifyIt(
    'apify MCP discovers account actor tools through a real stdio package',
    async () => {
      const adapter = ApifyMCP.connect({ token: process.env.APIFY_TOKEN! });
      try {
        const tools = await adapter.getTools?.();

        expect(tools?.length).toBeGreaterThan(0);
        expect(tools?.every((tool) => typeof tool.name === 'string' && tool.name.length > 0)).toBe(true);
      } finally {
        await adapter.cleanup?.();
      }
    },
    120_000
  );
});

function parseSelection(value: string | undefined): Set<string> {
  if (!value || value.trim() === '') return new Set();
  const selected = value
    .split(',')
    .map((mcp) => mcp.trim().toLowerCase())
    .filter(Boolean);

  if (selected.includes('all')) return new Set(['memory', 'context7', 'filesystem', 'firecrawl', 'apify']);
  return new Set(selected);
}

function isConfiguredSecret(value: string | undefined): boolean {
  return Boolean(value && !value.includes('...') && value.trim().length > 8);
}
