import { ProviderFactory } from '../provider-registry/factory.js';
import type { BaseLLMProvider } from '../providers/base.provider.js';
import type { ModelConfig } from '../types/config.types.js';
import type { Logger } from '../types/logger.js';
import type { ResolvedRetryStrategy } from '../types/retry.types.js';

export function buildProvider(model: ModelConfig, logger: Logger, retry: ResolvedRetryStrategy): BaseLLMProvider {
  return ProviderFactory.build(model, logger, retry);
}

