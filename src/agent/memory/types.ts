import type { AgentEventEmitter } from '../events.js';

export type MemoryEmbedding = readonly number[] | Readonly<Record<string, number>>;

export interface EmbeddingProvider {
  readonly name: string;
  readonly model?: string;
  embed(text: string): Promise<MemoryEmbedding>;
}

export interface AgentMemoryConfig {
  readonly namespace?: string;
  readonly defaultScope?: string;
  readonly maxContextChars?: number;
  readonly retrieval?: {
    readonly topK?: number;
    readonly minScore?: number;
    readonly includeSources?: boolean;
    readonly includeFreshnessWarnings?: boolean;
  };
  readonly writes?: {
    readonly requireApproval?: boolean;
    readonly redactSensitive?: boolean;
    readonly allowPII?: boolean;
    readonly approveWrite?: (request: MemoryWriteApprovalRequest) => boolean | Promise<boolean>;
  };
}

export interface MemoryWriteApprovalRequest {
  readonly operation: 'memory.add' | 'memory.delete';
  readonly id?: string;
  readonly scope?: string;
  readonly preview: string;
  readonly source?: string;
}

export interface SemanticMemoryRecord {
  readonly id: string;
  readonly scope: string;
  readonly text: string;
  readonly metadata?: Record<string, unknown>;
  readonly source?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly embeddingModel?: string;
}

export interface SemanticMemorySearchResult extends SemanticMemoryRecord {
  readonly score: number;
}

export interface MemoryRetrievalOptions {
  readonly query?: string;
  readonly scopes?: readonly string[];
  readonly topK?: number;
  readonly minScore?: number;
  readonly maxContextChars?: number;
  readonly includeSources?: boolean;
  readonly includeFreshnessWarnings?: boolean;
}

export interface AgentMemoryAddInput {
  readonly id?: string;
  readonly scope?: string;
  readonly text: string;
  readonly metadata?: Record<string, unknown>;
  readonly source?: string;
}

export interface AgentMemoryWriteOptions {
  readonly approved?: boolean;
  readonly reason?: string;
}

export interface AgentMemoryStore {
  readonly namespace?: string;
  add(input: AgentMemoryAddInput, options?: AgentMemoryWriteOptions): Promise<SemanticMemoryRecord>;
  search(query: string, options?: MemoryRetrievalOptions): Promise<SemanticMemorySearchResult[]>;
  summarize?(query: string, options?: MemoryRetrievalOptions): Promise<string>;
  delete(id: string, options?: AgentMemoryWriteOptions): Promise<boolean>;
  setEventEmitter?(events: AgentEventEmitter | undefined): void;
}

export interface LocalAgentMemoryOptions extends AgentMemoryConfig {
  readonly root?: string;
  readonly embeddings?: EmbeddingProvider;
}

export interface OpenAIEmbeddingOptions {
  readonly apiKey?: string;
  readonly model?: string;
  readonly baseUrl?: string;
  readonly dimensions?: number;
}

export interface CustomEmbeddingOptions {
  readonly name?: string;
  readonly model?: string;
  embed(text: string): MemoryEmbedding | Promise<MemoryEmbedding>;
}

export interface QdrantMemoryOptions extends AgentMemoryConfig {
  readonly provider: 'qdrant';
  readonly url?: string;
  readonly apiKey?: string;
  readonly collection: string;
  readonly embeddings: EmbeddingProvider;
  readonly client?: QdrantClientLike;
}

export interface PineconeMemoryOptions extends AgentMemoryConfig {
  readonly provider: 'pinecone';
  readonly url?: string;
  readonly apiKey?: string;
  readonly index: string;
  readonly namespace?: string;
  readonly embeddings: EmbeddingProvider;
  readonly client?: PineconeClientLike;
}

export interface SupabaseMemoryOptions extends AgentMemoryConfig {
  readonly provider: 'supabase';
  readonly url?: string;
  readonly apiKey?: string;
  readonly table?: string;
  readonly searchRpc?: string;
  readonly embeddings: EmbeddingProvider;
  readonly client?: SupabaseMemoryClientLike;
}

export interface CustomVectorMemoryOptions extends AgentMemoryConfig {
  readonly provider: 'custom';
  readonly store: AgentMemoryStore;
}

export type VectorAgentMemoryOptions =
  | QdrantMemoryOptions
  | PineconeMemoryOptions
  | SupabaseMemoryOptions
  | CustomVectorMemoryOptions;

export interface QdrantClientLike {
  upsert(collection: string, payload: unknown): Promise<unknown>;
  search(collection: string, payload: unknown): Promise<unknown>;
  delete(collection: string, payload: unknown): Promise<unknown>;
}

export interface PineconeClientLike {
  upsert(payload: unknown): Promise<unknown>;
  query(payload: unknown): Promise<unknown>;
  deleteMany(payload: unknown): Promise<unknown>;
}

export interface SupabaseMemoryClientLike {
  upsert(table: string, record: Record<string, unknown>): Promise<unknown>;
  search(rpc: string, payload: Record<string, unknown>): Promise<unknown>;
  delete(table: string, id: string): Promise<unknown>;
}
