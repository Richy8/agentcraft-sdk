import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ConfigurationError, ToolExecutionError } from '../../../errors/index.js';
import { MCPAdapter, createAdapter, redactSecrets, runToolWithPolicy, tool } from '../index.js';
import { blockPromptInjectionGuardrail } from '../../guardrails.js';
import {
  ApifyAdapter,
  DatabaseAdapter,
  EmailAdapter,
  ElevenLabsAdapter,
  FetchAdapter,
  FileSystemAdapter,
  FirecrawlAdapter,
  GitHubAdapter,
  GoogleCalendarAdapter,
  GoogleSheetsAdapter,
  ImageGenerationAdapter,
  NotionAdapter,
  PineconeAdapter,
  PlaywrightAdapter,
  RedisAdapter,
  SlackAdapter,
  StorageAdapter,
  SupabaseAdapter,
  TavilySearchAdapter,
} from '../index.js';

describe('adapter helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds tools with inferred required params and enum options', async () => {
    const search = tool({
      name: 'search',
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

  it('auto-populates declared tool names from createAdapter tools', () => {
    const adapter = createAdapter({
      name: 'custom',
      tools: [
        tool({
          name: 'custom_tool',
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

  it('creates built-in adapter tool catalogs', async () => {
    expect(TavilySearchAdapter.connect({ apiKey: 'key' }).declaredToolNames).toEqual([
      'web_search',
      'get_page_content',
    ]);
    expect(GitHubAdapter.connect({ token: 'token' }).declaredToolNames).toContain('commit_file');
    expect(
      StorageAdapter.connect({ provider: 's3', bucket: 'b', region: 'us-east-1' }).declaredToolNames
    ).toContain('get_signed_url');
    const storageTools = await StorageAdapter.connect({
      provider: 's3',
      bucket: 'b',
      region: 'us-east-1',
    }).getTools?.();
    expect(storageTools?.find((item) => item.name === 'delete_file')?.security).toMatchObject({
      sideEffect: 'write',
      requiresConfirmation: true,
    });
  });

  it('exposes adapter maturity metadata and declared tools for every built-in adapter', () => {
    const adapters = [
      ApifyAdapter.connect({ token: 'key' }),
      DatabaseAdapter.connect({ connectionString: 'postgres://localhost/db' }),
      EmailAdapter.connect({ provider: 'sendgrid', apiKey: 'key', from: 'from@example.test' }),
      ElevenLabsAdapter.connect({ apiKey: 'key' }),
      FetchAdapter.connect({ allowedDomains: ['example.test'] }),
      FileSystemAdapter.connect({ rootPath: os.tmpdir() }),
      FirecrawlAdapter.connect({ apiKey: 'key' }),
      GitHubAdapter.connect({ token: 'token' }),
      GoogleCalendarAdapter.connect({
        credentials: { clientEmail: 'me@example.test', privateKey: 'key' },
      }),
      GoogleSheetsAdapter.connect({
        credentials: { clientEmail: 'me@example.test', privateKey: 'key' },
      }),
      ImageGenerationAdapter.connect({ provider: 'openai', apiKey: 'key' }),
      NotionAdapter.connect({ token: 'token' }),
      PineconeAdapter.connect({ apiKey: 'key', indexName: 'idx' }),
      PlaywrightAdapter.connect(),
      RedisAdapter.connect({ url: 'redis://localhost:6379' }),
      SlackAdapter.connect({ botToken: 'token' }),
      StorageAdapter.connect({ provider: 's3', bucket: 'b', region: 'us-east-1' }),
      SupabaseAdapter.connect({ url: 'https://example.supabase.co', key: 'key' }),
      TavilySearchAdapter.connect({ apiKey: 'key' }),
    ];

    for (const adapter of adapters) {
      expect(adapter.declaredToolNames?.length).toBeGreaterThan(0);
      expect(adapter.metadata?.kind).toBeTruthy();
      expect(adapter.metadata?.sideEffects?.length).toBeGreaterThan(0);
      expect(adapter.metadata?.scopes?.length).toBeGreaterThan(0);
    }
  });

  it('executes filesystem tools inside a sandbox', async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), 'agentcraft-fs-'));
    try {
      await writeFile(path.join(rootPath, 'notes.txt'), 'hello', 'utf8');
      const events: string[] = [];
      const adapter = FileSystemAdapter.connect({
        rootPath,
        allowedExtensions: ['.txt'],
        onAuditEvent: (event) => events.push(event.type),
      });
      const tools = await adapter.getTools?.();
      const readFileTool = tools?.find((item) => item.name === 'read_file');
      const writeFileTool = tools?.find((item) => item.name === 'write_file');
      const listDirectoryTool = tools?.find((item) => item.name === 'list_directory');
      const searchFilesTool = tools?.find((item) => item.name === 'search_files');

      expect(writeFileTool?.security).toMatchObject({
        sideEffect: 'write',
        requiresConfirmation: true,
      });
      await expect(readFileTool?.execute({ path: 'notes.txt' })).resolves.toBe('hello');
      await expect(
        writeFileTool?.execute({ path: 'draft.txt', content: 'draft' })
      ).resolves.toMatchObject({
        path: 'draft.txt',
      });
      await expect(readFile(path.join(rootPath, 'draft.txt'), 'utf8')).resolves.toBe('draft');
      await expect(listDirectoryTool?.execute({})).resolves.toEqual(
        expect.arrayContaining([expect.objectContaining({ path: 'notes.txt', type: 'file' })])
      );
      await expect(searchFilesTool?.execute({ query: 'draft' })).resolves.toEqual([
        { path: 'draft.txt', type: 'file' },
      ]);
      expect(events).toContain('adapter_tool_start');
      expect(events).toContain('adapter_tool_success');
      expect(adapter.metadata).toMatchObject({ kind: 'native-sdk', readOnly: false });
    } finally {
      await rm(rootPath, { recursive: true, force: true });
    }
  });

  it('enforces filesystem traversal, extension, and read-only policies', async () => {
    const rootPath = await mkdtemp(path.join(os.tmpdir(), 'agentcraft-fs-policy-'));
    try {
      const adapter = FileSystemAdapter.connect({
        rootPath,
        allowedExtensions: ['.txt'],
        readOnly: true,
      });
      const tools = await adapter.getTools?.();
      const readFileTool = tools?.find((item) => item.name === 'read_file');
      const writeFileTool = tools?.find((item) => item.name === 'write_file');

      await expect(readFileTool?.execute({ path: '../secret.txt' })).rejects.toThrow(
        ToolExecutionError
      );
      await expect(readFileTool?.execute({ path: 'secret.env' })).rejects.toThrow(
        ToolExecutionError
      );
      await expect(writeFileTool?.execute({ path: 'ok.txt', content: 'nope' })).rejects.toThrow(
        ToolExecutionError
      );
    } finally {
      await rm(rootPath, { recursive: true, force: true });
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

  it('executes GitHub tools through mocked API requests with repo allowlists', async () => {
    const requests: Array<{ url: string; method?: string; body?: string }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        requests.push({ url, method: init?.method, body: String(init?.body ?? '') });
        return {
          ok: true,
          status: init?.method === 'PUT' ? 201 : 200,
          json: async () => ({ ok: true, url, method: init?.method }),
        } as Response;
      })
    );

    const adapter = GitHubAdapter.connect({
      token: 'token',
      defaultOwner: 'acme',
      defaultRepo: 'docs',
      allowedRepos: ['acme/docs'],
      apiBaseUrl: 'https://api.github.test',
    });
    const tools = await adapter.getTools?.();
    const getRepo = tools?.find((item) => item.name === 'get_repo');
    const commitFile = tools?.find((item) => item.name === 'commit_file');

    await expect(getRepo?.execute({})).resolves.toMatchObject({ ok: true });
    await expect(
      commitFile?.execute({
        path: 'README.md',
        message: 'Update docs',
        content: 'hello',
        branch: 'main',
      })
    ).resolves.toMatchObject({ ok: true });
    await expect(getRepo?.execute({ owner: 'evil', repo: 'repo' })).rejects.toThrow(
      ToolExecutionError
    );
    expect(commitFile?.security).toMatchObject({ sideEffect: 'write', requiresConfirmation: true });
    expect(requests[0]?.url).toBe('https://api.github.test/repos/acme/docs');
    expect(requests[1]?.body).toContain(Buffer.from('hello', 'utf8').toString('base64'));
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

  it('runs Playwright browser tools with lifecycle, allowlists, screenshots, and cleanup', async () => {
    const calls: string[] = [];
    const page = {
      goto: vi.fn(async () => calls.push('goto')),
      click: vi.fn(async () => calls.push('click')),
      fill: vi.fn(async () => calls.push('fill')),
      screenshot: vi.fn(async () => Buffer.from('png')),
      textContent: vi.fn(async () => 'Hello page'),
      waitForSelector: vi.fn(async () => calls.push('wait')),
      close: vi.fn(async () => calls.push('page-close')),
    };
    const browser = {
      newPage: vi.fn(async () => page),
      close: vi.fn(async () => calls.push('browser-close')),
    };
    const adapter = PlaywrightAdapter.connect({
      allowedDomains: ['example.test'],
      launch: async () => browser,
    });
    const tools = await adapter.getTools?.();
    const browseUrl = tools?.find((item) => item.name === 'browse_url');
    const clickElement = tools?.find((item) => item.name === 'click_element');
    const takeScreenshot = tools?.find((item) => item.name === 'take_screenshot');
    const extractText = tools?.find((item) => item.name === 'extract_text');

    await expect(browseUrl?.execute({ url: 'https://example.test' })).resolves.toEqual({
      url: 'https://example.test/',
    });
    await expect(browseUrl?.execute({ url: 'https://evil.test' })).rejects.toThrow(
      ToolExecutionError
    );
    await expect(clickElement?.execute({ selector: '#save' })).resolves.toEqual({
      clicked: '#save',
    });
    await expect(takeScreenshot?.execute({})).resolves.toEqual({
      mimeType: 'image/png',
      base64: 'cG5n',
    });
    await expect(extractText?.execute({ selector: 'main' })).resolves.toEqual({
      selector: 'main',
      text: 'Hello page',
    });
    expect(clickElement?.security).toMatchObject({
      sideEffect: 'write',
      requiresConfirmation: true,
    });
    await adapter.cleanup?.();
    expect(calls).toContain('browser-close');
  });

  it('executes remaining built-in service adapters through mocked APIs or injected clients', async () => {
    const requests: Array<{ url: string; method?: string; body?: string }> = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        requests.push({ url, method: init?.method, body: String(init?.body ?? '') });
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ ok: true, url, method: init?.method }),
          text: async () => JSON.stringify({ ok: true }),
        } as Response;
      })
    );

    const redisClient = {
      get: vi.fn(async () => 'value'),
      set: vi.fn(async () => 'OK'),
      del: vi.fn(async () => 1),
      keys: vi.fn(async () => ['app:key']),
      expire: vi.fn(async () => 1),
      lpush: vi.fn(async () => 1),
      rpop: vi.fn(async () => 'item'),
      lrange: vi.fn(async () => ['item']),
    };
    const storageClient = {
      upload: vi.fn(async () => ({ uploaded: true })),
      download: vi.fn(async () => 'content'),
      list: vi.fn(async () => ['a.txt']),
      delete: vi.fn(async () => ({ deleted: true })),
      signedUrl: vi.fn(async () => 'https://signed.example.test/a.txt'),
      copy: vi.fn(async () => ({ copied: true })),
    };

    const adapters = [
      {
        adapter: SlackAdapter.connect({
          token: 'token',
          defaultChannel: 'C1',
          apiBaseUrl: 'https://slack.test',
        }),
        tool: 'send_message',
        args: { text: 'hi' },
      },
      {
        adapter: EmailAdapter.connect({
          provider: 'sendgrid',
          apiKey: 'key',
          from: 'me@example.test',
          apiBaseUrl: 'https://email.test',
        }),
        tool: 'send_email',
        args: { to: ['you@example.test'], subject: 'Hi', text: 'Hello' },
      },
      {
        adapter: GoogleCalendarAdapter.connect({
          credentials: { accessToken: 'token' },
          apiBaseUrl: 'https://calendar.test',
        }),
        tool: 'create_event',
        args: { event: { summary: 'Meet' } },
      },
      {
        adapter: GoogleSheetsAdapter.connect({
          credentials: { accessToken: 'token' },
          spreadsheetId: 'sheet1',
          apiBaseUrl: 'https://sheets.test',
        }),
        tool: 'write_range',
        args: { range: 'A1', values: [['x']] },
      },
      {
        adapter: NotionAdapter.connect({
          token: 'token',
          defaultParentId: 'parent',
          apiBaseUrl: 'https://notion.test',
        }),
        tool: 'create_page',
        args: { title: 'Page' },
      },
      {
        adapter: SupabaseAdapter.connect({ url: 'https://supabase.test', key: 'key' }),
        tool: 'insert_record',
        args: { table: 'books', record: { title: 'T' } },
      },
      {
        adapter: PineconeAdapter.connect({
          apiKey: 'key',
          indexName: 'idx',
          apiBaseUrl: 'https://pinecone.test',
        }),
        tool: 'query_vectors',
        args: { vector: [1, 2, 3] },
      },
      {
        adapter: RedisAdapter.connect({
          url: 'redis://local',
          keyPrefix: 'app:',
          client: redisClient,
        }),
        tool: 'set_value',
        args: { key: 'key', value: 'value' },
      },
      {
        adapter: StorageAdapter.connect({
          provider: 's3',
          bucket: 'b',
          region: 'us',
          client: storageClient,
        }),
        tool: 'upload_file',
        args: { key: 'a.txt', content: 'hello' },
      },
      {
        adapter: TavilySearchAdapter.connect({ apiKey: 'key', apiBaseUrl: 'https://tavily.test' }),
        tool: 'web_search',
        args: { query: 'agentcraft' },
      },
      {
        adapter: FirecrawlAdapter.connect({ apiKey: 'key', apiBaseUrl: 'https://firecrawl.test' }),
        tool: 'scrape_url',
        args: { url: 'https://example.test' },
      },
      {
        adapter: ApifyAdapter.connect({ token: 'key', apiBaseUrl: 'https://apify.test' }),
        tool: 'run_actor',
        args: { actorId: 'actor', input: { url: 'https://example.test' } },
      },
      {
        adapter: ElevenLabsAdapter.connect({
          apiKey: 'key',
          defaultVoiceId: 'voice',
          apiBaseUrl: 'https://eleven.test',
        }),
        tool: 'text_to_speech',
        args: { text: 'hello' },
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
    expect(redisClient.set).toHaveBeenCalledWith('app:key', 'value', { ttl: undefined });
    expect(storageClient.upload).toHaveBeenCalledWith('a.txt', 'hello');
    expect(requests.length).toBeGreaterThan(10);
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
    const sensitiveTool = tool({
      name: 'secret_lookup',
      description: 'Returns a secret',
      security: { sideEffect: 'read' },
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
    const mutatingTool = tool({
      name: 'update_item',
      description: 'Updates item',
      security: { sideEffect: 'write', requiresConfirmation: true },
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
