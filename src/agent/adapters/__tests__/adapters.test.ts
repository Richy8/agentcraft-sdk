import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigurationError, ToolExecutionError } from '../../../errors/index.js';
import { MCPAdapter } from '../mcp.adapter.js';
import { createAdapter } from '../types.js';
import { defineAdapter, redactSecrets, runToolWithPolicy, tool } from '../index.js';
import { blockPromptInjectionGuardrail } from '../../guardrails.js';
import {
  DatabaseAdapter,
  FetchAdapter,
  ImageGenerationAdapter,
  TavilySearchAdapter,
} from '../index.js';

describe('adapter helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds tools with inferred required params and enum options', async () => {
    const search = tool('search', {
      description: 'Search things',
      params: {
        query: { type: 'string', description: 'Query' },
        mode: { type: 'string', description: 'Mode', required: false, options: ['fast', 'deep'] },
      },
      run: async ({ query }) => query.toUpperCase(),
    });

    expect(search.parameters.required).toEqual(['query']);
    expect(search.parameters.properties.mode?.enum).toEqual(['fast', 'deep']);
    await expect(search.execute({ query: 'books' })).resolves.toBe('BOOKS');
    await expect(search.execute({ query: 1 })).rejects.toThrow("argument 'query' must be string");
    await expect(search.execute({ query: 'books', mode: 'slow' })).rejects.toThrow(
      'must be one of'
    );
  });

  it('maps sideEffect and requiresConfirmation into tool security', () => {
    const t = tool('write_item', {
      description: 'Writes an item',
      params: {},
      sideEffect: 'write',
      requiresConfirmation: true,
      run: async () => 'ok',
    });
    expect(t.security).toMatchObject({ sideEffect: 'write', requiresConfirmation: true });
  });

  it('defineAdapter creates an adapter with named tools', async () => {
    const adapter = defineAdapter('my-api', {
      search: {
        description: 'Search the API',
        params: { query: { type: 'string', description: 'Search query' } },
        run: async ({ query }) => `result for ${query}`,
      },
      ping: {
        description: 'Ping the API',
        params: {},
        run: async () => 'pong',
      },
    });

    expect(adapter.name).toBe('my-api');
    expect(adapter.declaredToolNames).toEqual(['search', 'ping']);
    expect(adapter.metadata?.kind).toBe('custom');
    const tools = await adapter.getTools!();
    await expect(tools.find((t) => t.name === 'search')!.execute({ query: 'agents' })).resolves.toBe('result for agents');
    await expect(tools.find((t) => t.name === 'ping')!.execute({})).resolves.toBe('pong');
  });

  it('defineAdapter accepts auth and scopes options', () => {
    const adapter = defineAdapter(
      'secure-api',
      { noop: { description: 'noop', params: {}, run: async () => null } },
      { auth: 'custom', scopes: ['read:data'] }
    );
    expect(adapter.metadata?.auth).toBe('custom');
    expect(adapter.metadata?.scopes).toEqual(['read:data']);
  });

  it('auto-populates declared tool names from createAdapter tools', () => {
    const adapter = createAdapter({
      name: 'custom',
      tools: [
        tool('custom_tool', {
          description: 'Custom tool',
          params: {},
          run: async () => 'ok',
        }),
      ],
    });

    expect(adapter.declaredToolNames).toEqual(['custom_tool']);
  });

  it('validates MCP configs before starting transports', () => {
    expect(() =>
      MCPAdapter.connect({
        transport: 'stdio',
        command: 'curl',
        allowedCommands: ['node'],
      })
    ).toThrow(ConfigurationError);

    expect(() =>
      MCPAdapter.connect({
        transport: 'stdio',
        command: 'npx',
        args: ['-y', '@acme/internal-mcp'],
        rejectUnpinnedPackage: true,
      })
    ).toThrow(ConfigurationError);

    expect(() =>
      MCPAdapter.connect({
        transport: 'http',
        url: 'ftp://mcp.example.test',
      })
    ).toThrow(ConfigurationError);

    expect(() =>
      MCPAdapter.connect({
        transport: 'http',
        url: 'https://mcp.example.test',
        roots: ['../secrets'],
      })
    ).toThrow(ConfigurationError);
  });

  it('creates built-in adapter tool catalogs', () => {
    expect(TavilySearchAdapter.connect({ apiKey: 'key' }).declaredToolNames).toEqual([
      'web_search',
      'get_page_content',
    ]);
  });

  it('exposes adapter maturity metadata and declared tools for every built-in adapter', () => {
    const adapters = [
      DatabaseAdapter.connect({ connectionString: 'postgres://localhost/db' }),
      FetchAdapter.connect({ allowedDomains: ['example.test'] }),
      ImageGenerationAdapter.connect({ provider: 'openai', apiKey: 'key' }),
      TavilySearchAdapter.connect({ apiKey: 'key' }),
    ];

    for (const adapter of adapters) {
      expect(adapter.declaredToolNames?.length).toBeGreaterThan(0);
      expect(adapter.metadata?.kind).toBeTruthy();
      expect(adapter.metadata?.sideEffects?.length).toBeGreaterThan(0);
      expect(adapter.metadata?.scopes?.length).toBeGreaterThan(0);
    }
  });

  it('fetches URLs with allowlists, size controls, and untrusted-content wrapping', async () => {
    const events: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/plain', 'content-length': '11' }),
        text: async () => 'hello world',
      }))
    );

    const adapter = FetchAdapter.connect({
      allowedDomains: ['example.test'],
      maxResponseBytes: 100,
      onAuditEvent: (event) => events.push(event.type),
    });
    const tools = await adapter.getTools?.();
    const fetchUrl = tools?.find((item) => item.name === 'fetch_url');

    await expect(
      fetchUrl?.execute({ url: 'https://docs.example.test/page' })
    ).resolves.toMatchObject({
      status: 200,
      contentType: 'text/plain',
      content: expect.stringContaining('<untrusted_content source="fetch_url">'),
    });
    await expect(fetchUrl?.execute({ url: 'http://example.test/page' })).rejects.toThrow(
      ToolExecutionError
    );
    await expect(fetchUrl?.execute({ url: 'https://evil.test/page' })).rejects.toThrow(
      ToolExecutionError
    );
    expect(events).toContain('adapter_tool_success');
    expect(adapter.metadata).toMatchObject({ kind: 'native-sdk', readOnly: true });
  });

  it('rejects fetch responses with disallowed content type or excessive size', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/octet-stream', 'content-length': '2' }),
        text: async () => 'ok',
      }))
    );
    const adapter = FetchAdapter.connect({ allowedDomains: ['example.test'], maxResponseBytes: 5 });
    const fetchUrl = (await adapter.getTools?.())?.find((item) => item.name === 'fetch_url');
    await expect(fetchUrl?.execute({ url: 'https://example.test/file' })).rejects.toThrow(
      ToolExecutionError
    );

    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'text/plain', 'content-length': '10' }),
        text: async () => 'too large',
      }))
    );
    await expect(fetchUrl?.execute({ url: 'https://example.test/file' })).rejects.toThrow(
      ToolExecutionError
    );
  });

  it('executes database tools through an injected query executor with read-only safety', async () => {
    const queries: Array<{ query: string; params: unknown[] }> = [];
    const adapter = DatabaseAdapter.connect({
      connectionString: 'postgres://localhost/db',
      query: async (query, params) => {
        queries.push({ query, params });
        return { rows: [{ id: 1 }], rowCount: 1 };
      },
      rowLimit: 5,
    });
    const tools = await adapter.getTools?.();
    const executeQuery = tools?.find((item) => item.name === 'execute_query');
    const insertRecord = tools?.find((item) => item.name === 'insert_record');
    const listTables = tools?.find((item) => item.name === 'list_tables');

    await expect(
      executeQuery?.execute({ query: 'SELECT * FROM books', params: [] })
    ).resolves.toMatchObject({
      rows: [{ id: 1 }],
    });
    await expect(
      insertRecord?.execute({ table: 'books', record: { title: 'Nope' } })
    ).rejects.toThrow(ToolExecutionError);
    await expect(listTables?.execute({})).resolves.toMatchObject({ rows: [{ id: 1 }] });
    expect(queries[0]?.query).toBe('SELECT * FROM books LIMIT 5');
    expect(insertRecord?.security).toMatchObject({
      sideEffect: 'write',
      requiresConfirmation: true,
    });
  });

  it('allows database writes only when read-only mode is disabled', async () => {
    const queries: Array<{ query: string; params: unknown[] }> = [];
    const adapter = DatabaseAdapter.connect({
      connectionString: 'postgres://localhost/db',
      readOnly: false,
      query: async (query, params) => {
        queries.push({ query, params });
        return { rows: [{ id: 1 }], rowCount: 1 };
      },
    });
    const insertRecord = (await adapter.getTools?.())?.find(
      (item) => item.name === 'insert_record'
    );

    await expect(
      insertRecord?.execute({ table: 'books', record: { title: 'AgentCraft' } })
    ).resolves.toMatchObject({
      rows: [{ id: 1 }],
    });
    expect(queries[0]).toMatchObject({
      query: 'INSERT INTO "books" ("title") VALUES ($1) RETURNING *',
      params: ['AgentCraft'],
    });
  });

  it('executes remaining built-in service adapters through mocked APIs', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => ({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ ok: true, url, method: init?.method }),
        text: async () => JSON.stringify({ ok: true }),
      }))
    );

    const adapters = [
      {
        adapter: TavilySearchAdapter.connect({ apiKey: 'key', apiBaseUrl: 'https://tavily.test' }),
        tool: 'web_search',
        args: { query: 'agentcraft' },
      },
      {
        adapter: ImageGenerationAdapter.connect({
          provider: 'openai',
          apiKey: 'key',
          apiBaseUrl: 'https://images.test',
        }),
        tool: 'generate_image',
        args: { prompt: 'a diagram' },
      },
    ];

    for (const { adapter, tool: toolName, args } of adapters) {
      const selectedTool = (await adapter.getTools?.())?.find((item) => item.name === toolName);
      await expect(selectedTool?.execute(args)).resolves.toBeDefined();
      expect(adapter.metadata?.kind).toBe('native-sdk');
    }
  });

  it('leaves MCP tool discovery dynamic for deferred conflict checks', () => {
    const adapter = MCPAdapter.connect({
      transport: 'stdio',
      command: 'npx',
      args: ['-y', 'example'],
      onSecurityWarning: () => undefined,
    });
    expect(adapter.declaredToolNames).toBeUndefined();
    expect(adapter.getTools).toBeDefined();
  });

  it('discovers and executes tools through HTTP MCP JSON-RPC', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        const message = JSON.parse(String(init?.body)) as {
          id: number;
          method: string;
          params?: Record<string, unknown>;
        };
        const result =
          message.method === 'tools/list'
            ? {
                tools: [
                  {
                    name: 'lookup',
                    description: 'Lookup a thing',
                    inputSchema: {
                      type: 'object',
                      properties: { query: { type: 'string', description: 'Query' } },
                      required: ['query'],
                    },
                  },
                  { name: 'blocked', description: 'Blocked tool', inputSchema: { type: 'object' } },
                ],
              }
            : message.method === 'tools/call'
              ? { structuredContent: { ok: true, args: message.params?.arguments } }
              : message.method === 'resources/list'
                ? { resources: [{ uri: 'file:///a.md', name: 'A' }] }
                : message.method === 'prompts/list'
                  ? { prompts: [{ name: 'review', description: 'Review prompt' }] }
                  : {};
        return {
          ok: true,
          json: async () => ({ jsonrpc: '2.0', id: message.id, result }),
        } as Response;
      })
    );

    const adapter = MCPAdapter.connect({
      transport: 'http',
      url: 'https://mcp.example.test',
      allowedTools: ['lookup'],
      allowedResources: ['file:///a.md'],
      roots: ['/tmp/workspace'],
      metadata: { sideEffects: ['read'], trustLevel: 'trusted' },
    });

    const tools = await adapter.getTools?.();
    expect(tools?.map((item) => item.name)).toEqual(['lookup']);
    await expect(tools![0]!.execute({ query: 'books' })).resolves.toEqual({
      ok: true,
      args: { query: 'books' },
    });
    const details = await (adapter as unknown as { describeMcp(): Promise<unknown> }).describeMcp();
    expect(details).toMatchObject({
      resources: [{ uri: 'file:///a.md', name: 'A' }],
      prompts: [{ name: 'review', description: 'Review prompt' }],
      roots: ['/tmp/workspace'],
    });
    await adapter.cleanup?.();
  });

  it('cleans up MCP state and rediscovers tools on the next access', async () => {
    let listCalls = 0;
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        const message = JSON.parse(String(init?.body)) as { id: number; method: string };
        if (message.method === 'tools/list') listCalls++;
        return {
          ok: true,
          json: async () => ({
            jsonrpc: '2.0',
            id: message.id,
            result: message.method === 'tools/list' ? { tools: [] } : {},
          }),
        } as Response;
      })
    );

    const adapter = MCPAdapter.connect({ transport: 'http', url: 'https://mcp.example.test' });
    await adapter.getTools?.();
    await adapter.cleanup?.();
    await adapter.getTools?.();

    expect(listCalls).toBe(2);
  });

  it('marks external MCP tools as confirmation-required by default', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url: string, init?: RequestInit) => {
        const message = JSON.parse(String(init?.body)) as { id: number; method: string };
        return {
          ok: true,
          json: async () => ({
            jsonrpc: '2.0',
            id: message.id,
            result:
              message.method === 'tools/list'
                ? { tools: [{ name: 'external_lookup', inputSchema: { type: 'object' } }] }
                : {},
          }),
        } as Response;
      })
    );

    const external = MCPAdapter.connect({ transport: 'http', url: 'https://mcp.example.test' });
    const readOnly = MCPAdapter.connect({
      transport: 'http',
      url: 'https://mcp.example.test',
      metadata: { sideEffects: ['read'] },
    });

    await expect(external.getTools?.()).resolves.toEqual([
      expect.objectContaining({
        security: expect.objectContaining({
          sideEffect: 'external',
          requiresConfirmation: true,
        }),
      }),
    ]);
    await expect(readOnly.getTools?.()).resolves.toEqual([
      expect.objectContaining({
        security: expect.objectContaining({
          sideEffect: 'read',
          requiresConfirmation: false,
        }),
      }),
    ]);
  });

  it('rejects unallowlisted stdio MCP commands', () => {
    expect(() =>
      MCPAdapter.connect({
        transport: 'stdio',
        command: 'python',
        args: ['server.py'],
        allowedCommands: ['node'],
      })
    ).toThrow(ConfigurationError);
  });

  it('warns or rejects unsafe MCP stdio package configuration', () => {
    const warnings: string[] = [];
    const adapter = MCPAdapter.connect({
      transport: 'stdio',
      command: 'npx',
      args: ['-y', 'unpinned-mcp-server'],
      onSecurityWarning: (message) => warnings.push(message),
    });

    expect(adapter.metadata).toMatchObject({ kind: 'mcp-backed' });
    expect(warnings[0]).toContain('not version-pinned');
    expect(() =>
      MCPAdapter.connect({
        transport: 'stdio',
        command: 'npx',
        args: ['-y', 'unpinned-mcp-server'],
        rejectUnpinnedPackage: true,
      })
    ).toThrow(ConfigurationError);
    expect(() =>
      MCPAdapter.connect({
        transport: 'stdio',
        command: 'npx',
        args: ['-y', 'unpinned-mcp-server'],
        roots: ['../unsafe'],
      })
    ).toThrow(ConfigurationError);
  });

  it('times out MCP HTTP requests and emits sanitized trace events', async () => {
    const events: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Promise<Response>(() => undefined))
    );

    const adapter = MCPAdapter.connect({
      transport: 'http',
      url: 'https://mcp.example.test',
      timeoutMs: 1,
      onTrace: (event) => events.push(event.type),
    });

    await expect(adapter.getTools?.()).rejects.toThrow("MCP request 'initialize' timed out");
    expect(events).toEqual(['mcp_start', 'mcp_request', 'mcp_error']);
  });

  it('cancels MCP requests with an AbortSignal', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);

    const adapter = MCPAdapter.connect({
      transport: 'http',
      url: 'https://mcp.example.test',
      signal: controller.signal,
    });

    await expect(adapter.getTools?.()).rejects.toThrow("MCP request 'initialize' was cancelled");
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('discovers tools through an SSE MCP session', async () => {
    const encoder = new TextEncoder();
    let sseController: ReadableStreamDefaultController<Uint8Array> | undefined;
    const fetchSpy = vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === 'GET') {
        return {
          ok: true,
          body: new ReadableStream<Uint8Array>({
            start(controller) {
              sseController = controller;
              controller.enqueue(encoder.encode('event: endpoint\ndata: /message\n\n'));
            },
          }),
        } as Response;
      }

      const message = JSON.parse(String(init?.body)) as { id: number; method: string };
      const result =
        message.method === 'tools/list'
          ? {
              tools: [
                {
                  name: 'lookup',
                  description: 'Lookup over SSE',
                  inputSchema: {
                    type: 'object',
                    properties: { query: { type: 'string' } },
                    required: ['query'],
                  },
                },
              ],
            }
          : {};
      setTimeout(() => {
        sseController?.enqueue(
          encoder.encode(
            `event: message\ndata: ${JSON.stringify({ jsonrpc: '2.0', id: message.id, result })}\n\n`
          )
        );
      }, 0);
      return { ok: true } as Response;
    });
    vi.stubGlobal('fetch', fetchSpy);

    const adapter = MCPAdapter.connect({
      transport: 'sse',
      url: 'https://mcp.example.test/sse',
      allowedTools: ['lookup'],
    });

    const tools = await adapter.getTools?.();
    expect(tools?.map((item) => item.name)).toEqual(['lookup']);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://mcp.example.test/message',
      expect.objectContaining({ method: 'POST' })
    );
    await adapter.cleanup?.();
  });

  it('enforces tool policy timeout, redaction, and output guardrails', async () => {
    const sensitiveTool = tool('secret_lookup', {
      description: 'Returns a secret',
      sideEffect: 'read',
      params: {},
      run: async () => ({ token: 'abc', text: 'Bearer sk-secret123456' }),
    });

    await expect(
      runToolWithPolicy(
        sensitiveTool,
        {},
        { outputGuardrails: [() => ({ allowed: false, reason: 'nope' })] }
      )
    ).rejects.toThrow(ToolExecutionError);

    await expect(runToolWithPolicy(sensitiveTool, {}, { maxResultBytes: 5 })).rejects.toThrow(
      ToolExecutionError
    );
    await expect(runToolWithPolicy(sensitiveTool, {}, { timeoutMs: 1 })).resolves.toEqual({
      token: '[REDACTED]',
      text: 'Bearer [REDACTED][REDACTED]',
    });
    expect(redactSecrets({ apiKey: 'secret', nested: { value: 'token=abc' } })).toEqual({
      apiKey: '[REDACTED]',
      nested: { value: 'token=[REDACTED]' },
    });
  });

  it('supports dry-run, read-only, retries, audit events, and warning guardrail mode', async () => {
    const events: string[] = [];
    let attempts = 0;
    const mutatingTool = tool('update_item', {
      description: 'Updates item',
      sideEffect: 'write',
      requiresConfirmation: true,
      params: {},
      run: async () => {
        attempts++;
        if (attempts === 1) throw new Error('temporary');
        return 'updated';
      },
    });

    await expect(
      runToolWithPolicy(mutatingTool, {}, { readOnly: true, approvedTools: ['update_item'] })
    ).rejects.toThrow(ToolExecutionError);
    await expect(
      runToolWithPolicy(mutatingTool, {}, { dryRun: true, approvedTools: ['update_item'] })
    ).resolves.toMatchObject({
      dryRun: true,
      toolName: 'update_item',
    });
    await expect(
      runToolWithPolicy(
        mutatingTool,
        {},
        {
          approvedTools: ['update_item'],
          retry: { attempts: 2 },
          guardrailMode: 'warn',
          inputGuardrails: [blockPromptInjectionGuardrail],
          onAuditEvent: (event) => events.push(event.type),
        }
      )
    ).resolves.toBe('updated');
    expect(events).toContain('tool_start');
    expect(events).toContain('tool_success');
  });
});
