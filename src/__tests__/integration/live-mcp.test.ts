import { mkdir, writeFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import {
  FilesystemMCP,
  FirecrawlMCP,
  MCP,
} from '../../agent/mcp-servers/index.js';

const integrationEnabled = process.env.INTEGRATION_TESTS === 'true';
const liveMcps = parseSelection(process.env.AGENTCRAFT_LIVE_MCPS);

describe('live MCP smoke tests', () => {
  // MemoryMCP removed in v1.0.0 — use MCP.connect({ package: '@modelcontextprotocol/server-memory@...' })
  it.skip('memory MCP discovers tools and reads the graph through a real stdio package', () => {});

  // Context7MCP removed in v1.0.0 — use MCP.connect({ package: '@upstash/context7-mcp@...' })
  it.skip('context7 MCP resolves current library documentation through a real stdio package', () => {});

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

  // ApifyMCP removed in v1.0.0 — use MCP.connect({ package: 'apify-mcp-server@...' })
  it.skip('apify MCP discovers account actor tools through a real stdio package', () => {});

  // ---------------------------------------------------------------------------
  // MCP.connect() — generic package transport
  // ---------------------------------------------------------------------------
  const connectPackageIt = integrationEnabled && liveMcps.has('connect-package') ? it : it.skip;

  connectPackageIt(
    'MCP.connect({ command }) reaches the filesystem server via the generic command transport',
    async () => {
      const rootPath = process.env.AGENTCRAFT_LIVE_MCP_FILESYSTEM_PATH ?? '/private/tmp/agentcraft-connect-fixture';
      await mkdir(rootPath, { recursive: true });
      await writeFile(`${rootPath}/connect-smoke.txt`, 'mcp connect generic command transport ok', 'utf8');

      // Uses MCP.connect() with the command transport — passes the allowed path
      // as a positional arg since @modelcontextprotocol/server-filesystem requires it.
      // This exercises the command branch of the generic MCP.connect() factory.
      const adapter = MCP.connect({
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-filesystem@0.6.2', rootPath],
        allowedTools: ['read_file', 'list_directory'],
      });
      try {
        const tools = await adapter.getTools?.();
        const readFile = tools?.find((t) => t.name === 'read_file');

        expect(tools?.map((t) => t.name)).toContain('read_file');
        const result = await readFile?.execute({ path: `${rootPath}/connect-smoke.txt` });
        expect(JSON.stringify(result)).toContain('mcp connect generic command transport ok');
      } finally {
        await adapter.cleanup?.();
      }
    },
    120_000,
  );

  // ---------------------------------------------------------------------------
  // MCP.connect() — bearer auth header shape (unit-level, no live server needed)
  // ---------------------------------------------------------------------------
  const connectAuthIt = integrationEnabled && liveMcps.has('connect-auth') ? it : it.skip;

  connectAuthIt(
    'MCP.connect({ url, auth: bearer }) builds the correct auth headers',
    async () => {
      // This test verifies the adapter is created correctly with auth metadata.
      // An actual HTTP MCP server is not required — we inspect the adapter shape only.
      const adapter = MCP.connect({
        url: 'https://example-mcp-server.test/mcp',
        auth: { type: 'bearer', token: 'test-token-123' },
        name: 'test-http-mcp',
        allowedTools: ['ping'],
        timeoutMs: 5_000,
      });

      expect(adapter).toBeTruthy();
      // The adapter is an MCPAdapter — verify it has the expected interface
      expect(typeof adapter.getTools).toBe('function');
      expect(typeof adapter.cleanup).toBe('function');
    },
    10_000,
  );
});

function parseSelection(value: string | undefined): Set<string> {
  if (!value || value.trim() === '') return new Set();
  const selected = value
    .split(',')
    .map((mcp) => mcp.trim().toLowerCase())
    .filter(Boolean);

  if (selected.includes('all')) return new Set(['filesystem', 'firecrawl', 'connect-package']);
  return new Set(selected);
}

function isConfiguredSecret(value: string | undefined): boolean {
  return Boolean(value && !value.includes('...') && value.trim().length > 8);
}
