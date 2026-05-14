import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import * as readline from 'node:readline';
import { ConfigurationError, ToolExecutionError } from '../../errors/index.js';
import { createAdapter, tool } from './types.js';
import type { AgentAdapter, ToolDefinition } from './types.js';

type JsonRpcId = number;

interface JsonRpcResponse {
  id?: JsonRpcId;
  result?: unknown;
  error?: { code?: number; message?: string; data?: unknown };
}

interface McpTool {
  name: string;
  description?: string;
  inputSchema?: {
    type?: string;
    properties?: Record<string, { type?: string; description?: string; enum?: string[] }>;
    required?: string[];
  };
}

interface McpToolsListResult {
  tools?: McpTool[];
}

export interface McpResource {
  uri: string;
  name?: string;
  description?: string;
  mimeType?: string;
}

export interface McpPrompt {
  name: string;
  description?: string;
  arguments?: Array<{ name: string; description?: string; required?: boolean }>;
}

interface McpCallToolResult {
  content?: Array<{ type?: string; text?: string; [key: string]: unknown }>;
  structuredContent?: unknown;
  isError?: boolean;
}

export interface McpServerMetadata {
  trustLevel?: 'trusted' | 'review-required' | 'untrusted';
  packageName?: string;
  packagePinned?: boolean;
  requiredSecrets?: string[];
  sideEffects?: Array<'none' | 'read' | 'write' | 'external'>;
  scopes?: string[];
}

export type MCPAdapterConfig =
  | {
      transport: 'http';
      url: string;
      headers?: Record<string, string>;
      discovery?: 'eager' | 'lazy';
      name?: string;
      timeoutMs?: number;
      signal?: AbortSignal;
      allowedTools?: string[];
      allowedResources?: string[];
      metadata?: McpServerMetadata;
      roots?: string[];
      onTrace?: (event: McpTraceEvent) => void;
    }
  | {
      transport: 'sse';
      url: string;
      headers?: Record<string, string>;
      discovery?: 'eager' | 'lazy';
      name?: string;
      timeoutMs?: number;
      signal?: AbortSignal;
      allowedTools?: string[];
      allowedResources?: string[];
      metadata?: McpServerMetadata;
      roots?: string[];
      onTrace?: (event: McpTraceEvent) => void;
    }
  | {
      transport: 'stdio';
      command: string;
      args?: string[];
      env?: Record<string, string>;
      discovery?: 'eager' | 'lazy';
      name?: string;
      timeoutMs?: number;
      signal?: AbortSignal;
      allowedTools?: string[];
      allowedResources?: string[];
      allowedCommands?: string[];
      rejectUnpinnedPackage?: boolean;
      onSecurityWarning?: (message: string) => void;
      metadata?: McpServerMetadata;
      roots?: string[];
      onTrace?: (event: McpTraceEvent) => void;
    };

export type McpTraceEvent =
  | { type: 'mcp_start'; serverName: string; transport: MCPAdapterConfig['transport'] }
  | { type: 'mcp_request'; serverName: string; method: string }
  | { type: 'mcp_response'; serverName: string; method: string }
  | { type: 'mcp_error'; serverName: string; method?: string; error: string }
  | { type: 'mcp_close'; serverName: string };

interface McpTransport {
  start?(): Promise<void>;
  request(method: string, params?: Record<string, unknown>): Promise<unknown>;
  close?(): Promise<void>;
}

export class MCPAdapter {
  static readonly adapterName = 'mcp';

  static connect(config: MCPAdapterConfig): AgentAdapter {
    validateMcpConfig(config);

    let transport: McpTransport | undefined;
    let discoveredTools: ToolDefinition[] | undefined;

    const getTransport = async () => {
      transport ??= createTransport(config);
      await transport.start?.();
      return transport;
    };

    const discover = async () => {
      if (discoveredTools) return discoveredTools;
      const activeTransport = await getTransport();
      await activeTransport.request('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'agentcraft', version: '0.1.0' },
      });
      const result = await activeTransport.request('tools/list');
      const tools = ((result as McpToolsListResult).tools ?? []).filter((item) => {
        return !config.allowedTools || config.allowedTools.includes(item.name);
      });
      discoveredTools = tools.map((item) => this.toToolDefinition(item, activeTransport, config.metadata));
      return discoveredTools;
    };

