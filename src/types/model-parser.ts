import { ConfigurationError } from '../errors/index.js';

export function parseModelString(model: string): { provider: string; modelId: string } {
  const firstColon = model.indexOf(':');
  if (firstColon === -1) {
    throw new ConfigurationError(
      `Invalid model string '${model}'. Expected format: 'provider:model' ` +
        `(e.g. 'anthropic:claude-sonnet-4-6', 'bedrock:anthropic.claude-3-7-sonnet-20250219-v1:0').`
    );
  }

  return {
    provider: model.slice(0, firstColon),
    modelId: model.slice(firstColon + 1),
  };
}
