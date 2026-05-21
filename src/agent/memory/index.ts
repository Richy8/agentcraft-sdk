/**
 * Agent memory facade.
 *
 * `AgentMemory` is the stable public factory for local, delegated, and vector
 * semantic memory stores. Store implementations, embedding providers,
 * formatting helpers, and vector client operations live in focused modules so
 * the facade stays small as memory backends grow.
 */
import {
  customEmbeddingProvider,
  lexicalEmbeddingProvider,
  openAIEmbeddingProvider,
} from "./embeddings.js";
import { formatMemoryContext } from "./formatting.js";
import { DelegatingMemoryStore } from "./stores/delegating-store.js";
import { LocalAgentMemoryStore } from "./stores/local-store.js";
import { VectorAgentMemoryStore } from "./stores/vector-store.js";
import type {
  AgentMemoryStore,
  CustomEmbeddingOptions,
  EmbeddingProvider,
  LocalAgentMemoryOptions,
  MemoryRetrievalOptions,
  OpenAIEmbeddingOptions,
  SemanticMemorySearchResult,
  VectorAgentMemoryOptions,
} from "./types.js";

export type {
  AgentMemoryAddInput,
  AgentMemoryConfig,
  AgentMemoryStore,
  AgentMemoryWriteOptions,
  CustomEmbeddingOptions,
  CustomVectorMemoryOptions,
  EmbeddingProvider,
  LocalAgentMemoryOptions,
  MemoryEmbedding,
  MemoryRetrievalOptions,
  MemoryWriteApprovalRequest,
  OpenAIEmbeddingOptions,
  PineconeClientLike,
  PineconeMemoryOptions,
  QdrantClientLike,
  QdrantMemoryOptions,
  SemanticMemoryRecord,
  SemanticMemorySearchResult,
  SupabaseMemoryClientLike,
  SupabaseMemoryOptions,
  VectorAgentMemoryOptions,
} from "./types.js";

export const AgentMemory = {
  local(options: LocalAgentMemoryOptions = {}): AgentMemoryStore {
    return new LocalAgentMemoryStore(options);
  },

  vector(options: VectorAgentMemoryOptions): AgentMemoryStore {
    if (options.provider === "custom") return new DelegatingMemoryStore(options.store);
    return new VectorAgentMemoryStore(options);
  },

  custom(store: AgentMemoryStore): AgentMemoryStore {
    return new DelegatingMemoryStore(store);
  },

  embeddings: {
    lexical(): EmbeddingProvider {
      return lexicalEmbeddingProvider();
    },

    openAI(options: OpenAIEmbeddingOptions = {}): EmbeddingProvider {
      return openAIEmbeddingProvider(options);
    },

    custom(options: CustomEmbeddingOptions): EmbeddingProvider {
      return customEmbeddingProvider(options);
    },
  },

  formatContext(results: readonly SemanticMemorySearchResult[], options?: MemoryRetrievalOptions): string {
    return formatMemoryContext(results, options);
  },
} as const;