    const describeMcp = async () => {
      const activeTransport = await getTransport();
      const [resources, prompts] = await Promise.all([
        safeRequest<McpResource[]>(activeTransport, 'resources/list', 'resources'),
        safeRequest<McpPrompt[]>(activeTransport, 'prompts/list', 'prompts'),
      ]);
      return {
        resources: filterResources(resources, config.allowedResources),
        prompts,
        roots: config.roots ?? [],
      };
    };

    const adapter = createAdapter({
      name: config.name ?? this.adapterName,
      requires: ['tools'],
      metadata: {
        kind: 'mcp-backed',
        auth: config.metadata?.requiredSecrets?.length ? 'custom' : 'none',
        trustLevel: config.metadata?.trustLevel ?? 'review-required',
        sideEffects: config.metadata?.sideEffects ?? ['external'],
        ...(config.metadata?.scopes !== undefined && { scopes: config.metadata.scopes }),
        ...(config.metadata?.requiredSecrets !== undefined && { requiredSecrets: config.metadata.requiredSecrets }),
      },
      getTools: async () => discover(),
      ...(config.discovery === 'eager' && { init: async () => void (await discover()) }),
      cleanup: async () => {
        await transport?.close?.();
        await config.onTrace?.({ type: 'mcp_close', serverName: config.name ?? this.adapterName });
        transport = undefined;
        discoveredTools = undefined;
      },
    });
    return Object.assign(adapter, { describeMcp });
  }

  static placeholderTool(name: string): ToolDefinition {
    return tool({
      name,
      description: `Tool discovered from an MCP server: ${name}.`,
      security: { sideEffect: 'external', requiresConfirmation: true },
      params: {},
      run: async () => {
        throw new Error('MCP tool execution requires a live MCP transport implementation.');
      },
    });
  }

  private static toToolDefinition(toolSpec: McpTool, transport: McpTransport, metadata?: McpServerMetadata): ToolDefinition {
    const sideEffect = resolveMcpToolSideEffect(metadata);
    const properties = Object.fromEntries(
      Object.entries(toolSpec.inputSchema?.properties ?? {}).map(([name, schema]) => [
        name,
        {
          type: schema.type ?? 'string',
          description: schema.description ?? `${name} argument`,
          ...(schema.enum !== undefined && { enum: schema.enum }),
        },
      ])
    );

    return {
      name: toolSpec.name,
      description: toolSpec.description ?? `MCP tool '${toolSpec.name}'`,
      parameters: {
        type: 'object',
        properties,
        required: toolSpec.inputSchema?.required ?? [],
      },
      security: {
        sideEffect,
        requiresConfirmation: sideEffect === 'write' || sideEffect === 'external',
        ...(metadata?.scopes !== undefined && { scopes: metadata.scopes }),
      },
      execute: async (args) => {
        const result = (await transport.request('tools/call', { name: toolSpec.name, arguments: args })) as McpCallToolResult;
        if (result.isError) {
          const detail = formatMcpToolError(result);
          throw new ToolExecutionError(
            `MCP tool '${toolSpec.name}' returned an error${detail ? `: ${detail}` : ''}`,
            { toolName: toolSpec.name }
          );
        }
        if (result.structuredContent !== undefined) return result.structuredContent;
        return (result.content ?? []).map((item) => item.text ?? JSON.stringify(item)).join('\n');
      },
    };
  }
}

function resolveMcpToolSideEffect(metadata?: McpServerMetadata): NonNullable<ToolDefinition['security']>['sideEffect'] {
  const effects = metadata?.sideEffects;
  if (!effects || effects.length === 0) return 'external';
  if (effects.includes('write')) return 'write';
  if (effects.includes('external')) return 'external';
  if (effects.includes('read')) return 'read';
  return 'none';
}

function formatMcpToolError(result: McpCallToolResult): string {
  return (result.content ?? [])
    .map((item) => item.text ?? JSON.stringify(item))
    .join('\n')
    .trim();
}

class StdioMcpTransport implements McpTransport {
  private process: ChildProcessWithoutNullStreams | undefined;
  private nextId = 1;
  private readonly pending = new Map<
    JsonRpcId,
    { method: string; resolve: (value: unknown) => void; reject: (err: Error) => void }
  >();

