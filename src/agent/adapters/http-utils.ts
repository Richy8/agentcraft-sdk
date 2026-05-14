import { ToolExecutionError } from '../../errors/index.js';

export interface JsonRequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  signal?: AbortSignal;
}

export async function requestJson(baseUrl: string, path: string, options: JsonRequestOptions = {}): Promise<unknown> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? 'GET',
    ...(options.signal !== undefined && { signal: options.signal }),
    headers: {
      accept: 'application/json',
      ...(options.body !== undefined && { 'content-type': 'application/json' }),
      ...(options.headers ?? {}),
    },
    ...(options.body !== undefined && { body: JSON.stringify(options.body) }),
  });
  if (!response.ok) throw new ToolExecutionError(`HTTP request failed with status ${response.status}`, { path });
  if (response.status === 204) return {};
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) return response.text();
  return response.json() as Promise<unknown>;
}

export function compact(value: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}
