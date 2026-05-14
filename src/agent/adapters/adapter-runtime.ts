import { ConfigurationError, ToolExecutionError } from '../../errors/index.js';
import type { AgentAdapter } from './types.js';

export type AdapterAuditEvent =
  | { type: 'adapter_tool_start'; adapterName: string; toolName: string }
  | { type: 'adapter_tool_success'; adapterName: string; toolName: string }
  | { type: 'adapter_tool_error'; adapterName: string; toolName: string; error: string };

export interface AdapterRuntimeOptions {
  timeoutMs?: number;
  onAuditEvent?: (event: AdapterAuditEvent) => void;
}

export type AdapterMetadata = NonNullable<AgentAdapter['metadata']>;

export function withAdapterRuntime<T>(
  adapterName: string,
  toolName: string,
  operation: (signal: AbortSignal) => Promise<T>,
  options: AdapterRuntimeOptions = {}
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  options.onAuditEvent?.({ type: 'adapter_tool_start', adapterName, toolName });

  return Promise.race([
    Promise.resolve().then(() => operation(controller.signal)),
    new Promise<never>((_resolve, reject) => {
      controller.signal.addEventListener(
        'abort',
        () => reject(new ToolExecutionError(`Adapter tool '${toolName}' timed out after ${timeoutMs}ms`, { adapterName, toolName })),
        { once: true }
      );
    }),
  ])
    .then((result) => {
      options.onAuditEvent?.({ type: 'adapter_tool_success', adapterName, toolName });
      return result;
    })
    .catch((error) => {
      const normalized = normalizeAdapterError(adapterName, toolName, error);
      options.onAuditEvent?.({ type: 'adapter_tool_error', adapterName, toolName, error: normalized.message });
      throw normalized;
    })
    .finally(() => clearTimeout(timeout));
}

export function normalizeAdapterError(adapterName: string, toolName: string, error: unknown): ToolExecutionError {
  if (error instanceof ToolExecutionError) return error;
  if (error instanceof ConfigurationError) return new ToolExecutionError(error.message, { adapterName, toolName, code: error.code });
  const message = error instanceof Error ? error.message : String(error);
  return new ToolExecutionError(`Adapter tool '${toolName}' failed: ${message}`, { adapterName, toolName });
}

export function placeholderMetadata(scopes: string[] = []): AdapterMetadata {
  return {
    kind: 'placeholder',
    auth: 'custom',
    trustLevel: 'review-required',
    sideEffects: ['read', 'write', 'external'],
    scopes,
    readOnly: false,
  };
}
