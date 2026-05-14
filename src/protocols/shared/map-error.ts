import {
  AuthenticationError,
  ContentPolicyError,
  ContextWindowError,
  InternalServerError,
  InvalidRequestError,
  ModelNotFoundError,
  NetworkError,
  QuotaExceededError,
  RateLimitError,
  ServiceUnavailableError,
  TimeoutError,
  parseRetryAfter,
  wrapUnknown,
  type AgentCraftError,
} from '../../errors/index.js';
import type { ModelConfig } from '../../types/config.types.js';

export function getErrorStatus(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const record = err as Record<string, unknown>;
  const status = record.status ?? record.statusCode ?? record.$metadata;
  if (typeof status === 'number') return status;
  if (status && typeof status === 'object') {
    const metadataStatus = (status as Record<string, unknown>).httpStatusCode;
    if (typeof metadataStatus === 'number') return metadataStatus;
  }
  return undefined;
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function getErrorCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const code = (err as Record<string, unknown>).code;
  return typeof code === 'string' ? code : undefined;
}

export function getRetryAfter(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const headers = (err as Record<string, unknown>).headers;
  if (!headers || typeof headers !== 'object') return undefined;

  const retryAfter = (headers as Record<string, unknown>)['retry-after'];
  return typeof retryAfter === 'string' ? retryAfter : undefined;
}

export function mapCommonError(err: unknown, config: ModelConfig): AgentCraftError {
  const provider = config.provider;
  const model = config.model;
  if (!(err instanceof Error)) return wrapUnknown(err, provider, model);

  const status = getErrorStatus(err);
  const msg = getErrorMessage(err);
  const lower = msg.toLowerCase();

  if (status === 429) {
    if (lower.includes('quota') || lower.includes('billing') || lower.includes('insufficient')) {
      return new QuotaExceededError(provider, { model });
    }
    return new RateLimitError(parseRetryAfter(getRetryAfter(err)), { provider, model });
  }
  if (status === 402) return new QuotaExceededError(provider, { model });
  if (status === 401 || status === 403) return new AuthenticationError(provider, { model });
  if (status === 404) return new ModelNotFoundError(model, provider);
  if (status === 413) return new ContextWindowError(model, provider);
  if (status === 400) {
    if (lower.includes('context') || lower.includes('token') || lower.includes('too long')) {
      return new ContextWindowError(model, provider);
    }
    if (lower.includes('content_policy') || lower.includes('content policy') || lower.includes('safety')) {
      return new ContentPolicyError(msg, { model, provider });
    }
    return new InvalidRequestError(msg, { model, provider });
  }
  if (status === 500 || status === 502 || status === 504) {
    return new InternalServerError(provider, status, { model });
  }
  if (status === 503 || status === 529) return new ServiceUnavailableError(provider, { model });

  const code = getErrorCode(err);
  if (code === 'ETIMEDOUT' || code === 'ECONNABORTED') {
    return new TimeoutError(config.timeout ?? 120_000, { model, provider, code });
  }
  if (code === 'ECONNRESET' || code === 'ECONNREFUSED') {
    return new NetworkError(msg, true, { model, provider, code });
  }
  if (code === 'ENOTFOUND') {
    return new NetworkError(msg, false, { model, provider, code });
  }

  return wrapUnknown(err, provider, model);
}
