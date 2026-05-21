import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import * as path from "node:path";
import { redactSecrets } from "../../adapters/tool-policy.js";
import type { AgentEventEmitter } from "../../events.js";
import { lexicalEmbeddingProvider } from "../embeddings.js";
import { boundResults, formatMemoryContext } from "../formatting.js";
import { clampPositiveInt, isRecord, safePathSegment } from "../shared.js";
import { similarity } from "../similarity.js";
import { compactPreview, containsSensitiveMaterial } from "../text-utils.js";
import type {
  AgentMemoryAddInput,
  AgentMemoryConfig,
  AgentMemoryStore,
  AgentMemoryWriteOptions,
  EmbeddingProvider,
  LocalAgentMemoryOptions,
  MemoryEmbedding,
  MemoryRetrievalOptions,
  MemoryWriteApprovalRequest,
  SemanticMemoryRecord,
  SemanticMemorySearchResult,
} from "../types.js";

interface StoredSemanticMemoryRecord extends SemanticMemoryRecord {
  readonly embedding: MemoryEmbedding;
}

export class LocalAgentMemoryStore implements AgentMemoryStore {
  readonly namespace: string;
  private readonly root: string;
  private readonly embeddings: EmbeddingProvider;
  private readonly config: AgentMemoryConfig;
  private events: AgentEventEmitter | undefined;

  constructor(options: LocalAgentMemoryOptions = {}) {
    this.namespace = safePathSegment(options.namespace ?? "default");
    this.root = path.resolve(options.root ?? ".agentcraft/memory");
    this.embeddings = options.embeddings ?? lexicalEmbeddingProvider();
    this.config = options;
  }

  setEventEmitter(events: AgentEventEmitter | undefined): void {
    this.events = events;
  }

  async add(
    input: AgentMemoryAddInput,
    options: AgentMemoryWriteOptions = {},
  ): Promise<SemanticMemoryRecord> {
    const scope = safePathSegment(input.scope ?? this.config.defaultScope ?? "default");
    const id = safePathSegment(input.id ?? randomUUID());
    try {
      await this.assertWriteAllowed(input, options, "memory.add");
      const now = new Date().toISOString();
      const record: StoredSemanticMemoryRecord = {
        id,
        scope,
        text: input.text,
        ...(input.metadata !== undefined && { metadata: input.metadata }),
        ...(input.source !== undefined && { source: input.source }),
        createdAt: now,
        updatedAt: now,
        ...(this.embeddings.model !== undefined && { embeddingModel: this.embeddings.model }),
        embedding: await this.embeddings.embed(input.text),
      };
      const records = await this.readRecords();
      await this.writeRecords([...records.filter((item) => item.id !== id), record]);
      this.events?.emit("memory.write", {
        id,
        scope,
        operation: "add",
        ...(input.source !== undefined && { source: input.source }),
      });
      return publicRecord(record);
    } catch (error) {
      this.emitBlocked(error, input.text, scope, "write");
      throw error;
    }
  }

  async search(
    query: string,
    options: MemoryRetrievalOptions = {},
  ): Promise<SemanticMemorySearchResult[]> {
    const topK = clampPositiveInt(options.topK ?? this.config.retrieval?.topK ?? 4, 1, 20);
    const minScore = options.minScore ?? this.config.retrieval?.minScore ?? 0.05;
    const scopes = new Set(options.scopes?.map(safePathSegment) ?? []);
    const queryEmbedding = await this.embeddings.embed(query);
    const results = (await this.readRecords())
      .filter((record) => scopes.size === 0 || scopes.has(record.scope))
      .map((record) => ({
        ...publicRecord(record),
        score: similarity(queryEmbedding, record.embedding),
      }))
      .filter((record) => record.score >= minScore)
      .sort((left, right) => right.score - left.score || left.id.localeCompare(right.id))
      .slice(0, topK);

    this.events?.emit("memory.read", {
      query: compactPreview(query),
      scopes: [...scopes],
      count: results.length,
      maxContextChars: options.maxContextChars ?? this.config.maxContextChars ?? 1800,
    });
    return boundResults(results, options.maxContextChars ?? this.config.maxContextChars ?? 1800);
  }

  async summarize(query: string, options: MemoryRetrievalOptions = {}): Promise<string> {
    return formatMemoryContext(await this.search(query, options), {
      maxContextChars: options.maxContextChars ?? this.config.maxContextChars ?? 1800,
      includeSources: options.includeSources ?? this.config.retrieval?.includeSources ?? true,
    });
  }

  async delete(id: string, options: AgentMemoryWriteOptions = {}): Promise<boolean> {
    const safeId = safePathSegment(id);
    const records = await this.readRecords();
    const existing = records.find((record) => record.id === safeId);
    if (!existing) return false;
    try {
      await this.assertWriteAllowed(existing, options, "memory.delete");
      await this.writeRecords(records.filter((record) => record.id !== safeId));
      this.events?.emit("memory.delete", { id: safeId, scope: existing.scope });
      return true;
    } catch (error) {
      this.emitBlocked(error, existing.text, existing.scope, "delete");
      throw error;
    }
  }

  private async readRecords(): Promise<StoredSemanticMemoryRecord[]> {
    try {
      const parsed = JSON.parse(await readFile(this.filePath(), "utf8")) as unknown;
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isStoredRecord);
    } catch {
      return [];
    }
  }

  private async writeRecords(records: readonly StoredSemanticMemoryRecord[]): Promise<void> {
    await mkdir(path.dirname(this.filePath()), { recursive: true });
    await writeFile(this.filePath(), `${JSON.stringify(records, null, 2)}\n`, "utf8");
  }

  private filePath(): string {
    const resolved = path.resolve(this.root, this.namespace, "records.json");
    if (!resolved.startsWith(`${this.root}${path.sep}`)) {
      throw new Error("AgentMemory.local: path escapes configured root");
    }
    return resolved;
  }

  private async assertWriteAllowed(
    input: Pick<AgentMemoryAddInput, "id" | "scope" | "text" | "source">,
    options: AgentMemoryWriteOptions,
    operation: MemoryWriteApprovalRequest["operation"],
  ): Promise<void> {
    const writes = this.config.writes;
    if (writes?.redactSensitive !== false && containsSensitiveMaterial(input.text)) {
      throw new Error("AgentMemory: refusing to store likely secret or sensitive personal data");
    }
    const requireApproval = writes?.requireApproval ?? true;
    if (!requireApproval || options.approved === true) return;
    const request: MemoryWriteApprovalRequest = {
      operation,
      ...(input.id !== undefined && { id: input.id }),
      ...(input.scope !== undefined && { scope: input.scope }),
      preview: compactPreview(input.text),
      ...(input.source !== undefined && { source: input.source }),
    };
    const approved = await writes?.approveWrite?.(request);
    if (approved === true) return;
    throw new Error(`AgentMemory: durable ${operation} requires approval`);
  }

  private emitBlocked(error: unknown, text: string, scope: string, operation: "write" | "delete"): void {
    this.events?.emit("memory.blocked", {
      operation,
      scope,
      reason: error instanceof Error ? error.message : "memory operation blocked",
      preview: compactPreview(redactSecrets(text) as string),
    });
  }
}

function publicRecord(record: StoredSemanticMemoryRecord): SemanticMemoryRecord {
  const { embedding: _embedding, ...rest } = record;
  return rest;
}

function isStoredRecord(value: unknown): value is StoredSemanticMemoryRecord {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === "string" &&
    typeof value.scope === "string" &&
    typeof value.text === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string" &&
    (Array.isArray(value.embedding) || isRecord(value.embedding))
  );
}
