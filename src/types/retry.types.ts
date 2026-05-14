export interface ResolvedRetryStrategy {
  maxAttempts: number;
  initialDelay: number;
  backoffMultiplier: number;
  maxDelay: number;
  jitter: boolean;
}

export const DEFAULT_RETRY_STRATEGY: ResolvedRetryStrategy = {
  maxAttempts: 3,
  initialDelay: 1_000,
  backoffMultiplier: 2,
  maxDelay: 30_000,
  jitter: true,
};
