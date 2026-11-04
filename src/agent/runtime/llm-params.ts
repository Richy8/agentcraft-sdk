import type { LLMCallParams } from "../../types/provider.types.js";
import type { ValidatedAgentConfig } from "../config.js";
import type { AgentRunParams } from "../types.js";

export function toLLMCallParams(
  runParams: AgentRunParams,
  config: ValidatedAgentConfig,
): LLMCallParams {
  return {
    prompt: runParams.prompt!,
    ...optional("systemMessage", runParams.system ?? config.system),
    ...optional("temperature", runParams.temperature ?? config.temperature),
    ...optional("maxTokens", runParams.maxTokens ?? config.maxTokens),
    ...optional("topP", runParams.topP ?? config.topP),
    ...optional(
      "frequencyPenalty",
      runParams.frequencyPenalty ?? config.frequencyPenalty,
    ),
    ...optional(
      "presencePenalty",
      runParams.presencePenalty ?? config.presencePenalty,
    ),
    ...optional("stopSequences", runParams.stopSequences ?? config.stopSequences),
    ...optional("responseFormat", runParams.responseFormat ?? config.responseFormat),
    ...optional("reasoning", runParams.reasoning ?? config.reasoning),
    ...optional("signal", runParams.signal),
  };
}

function optional<T extends string, V>(
  key: T,
  value: V | undefined,
): { [K in T]: V } | Record<string, never> {
  return value === undefined ? {} : ({ [key]: value } as { [K in T]: V });
}
