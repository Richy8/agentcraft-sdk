import { MODEL_CATALOG } from "../model-registry/catalog.js";
import { modelRegistry } from "../model-registry/registry.js";
import { parseModelString } from "../types/model-parser.js";
import { estimateRunCost, type CostEstimate } from "./budgets.js";
import type { AgentRunParams, CatalogFilter, ModelInfo } from "./types.js";

export function inspectModel(model: string): ModelInfo {
  const { provider, modelId } = parseModelString(model);
  const caps = modelRegistry.lookup(provider, modelId);
  return {
    model: modelId,
    provider,
    capabilities: {
      contextWindow: caps.maxContextLength,
      maxOutput: caps.maxOutputTokens,
      vision: caps.supportsVision,
      audio: caps.supportsAudio,
      video: caps.supportsVideo,
      files: caps.supportsFiles,
      tools: caps.supportsTools,
      streaming: caps.supportsStreaming,
      jsonMode: caps.supportsJsonMode,
      reasoning: caps.supportsReasoning ?? false,
      ...(caps.reasoningEffortLevels !== undefined && { reasoningEffortLevels: caps.reasoningEffortLevels }),
      structuredOutput: caps.supportsStructuredOutput ?? false,
      parallelToolCalls: caps.supportsParallelToolCalls ?? false,
      supportsNativeWebSearch: caps.supportsNativeWebSearch ?? false,
      supportsNativeFileSearch: caps.supportsNativeFileSearch ?? false,
    },
    pricing: {
      inputPerM: caps.costPerMInputToken,
      outputPerM: caps.costPerMOutputToken,
      ...(caps.cachedInputDiscount !== undefined && {
        cachedDiscount: caps.cachedInputDiscount,
      }),
      ...(caps.costPerRequest !== undefined && {
        perRequest: caps.costPerRequest,
      }),
      ...(caps.pricingMetadata !== undefined && {
        currency: caps.pricingMetadata.currency,
        sourceUrl: caps.pricingMetadata.sourceUrl,
        updatedAt: caps.pricingMetadata.updatedAt,
        ...(caps.pricingMetadata.notes !== undefined && {
          notes: caps.pricingMetadata.notes,
        }),
      }),
    },
    scores: { quality: caps.qualityScore, speed: caps.speedScore },
    optimizedFor: [...caps.optimizedFor],
    deprecated: caps.deprecated ?? false,
    local: caps.costPerMInputToken === 0 && caps.costPerMOutputToken === 0,
  };
}

export function modelSupports(
  model: string,
  capability: keyof ModelInfo["capabilities"],
): boolean {
  return Boolean(inspectModel(model).capabilities[capability]);
}

export function listModelCatalog(filter?: CatalogFilter): ModelInfo[] {
  const all = Object.entries(MODEL_CATALOG)
    .filter(([key]) => key !== "__default__" && !key.endsWith(":__default__"))
    .map(([key]) => inspectModel(key));

  if (!filter) return all.filter((entry) => !entry.deprecated);

  return all.filter((entry) => {
    if (!filter.deprecated && entry.deprecated) return false;
    if (filter.provider && entry.provider !== filter.provider) return false;
    if (
      filter.optimizedFor &&
      !entry.optimizedFor.includes(filter.optimizedFor)
    ) {
      return false;
    }
    if (
      filter.minQuality !== undefined &&
      entry.scores.quality < filter.minQuality
    ) {
      return false;
    }
    if (filter.minSpeed !== undefined && entry.scores.speed < filter.minSpeed) {
      return false;
    }
    if (
      filter.vision !== undefined &&
      entry.capabilities.vision !== filter.vision
    ) {
      return false;
    }
    if (filter.audio !== undefined && entry.capabilities.audio !== filter.audio) {
      return false;
    }
    if (filter.tools !== undefined && entry.capabilities.tools !== filter.tools) {
      return false;
    }
    if (
      filter.streaming !== undefined &&
      entry.capabilities.streaming !== filter.streaming
    ) {
      return false;
    }
    return true;
  });
}

export function estimateModelRunCost(
  model: string,
  params: Pick<
    AgentRunParams,
    "prompt" | "system" | "maxTokens" | "tools" | "budget"
  >,
): CostEstimate {
  const { provider, modelId } = parseModelString(model);
  const caps = modelRegistry.lookup(provider, modelId);
  return estimateRunCost(params, caps, params.budget?.costOptions);
}
