import { ToolExecutionError } from '../../errors/index.js';
import type { ToolDefinition } from './types.js';

export interface ToolGuardrailContext {
  tool: ToolDefinition;
  args?: Record<string, unknown>;
  result?: unknown;
}

export interface ToolGuardrailResult {
  allowed: boolean;
  reason?: string;
}

export type ToolGuardrail = (context: ToolGuardrailContext) => ToolGuardrailResult | Promise<ToolGuardrailResult>;

export type ToolAuditEvent =
  | { type: 'approval_required'; toolName: string; sideEffect?: string }
  | { type: 'approval_granted'; toolName: string }
  | { type: 'approval_denied'; toolName: string }
  | { type: 'tool_start'; toolName: string }
  | { type: 'tool_success'; toolName: string; resultBytes: number }
  | { type: 'tool_error'; toolName: string; error: string }
  | { type: 'guardrail_blocked'; toolName: string; phase: 'input' | 'output'; reason: string }
  | { type: 'dry_run'; toolName: string };

export interface ToolPolicy {
  approvedTools?: string[];
  allowSideEffects?: boolean;
  dryRun?: boolean;
  readOnly?: boolean;
  timeoutMs?: number;
  maxResultBytes?: number;
  redactSecrets?: boolean;
  secretPatterns?: RegExp[];
  guardrailMode?: 'enforce' | 'warn';
  retry?: {
    attempts: number;
    delayMs?: number;
  };
  onAuditEvent?: (event: ToolAuditEvent) => void | Promise<void>;
  onApprovalRequired?: (context: ToolGuardrailContext) => boolean | Promise<boolean>;
  inputGuardrails?: ToolGuardrail[];
  outputGuardrails?: ToolGuardrail[];
}

const DEFAULT_SECRET_PATTERNS = [
  /(sk-[a-zA-Z0-9_-]{8,})/g,
  /(Bearer\s+)[a-zA-Z0-9._-]+/g,
  /(api[_-]?key["']?\s*[:=]\s*["']?)[^"',\s}]+/gi,
  /(token["']?\s*[:=]\s*["']?)[^"',\s}]+/gi,
  /(secret["']?\s*[:=]\s*["']?)[^"',\s}]+/gi,
];

export async function enforceToolPolicy(
  toolDef: ToolDefinition,
  args: Record<string, unknown>,
  policy: ToolPolicy = {}
): Promise<void> {
  const approved = new Set(policy.approvedTools ?? []);
  if (toolDef.security?.requiresConfirmation && !policy.allowSideEffects && !approved.has(toolDef.name)) {
    await emit(policy, { type: 'approval_required', toolName: toolDef.name, sideEffect: toolDef.security.sideEffect });
    const approvedByCallback = await policy.onApprovalRequired?.({ tool: toolDef, args });
    if (!approvedByCallback) {
      await emit(policy, { type: 'approval_denied', toolName: toolDef.name });
      throw new ToolExecutionError(`Tool '${toolDef.name}' requires explicit approval before execution`, {
        toolName: toolDef.name,
        sideEffect: toolDef.security.sideEffect,
        scopes: toolDef.security.scopes,
      });
    }
    await emit(policy, { type: 'approval_granted', toolName: toolDef.name });
  }

  if (policy.readOnly && (toolDef.security?.sideEffect === 'write' || toolDef.security?.requiresConfirmation)) {
    throw new ToolExecutionError(`Tool '${toolDef.name}' is blocked by read-only policy`, {
      toolName: toolDef.name,
      sideEffect: toolDef.security?.sideEffect,
    });
  }

  await runGuardrails('input', policy.inputGuardrails ?? [], { tool: toolDef, args }, policy);
}

export async function runToolWithPolicy(
  toolDef: ToolDefinition,
  args: Record<string, unknown>,
  policy: ToolPolicy = {}
): Promise<unknown> {
  await enforceToolPolicy(toolDef, args, policy);
  if (policy.dryRun) {
    await emit(policy, { type: 'dry_run', toolName: toolDef.name });
    return {
      dryRun: true,
      toolName: toolDef.name,
      args: policy.redactSecrets === false ? args : redactSecrets(args, policy.secretPatterns),
    };
  }

  await emit(policy, { type: 'tool_start', toolName: toolDef.name });
  try {
    const result = await executeWithRetry(toolDef, args, policy);
    await runGuardrails('output', policy.outputGuardrails ?? [], { tool: toolDef, args, result }, policy);

    const redacted = policy.redactSecrets === false ? result : redactSecrets(result, policy.secretPatterns);
    const limited = enforceResultLimit(redacted, policy.maxResultBytes, toolDef.name);
    await emit(policy, { type: 'tool_success', toolName: toolDef.name, resultBytes: resultBytes(limited) });
    return limited;
  } catch (err) {
    const message = policy.redactSecrets === false
      ? (err as Error).message
      : String(redactSecrets((err as Error).message, policy.secretPatterns));
    await emit(policy, { type: 'tool_error', toolName: toolDef.name, error: message });
    if (err instanceof ToolExecutionError) {
      throw new ToolExecutionError(message, { ...err.context, toolName: toolDef.name });
    }
    throw new ToolExecutionError(`Tool '${toolDef.name}' failed: ${message}`, { toolName: toolDef.name });
  }
}