  constructor(private readonly config: Extract<MCPAdapterConfig, { transport: 'stdio' }>) {}

  async start(): Promise<void> {
    if (this.process) return;
    this.process = spawn(this.config.command, this.config.args ?? [], {
      env: { ...process.env, ...(this.config.env ?? {}) },
      stdio: 'pipe',
    });
    this.process.once('exit', (code) => {
      const err = new Error(`MCP server exited with code ${code ?? 'unknown'}`);
      for (const pending of this.pending.values()) pending.reject(err);
      this.pending.clear();
    });

    const reader = readline.createInterface({ input: this.process.stdout });
    reader.on('line', (line) => this.handleLine(line));
    this.process.stderr.on('data', () => undefined);
  }

  request(method: string, params?: Record<string, unknown>): Promise<unknown> {
    if (!this.process) throw new ConfigurationError('MCP stdio transport has not been started');
    throwIfAborted(this.config.signal, method);
    this.config.onTrace?.({ type: 'mcp_request', serverName: this.config.name ?? 'mcp', method });
    const id = this.nextId++;
    const payload = JSON.stringify({ jsonrpc: '2.0', id, method, ...(params !== undefined && { params }) });
    this.process.stdin.write(`${payload}\n`);
    return withRpcTimeout(
      new Promise((resolve, reject) => this.pending.set(id, { method, resolve, reject })),
      this.config.timeoutMs,
      method,
      this.config.signal,
      () => this.pending.delete(id)
    );
  }

  async close(): Promise<void> {
    this.process?.kill();
    this.process = undefined;
    this.pending.clear();
  }

  private handleLine(line: string): void {
    let response: JsonRpcResponse;
    try {
      response = JSON.parse(line) as JsonRpcResponse;
    } catch {
      return;
    }
    if (typeof response.id !== 'number') return;
    const pending = this.pending.get(response.id);
    if (!pending) return;
    this.pending.delete(response.id);
    if (response.error) {
      this.config.onTrace?.({
        type: 'mcp_error',
        serverName: this.config.name ?? 'mcp',
        method: pending.method,
        error: response.error.message ?? 'MCP request failed',
      });
      pending.reject(new Error(response.error.message ?? 'MCP request failed'));
      return;
    }
    this.config.onTrace?.({ type: 'mcp_response', serverName: this.config.name ?? 'mcp', method: pending.method });
    pending.resolve(response.result);
  }
}

class HttpMcpTransport implements McpTransport {
  private nextId = 1;

  constructor(private readonly config: Extract<MCPAdapterConfig, { transport: 'http' }>) {}

  async request(method: string, params?: Record<string, unknown>): Promise<unknown> {
    throwIfAborted(this.config.signal, method);
    this.config.onTrace?.({ type: 'mcp_request', serverName: this.config.name ?? 'mcp', method });
    const id = this.nextId++;
    const controller = new AbortController();
    const abortRequest = () => controller.abort();
    this.config.signal?.addEventListener('abort', abortRequest, { once: true });
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs ?? 30_000);
    try {
      const response = await withRpcTimeout(
        fetch(this.config.url, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'content-type': 'application/json',
            accept: 'application/json',
            ...(this.config.headers ?? {}),
          },
          body: JSON.stringify({ jsonrpc: '2.0', id, method, ...(params !== undefined && { params }) }),
        }),
        this.config.timeoutMs,
        method,
        this.config.signal
      );
      if (!response.ok) throw new Error(`MCP HTTP request failed with status ${response.status}`);
      const payload = (await response.json()) as JsonRpcResponse;
      if (payload.error) throw new Error(payload.error.message ?? 'MCP request failed');
      this.config.onTrace?.({ type: 'mcp_response', serverName: this.config.name ?? 'mcp', method });
      return payload.result;
    } catch (error) {
      this.config.onTrace?.({
        type: 'mcp_error',
        serverName: this.config.name ?? 'mcp',
        method,
        error: error instanceof Error ? error.message : 'MCP request failed',
      });
      throw error;
    } finally {
      this.config.signal?.removeEventListener('abort', abortRequest);
      clearTimeout(timeout);
    }
  }
}

