import type { ModelCapabilities } from '../types/provider.types.js';
import { MODEL_CATALOG } from './catalog.js';

export class ModelRegistry {
  private readonly catalog: Map<string, ModelCapabilities>;

  constructor(catalog: Record<string, ModelCapabilities>) {
    this.catalog = new Map(Object.entries(catalog));
  }

  getCapabilities(provider: string, modelId: string): ModelCapabilities {
    const exact = this.catalog.get(`${provider}:${modelId}`);
    if (exact) return exact;

    let best: { caps: ModelCapabilities; keyLen: number } | null = null;
    for (const [key, caps] of this.catalog) {
      if (!key.startsWith(`${provider}:`)) continue;
      const catalogModelId = key.slice(provider.length + 1);
      if (modelId.startsWith(catalogModelId) && catalogModelId.length > (best?.keyLen ?? 0)) {
        best = { caps, keyLen: catalogModelId.length };
      }
    }
    if (best) return best.caps;

    return this.catalog.get(`${provider}:__default__`) ?? this.catalog.get('__default__')!;
  }

  lookup(provider: string, modelId: string): ModelCapabilities {
    return this.getCapabilities(provider, modelId);
  }

  isKnown(provider: string, modelId: string): boolean {
    if (this.catalog.has(`${provider}:${modelId}`)) return true;
    return Array.from(this.catalog.keys()).some((key) => {
      if (!key.startsWith(`${provider}:`)) return false;
      const catalogModelId = key.slice(provider.length + 1);
      return catalogModelId !== '__default__' && modelId.startsWith(catalogModelId);
    });
  }

  listKnownModels(): string[] {
    return Array.from(this.catalog.keys()).filter((key) => key !== '__default__');
  }

  register(provider: string, modelId: string, capabilities: ModelCapabilities): void {
    this.catalog.set(`${provider}:${modelId}`, capabilities);
  }

  registerMany(models: Record<string, ModelCapabilities>): void {
    for (const [modelId, capabilities] of Object.entries(models)) {
      this.catalog.set(modelId, capabilities);
    }
  }
}

export const modelRegistry = new ModelRegistry(MODEL_CATALOG);
