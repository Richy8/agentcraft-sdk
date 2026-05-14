export abstract class AgentCraftError extends Error {
  abstract readonly code: string;
  abstract readonly retryable: boolean;
  readonly context: Record<string, unknown>;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.context = context ?? {};
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export { AgentCraftError as LLMKitError };

export function parseRetryAfter(header: string | undefined): number {
  if (!header) return 60;

  const seconds = parseInt(header, 10);
  if (!Number.isNaN(seconds)) return seconds;

  const date = new Date(header);
  if (!Number.isNaN(date.getTime())) {
    return Math.max(1, Math.ceil((date.getTime() - Date.now()) / 1000));
  }

  return 60;
}

export function wrapUnknown(err: unknown, provider: string, model: string): AgentCraftError {
  const msg = err instanceof Error ? err.message : String(err);
  return new ProviderError(provider, `Unexpected error: ${msg}`, { model });
}

export class ProviderError extends AgentCraftError {
  readonly code = 'PROVIDER_ERROR';
  readonly retryable = false;

  constructor(provider: string, message: string, context?: Record<string, unknown>) {
    super(`[${provider}] ${message}`, { provider, ...context });
  }
}

export class ConfigurationError extends AgentCraftError {
  readonly code = 'CONFIGURATION_ERROR';
  readonly retryable = false;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }
}

export class RateLimitError extends AgentCraftError {
  readonly code = 'RATE_LIMIT_EXCEEDED';
  readonly retryable = true;

  constructor(readonly retryAfterSeconds: number, context?: Record<string, unknown>) {
    super(`Rate limit exceeded. Retry after ${retryAfterSeconds}s.`, context);
  }
}

export class AuthenticationError extends AgentCraftError {
  readonly code = 'AUTHENTICATION_ERROR';
  readonly retryable = false;

  constructor(provider: string, context?: Record<string, unknown>) {
    super(`Authentication failed for provider '${provider}'`, { provider, ...context });
  }
}

export class ModelNotFoundError extends AgentCraftError {
  readonly code = 'MODEL_NOT_FOUND';
  readonly retryable = false;

  constructor(model: string, provider: string, context?: Record<string, unknown>) {
    super(`Model '${model}' was not found on provider '${provider}'`, { model, provider, ...context });
  }
}

export class ContentPolicyError extends AgentCraftError {
  readonly code = 'CONTENT_POLICY_VIOLATION';
  readonly retryable = false;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }
}

export class TimeoutError extends AgentCraftError {
  readonly code = 'TIMEOUT';
  readonly retryable = true;

  constructor(timeoutMs: number, context?: Record<string, unknown>) {
    super(`Request timed out after ${timeoutMs}ms`, { timeoutMs, ...context });
  }
}

export class ServiceUnavailableError extends AgentCraftError {
  readonly code = 'SERVICE_UNAVAILABLE';
  readonly retryable = true;

  constructor(provider: string, context?: Record<string, unknown>) {
    super(`Provider '${provider}' is temporarily unavailable.`, { provider, ...context });
  }
}

export class ContextWindowError extends AgentCraftError {
  readonly code = 'CONTEXT_WINDOW_EXCEEDED';
  readonly retryable = false;

  constructor(model: string, provider: string, context?: Record<string, unknown>) {
    super(`Prompt exceeds context window for model '${model}' on '${provider}'`, {
      model,
      provider,
      ...context,
    });
  }
}

export class QuotaExceededError extends AgentCraftError {
  readonly code = 'QUOTA_EXCEEDED';
  readonly retryable = false;

  constructor(provider: string, context?: Record<string, unknown>) {
    super(`Account quota exhausted for provider '${provider}'`, { provider, ...context });
  }
}

export class NetworkError extends AgentCraftError {
  readonly code = 'NETWORK_ERROR';

  constructor(message: string, readonly retryable: boolean, context?: Record<string, unknown>) {
    super(message, context);
  }
}

export class InternalServerError extends AgentCraftError {
  readonly code = 'INTERNAL_SERVER_ERROR';
  readonly retryable = true;

  constructor(provider: string, statusCode: number, context?: Record<string, unknown>) {
    super(`Provider '${provider}' returned a server error (HTTP ${statusCode})`, {
      provider,
      statusCode,
      ...context,
    });
  }
}

export class RetryExhaustedError extends AgentCraftError {
  readonly code = 'RETRY_EXHAUSTED';
  readonly retryable = false;
  override readonly cause: Error;

  constructor(lastError: Error, attempts: number, context?: Record<string, unknown>) {
    super(`All ${attempts} attempt(s) failed. Last: ${lastError.message}`, {
      attempts,
      ...context,
    });
    this.cause = lastError;
  }
}

export class ToolExecutionError extends AgentCraftError {
  readonly code = 'TOOL_EXECUTION_FAILED';
  readonly retryable = false;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }
}

export class AdapterRequirementError extends AgentCraftError {
  readonly code = 'ADAPTER_REQUIREMENT_NOT_MET';
  readonly retryable = false;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }
}

export class AdapterToolConflictError extends AgentCraftError {
  readonly code = 'ADAPTER_TOOL_CONFLICT';
  readonly retryable = false;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }
}

export class UnsupportedInputError extends AgentCraftError {
  readonly code = 'UNSUPPORTED_INPUT';
  readonly retryable = false;

  constructor(inputType: string, model: string, context?: Record<string, unknown>) {
    super(`Model '${model}' does not support '${inputType}' input`, {
      inputType,
      model,
      ...context,
    });
  }
}

export class SkillNotAttachedError extends AgentCraftError {
  readonly code = 'SKILL_NOT_ATTACHED';
  readonly retryable = false;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }
}

export class InvalidRequestError extends AgentCraftError {
  readonly code = 'INVALID_REQUEST';
  readonly retryable = false;

  constructor(message: string, context?: Record<string, unknown>) {
    super(message, context);
  }
}

export class UnsupportedOperationError extends AgentCraftError {
  readonly code = 'UNSUPPORTED_OPERATION';
  readonly retryable = false;

  constructor(operation: string, provider: string, context?: Record<string, unknown>) {
    super(`'${operation}' is not supported by provider '${provider}'`, {
      operation,
      provider,
      ...context,
    });
  }
}

export function isRetryableError(err: unknown): boolean {
  if (!(err instanceof AgentCraftError)) return false;
  return err.retryable;
}
