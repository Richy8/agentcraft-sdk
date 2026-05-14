import { ConfigurationError } from '../errors/index.js';
import { AgentConfigSchema } from '../agent/config.js';

interface NamedModel {
  name?: string;
}

interface ModelSetConfig {
  models?: NamedModel[];
  default?: string;
}

export function validateConfig(config: unknown): void {
  const result = AgentConfigSchema.safeParse(config);

  if (!result.success) {
    const messages = result.error.issues.map((issue) => issue.message);
    throw new ConfigurationError(messages.join('; '));
  }
}

export function validateModelSet(config: ModelSetConfig): void {
  const models = config.models ?? [];
  const names = models.map((model) => model.name).filter((name): name is string => Boolean(name));
  const uniqueNames = new Set(names);

  if (names.length !== uniqueNames.size) {
    throw new ConfigurationError('Model names must be unique - duplicate name detected');
  }

  if (config.default && !models.some((model) => model.name === config.default)) {
    throw new ConfigurationError(`Default model '${config.default}' does not match any defined model name`);
  }
}

