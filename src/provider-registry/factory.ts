import { modelRegistry } from '../model-registry/registry.js';
import type { BaseLLMProvider } from '../providers/base.provider.js';
import { UnifiedProvider } from '../providers/unified.provider.js';
import type { ModelConfig } from '../types/config.types.js';
import type { Logger } from '../types/logger.js';
import type { ResolvedRetryStrategy } from '../types/retry.types.js';
import { PROVIDER_REGISTRY } from './registry.js';

export class ProviderFactory {
  static build(config: ModelConfig, logger: Logger, retry: ResolvedRetryStrategy): BaseLLMProvider {
    const definition = PROVIDER_REGISTRY[config.provider];

    const caps = modelRegistry.lookup(config.provider, config.model);
    if (caps.deprecated) {
      logger.warn(`Model '${config.model}' on '${config.provider}' is deprecated. Consider upgrading.`);
    }

    return new UnifiedProvider(config, definition.protocol, definition, logger, retry);
  }
}
