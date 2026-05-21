import { randomUUID } from "node:crypto";
import type { AgentEventEmitter } from "../../events.js";
import { boundResults, formatMemoryContext } from "../formatting.js";
import { clampPositiveInt, redactedVectorConnection, safePathSegment } from "../shared.js";
import { denseEmbedding } from "../similarity.js";
import { compactPreview, containsSensitiveMaterial } from "../text-utils.js";
import type {
  AgentMemoryAddInput,
  AgentMemoryConfig,
  AgentMemoryStore,
  AgentMemoryWriteOptions,
  CustomVectorMemoryOptions,
  MemoryRetrievalOptions,
  MemoryWriteApprovalRequest,
  SemanticMemoryRecord,
  SemanticMemorySearchResult,
  VectorAgentMemoryOptions,
} from "../types.js";
import { vectorDelete, vectorSearch, vectorUpsert } from "../vector-clients/shared.js";

type BuiltInVectorMemoryOptions = Exclude<VectorAgentMemoryOptions, CustomVectorMemoryOptions>;

export class VectorAgentMemoryStore implements AgentMemoryStore {
  readonly namespace?: string;
  private events: AgentEventEmitter | undefined;

  constructor(private readonly options: BuiltInVectorMemoryOptions) {
    if (options.namespace !== undefined) this.namespace = options.namespace;
  }

  setEventEmitter(events: AgentEventEmitter | undefined): void {
    this.events = events;
  }

  async add(
    input: AgentMemoryAddInput,
    options: AgentMemoryWriteOptions = {},
  ): Promise<SemanticMemoryRecord> {
    await assertVectorWriteAllowed(this.options, input, options, "memory.add");
    const now = new Date().toISOString();
    const record: SemanticMemoryRecord = {
      id: safePathSegment(input.id ?? randomUUID()),
      scope: safePathSegment(input.scope ?? this.options.defaultScope ?? "default"),
      text: input.text,
      ...(input.metadata !== undefined && { metadata: input.metadata }),
      ...(input.source !== undefined && { source: input.source }),
      createdAt: now,
      updatedAt: now,
      ...(this.options.embeddings.model !== undefined && {
        embeddingModel: this.options.embeddings.model,
      }),
    };
    await vectorUpsert(this.options, record, denseEmbedding(await this.options.embeddings.embed(input.text)));
    const connection = redactedVectorConnection(this.options);
    this.events?.emit("memory.write", {
      id: record.id,
      scope: record.scope,
      operation: "add",
      provider: this.options.provider,
      ...(record.source !== undefined && { source: record.source }),
      ...(connection !== undefined && { connection }),
    });
    return record;
  }

  async search(
    query: string,
    options: MemoryRetrievalOptions = {},
  ): Promise<SemanticMemorySearchResult[]> {
    const topK = clampPositiveInt(options.topK ?? this.options.retrieval?.topK ?? 4, 1, 20);
    const results = await vectorSearch(
      this.options,
      denseEmbedding(await this.options.embeddings.embed(query)),
      {
        ...options,
        topK,
        minScore: options.minScore ?? this.options.retrieval?.minScore ?? 0,
      },
    );
    const connection = redactedVectorConnection(this.options);
    this.events?.emit("memory.read", {
      query: compactPreview(query),
      scopes: options.scopes ?? [],
      count: results.length,
      provider: this.options.provider,
      ...(connection !== undefined && { connection }),
    });
    return boundResults(results, options.maxContextChars ?? this.options.maxContextChars ?? 1800);
  }

  async summarize(query: string, options: MemoryRetrievalOptions = {}): Promise<string> {
    return formatMemoryContext(await this.search(query, options), {
      maxContextChars: options.maxContextChars ?? this.options.maxContextChars ?? 1800,
      includeSources: options.includeSources ?? this.options.retrieval?.includeSources ?? true,
    });
  }

  async delete(id: string, options: AgentMemoryWriteOptions = {}): Promise<boolean> {
    await assertVectorWriteAllowed(
      this.options,
      { id, text: `delete memory ${id}` },
      options,
      "memory.delete",
    );
    await vectorDelete(this.options, safePathSegment(id));
    const connection = redactedVectorConnection(this.options);
    this.events?.emit("memory.delete", {
      id: safePathSegment(id),
      provider: this.options.provider,
      ...(connection !== undefined && { connection }),
    });
    return true;
  }
}

async function assertVectorWriteAllowed(
  config: AgentMemoryConfig,
  input: Pick<AgentMemoryAddInput, "id" | "scope" | "text" | "source">,
  options: AgentMemoryWriteOptions,
  operation: MemoryWriteApprovalRequest["operation"],
): Promise<void> {
  if (config.writes?.redactSensitive !== false && containsSensitiveMaterial(input.text)) {
    throw new Error("AgentMemory: refusing to store likely secret or sensitive personal data");
  }
  const requireApproval = config.writes?.requireApproval ?? true;
  if (!requireApproval || options.approved === true) return;
  const approved = await config.writes?.approveWrite?.({
    operation,
    ...(input.id !== undefined && { id: input.id }),
    ...(input.scope !== undefined && { scope: input.scope }),
    preview: compactPreview(input.text),
    ...(input.source !== undefined && { source: input.source }),
  });
  if (approved === true) return;
  throw new Error(`AgentMemory: durable ${operation} requires approval`);
}