class SseMcpTransport implements McpTransport {
  private nextId = 1;
  private postUrl: string | undefined;
  private started = false;
  private endpointReady: Promise<string>;
  private endpointResolve: ((url: string) => void) | undefined;
  private endpointReject: ((err: Error) => void) | undefined;
  private sseAbort = new AbortController();
  private readonly pending = new Map<
    JsonRpcId,
    { method: string; resolve: (value: unknown) => void; reject: (err: Error) => void }
  >();

  constructor(private readonly config: Extract<MCPAdapterConfig, { transport: 'sse' }>) {
    this.endpointReady = new Promise((resolve, reject) => {
      this.endpointResolve = resolve;
      this.endpointReject = reject;
    });
  }

  async start(): Promise<void> {
    if (this.started) return;
    throwIfAborted(this.config.signal, 'sse/start');
    this.config.signal?.addEventListener('abort', () => this.sseAbort.abort(), { once: true });
    try {
      const response = await fetch(this.config.url, {
        method: 'GET',
        signal: this.sseAbort.signal,
        headers: {
          accept: 'text/event-stream',
          ...(this.config.headers ?? {}),
        },
      });
      if (!response.ok) throw new Error(`MCP SSE connection failed with status ${response.status}`);
      if (!response.body) throw new Error('MCP SSE connection did not provide a response body');
      this.started = true;
      void this.readEvents(response.body).catch((error) => this.failPending(error));
    } catch (error) {
      this.endpointReject?.(error instanceof Error ? error : new Error('MCP SSE connection failed'));
      throw error;
    }
  }

  async request(method: string, params?: Record<string, unknown>): Promise<unknown> {
    throwIfAborted(this.config.signal, method);
    this.config.onTrace?.({ type: 'mcp_request', serverName: this.config.name ?? 'mcp', method });
    const id = this.nextId++;
    const endpoint = await withRpcTimeout(this.endpointReady, this.config.timeoutMs, 'sse/endpoint', this.config.signal);
    const response = await fetch(endpoint, {
      method: 'POST',
      ...(this.config.signal !== undefined && { signal: this.config.signal }),
      headers: {
        'content-type': 'application/json',
        ...(this.config.headers ?? {}),
      },
      body: JSON.stringify({ jsonrpc: '2.0', id, method, ...(params !== undefined && { params }) }),
    });
    if (!response.ok) throw new Error(`MCP SSE POST failed with status ${response.status}`);
    return withRpcTimeout(
      new Promise((resolve, reject) => this.pending.set(id, { method, resolve, reject })),
      this.config.timeoutMs,
      method,
      this.config.signal,
      () => this.pending.delete(id)
    );
  }

  async close(): Promise<void> {
    this.sseAbort.abort();
    this.started = false;
    this.failPending(new Error('MCP SSE transport closed'));
  }

  private async readEvents(body: ReadableStream<Uint8Array>): Promise<void> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true });
      let boundary = buffer.indexOf('\n\n');
      while (boundary >= 0) {
        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        this.handleEvent(rawEvent);
        boundary = buffer.indexOf('\n\n');
      }
    }
  }

  private handleEvent(rawEvent: string): void {
    const lines = rawEvent.split(/\r?\n/);
    const event = lines.find((line) => line.startsWith('event:'))?.slice('event:'.length).trim();
    const data = lines
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice('data:'.length).trim())
      .join('\n');
    if (!data) return;
    if (event === 'endpoint') {
      this.postUrl = new URL(data, this.config.url).toString();
      this.endpointResolve?.(this.postUrl);
      return;
    }
    this.handleResponseData(data);
  }

  private handleResponseData(data: string): void {
    let response: JsonRpcResponse;
    try {
      response = JSON.parse(data) as JsonRpcResponse;
    } catch {
      return;
    }
    if (typeof response.id !== 'number') return;
    const pending = this.pending.get(response.id);
    if (!pending) return;
    this.pending.delete(response.id);
    if (response.error) {
      const message = response.error.message ?? 'MCP request failed';
      this.config.onTrace?.({ type: 'mcp_error', serverName: this.config.name ?? 'mcp', method: pending.method, error: message });
      pending.reject(new Error(message));
      return;
    }
    this.config.onTrace?.({ type: 'mcp_response', serverName: this.config.name ?? 'mcp', method: pending.method });
    pending.resolve(response.result);
  }

  private failPending(error: Error): void {
    this.endpointReject?.(error);
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }
}