export function mergeToolPolicies(base?: ToolPolicy, override?: ToolPolicy): ToolPolicy | undefined {
  if (!base && !override) return undefined;
  return {
    ...(base ?? {}),
    ...(override ?? {}),
    approvedTools: uniqueStrings([...(base?.approvedTools ?? []), ...(override?.approvedTools ?? [])]),
    inputGuardrails: uniqueReferences([...(base?.inputGuardrails ?? []), ...(override?.inputGuardrails ?? [])]),
    outputGuardrails: uniqueReferences([...(base?.outputGuardrails ?? []), ...(override?.outputGuardrails ?? [])]),
    secretPatterns: uniqueRegexes([...(base?.secretPatterns ?? []), ...(override?.secretPatterns ?? [])]),
  };
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function uniqueReferences<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function uniqueRegexes(values: RegExp[]): RegExp[] {
  const seen = new Set<string>();
  const unique: RegExp[] = [];
  for (const value of values) {
    const key = `${value.source}/${value.flags}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(value);
  }
  return unique;
}

export function redactSecrets(value: unknown, patterns: RegExp[] = DEFAULT_SECRET_PATTERNS): unknown {
  if (typeof value === 'string') return redactString(value, patterns);
  if (Array.isArray(value)) return value.map((item) => redactSecrets(item, patterns));
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      isSecretKey(key) ? '[REDACTED]' : redactSecrets(item, patterns),
    ])
  );
}

function redactString(value: string, patterns: RegExp[]): string {
  return patterns.reduce((current, pattern) => current.replace(pattern, (_match, prefix?: string) => `${prefix ?? ''}[REDACTED]`), value);
}

function isSecretKey(key: string): boolean {
  return /api[_-]?key|token|secret|password|authorization/i.test(key);
}

async function runGuardrails(
  phase: 'input' | 'output',
  guardrails: ToolGuardrail[],
  context: ToolGuardrailContext,
  policy: ToolPolicy
): Promise<void> {
  for (const guardrail of guardrails) {
    const result = await guardrail(context);
    if (!result.allowed) {
      await emit(policy, {
        type: 'guardrail_blocked',
        toolName: context.tool.name,
        phase,
        reason: result.reason ?? 'blocked',
      });
      if (policy.guardrailMode === 'warn') continue;
      throw new ToolExecutionError(`Tool ${phase} guardrail blocked '${context.tool.name}': ${result.reason ?? 'blocked'}`, {
        toolName: context.tool.name,
        phase,
      });
    }
  }
}

async function executeWithRetry(
  toolDef: ToolDefinition,
  args: Record<string, unknown>,
  policy: ToolPolicy
): Promise<unknown> {
  const attempts = Math.max(1, policy.retry?.attempts ?? 1);
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await withTimeout(toolDef.execute(args), policy.timeoutMs, toolDef.name);
    } catch (err) {
      lastError = err;
      if (attempt < attempts && policy.retry?.delayMs) {
        await new Promise((resolve) => setTimeout(resolve, policy.retry!.delayMs));
      }
    }
  }
  throw lastError;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number | undefined, toolName: string): Promise<T> {
  if (!timeoutMs) return promise;

  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          reject(new ToolExecutionError(`Tool '${toolName}' timed out after ${timeoutMs}ms`, { toolName, timeoutMs }));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

function enforceResultLimit(value: unknown, maxBytes: number | undefined, toolName: string): unknown {
  if (!maxBytes) return value;
  const bytes = Buffer.byteLength(typeof value === 'string' ? value : JSON.stringify(value), 'utf8');
  if (bytes > maxBytes) {
    throw new ToolExecutionError(`Tool '${toolName}' result exceeded ${maxBytes} bytes`, { toolName, maxBytes, bytes });
  }
  return value;
}

function resultBytes(value: unknown): number {
  return Buffer.byteLength(typeof value === 'string' ? value : JSON.stringify(value), 'utf8');
}

async function emit(policy: ToolPolicy, event: ToolAuditEvent): Promise<void> {
  await policy.onAuditEvent?.(event);
}