function createTransport(config: MCPAdapterConfig): McpTransport {
  config.onTrace?.({ type: 'mcp_start', serverName: config.name ?? 'mcp', transport: config.transport });
  if (config.transport === 'stdio') return new StdioMcpTransport(config);
  if (config.transport === 'sse') return new SseMcpTransport(config);
  if (/\/sse\/?$/.test(config.url)) {
    return new SseMcpTransport({ ...config, transport: 'sse' });
  }
  return new HttpMcpTransport(config);
}

function validateMcpConfig(config: MCPAdapterConfig): void {
  validateMcpRoots(config.roots);
  if (config.transport === 'http') {
    if (!/^https?:\/\//.test(config.url)) throw new ConfigurationError('MCP HTTP transport requires an http(s) URL');
    return;
  }
  if (config.transport === 'sse') {
    if (!/^https?:\/\//.test(config.url)) throw new ConfigurationError('MCP SSE transport requires an http(s) URL');
    return;
  }

  const allowedCommands = config.allowedCommands ?? ['node', 'npx', 'npm', 'pnpm', 'yarn', 'bun'];
  if (!allowedCommands.includes(config.command)) {
    throw new ConfigurationError(`MCP stdio command '${config.command}' is not allowed`);
  }
  const packageName = config.metadata?.packageName ?? config.args?.find((arg) => !arg.startsWith('-'));
  if (packageName && config.command === 'npx' && !isPinnedPackage(packageName)) {
    config.metadata ??= {};
    config.metadata.packagePinned = false;
    const message = `MCP stdio package '${packageName}' is not version-pinned. Pin the package version before production use.`;
    if (config.rejectUnpinnedPackage) throw new ConfigurationError(message);
    (config.onSecurityWarning ?? console.warn)(message);
  }
}

function validateMcpRoots(roots?: string[]): void {
  for (const root of roots ?? []) {
    if (!root || root.includes('\0')) throw new ConfigurationError('MCP roots must be non-empty paths or URLs');
    if (root.includes('..')) throw new ConfigurationError(`MCP root '${root}' must not contain parent directory traversal`);
    if (/^https?:\/\//.test(root) || root.startsWith('file://') || root.startsWith('/')) continue;
    throw new ConfigurationError(`MCP root '${root}' must be an absolute path, file URL, or http(s) URL`);
  }
}

function filterResources(resources: McpResource[], allowedResources?: string[]): McpResource[] {
  if (!allowedResources?.length) return resources;
  return resources.filter((resource) => {
    return allowedResources.some((allowed) => resource.uri === allowed || resource.uri.startsWith(allowed));
  });
}

function isPinnedPackage(packageName: string): boolean {
  if (packageName.startsWith('@')) {
    return packageName.slice(1).includes('@');
  }
  return packageName.includes('@');
}

function throwIfAborted(signal: AbortSignal | undefined, method: string): void {
  if (signal?.aborted) throw new Error(`MCP request '${method}' was cancelled`);
}

async function withRpcTimeout<T>(
  promise: Promise<T>,
  timeoutMs = 30_000,
  method: string,
  signal?: AbortSignal,
  onCancel?: () => void
): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  let abortHandler: (() => void) | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(`MCP request '${method}' timed out after ${timeoutMs}ms`)), timeoutMs);
        abortHandler = () => {
          onCancel?.();
          reject(new Error(`MCP request '${method}' was cancelled`));
        };
        signal?.addEventListener('abort', abortHandler, { once: true });
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
    if (abortHandler) signal?.removeEventListener('abort', abortHandler);
  }
}

async function safeRequest<T extends unknown[]>(
  transport: McpTransport,
  method: string,
  key: 'resources' | 'prompts'
): Promise<T> {
  try {
    const result = (await transport.request(method)) as Record<string, unknown>;
    return ((result[key] as T | undefined) ?? []) as T;
  } catch {
    return [] as unknown as T;
  }
}
