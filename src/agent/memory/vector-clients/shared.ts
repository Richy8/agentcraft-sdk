import { randomUUID } from "node:crypto";
import { isRecord, redactUrl, requiredUrl } from "../shared.js";
import type {
  CustomVectorMemoryOptions,
  MemoryRetrievalOptions,
  SemanticMemoryRecord,
  SemanticMemorySearchResult,
  VectorAgentMemoryOptions,
} from "../types.js";

type BuiltInVectorMemoryOptions = Exclude<VectorAgentMemoryOptions, CustomVectorMemoryOptions>;

export async function vectorUpsert(
  options: BuiltInVectorMemoryOptions,
  record: SemanticMemoryRecord,
  embedding: readonly number[],
): Promise<void> {
  if (options.provider === "qdrant") {
    const payload = { points: [{ id: record.id, vector: embedding, payload: record }] };
    if (options.client) {
      await options.client.upsert(options.collection, payload);
      return;
    }
    await fetchJson(`${requiredUrl(options, "qdrant")}/collections/${options.collection}/points?wait=true`, {
      method: "PUT",
      apiKey: options.apiKey,
      body: payload,
    });
    return;
  }
  if (options.provider === "pinecone") {
    const payload = {
      vectors: [{ id: record.id, values: embedding, metadata: record }],
      namespace: options.namespace,
    };
    if (options.client) {
      await options.client.upsert(payload);
      return;
    }
    await fetchJson(`${requiredUrl(options, "pinecone")}/vectors/upsert`, {
      method: "POST",
      apiKey: options.apiKey,
      body: payload,
    });
    return;
  }
  const table = options.table ?? "agentcraft_memory";
  const payload = { ...record, embedding };
  if (options.client) {
    await options.client.upsert(table, payload);
    return;
  }
  await fetchJson(`${requiredUrl(options, "supabase")}/rest/v1/${table}`, {
    method: "POST",
    apiKey: options.apiKey,
    body: payload,
    headers: { prefer: "resolution=merge-duplicates" },
  });
}

export async function vectorSearch(
  options: BuiltInVectorMemoryOptions,
  embedding: readonly number[],
  retrieval: MemoryRetrievalOptions & { readonly topK: number; readonly minScore: number },
): Promise<SemanticMemorySearchResult[]> {
  if (options.provider === "qdrant") {
    const payload = {
      vector: embedding,
      limit: retrieval.topK,
      score_threshold: retrieval.minScore,
      with_payload: true,
      ...(retrieval.scopes?.length && {
        filter: { must: [{ key: "scope", match: { any: retrieval.scopes } }] },
      }),
    };
    const raw = options.client
      ? await options.client.search(options.collection, payload)
      : await fetchJson(`${requiredUrl(options, "qdrant")}/collections/${options.collection}/points/search`, {
          method: "POST",
          apiKey: options.apiKey,
          body: payload,
        });
    return parseVectorResults(raw, retrieval.topK);
  }
  if (options.provider === "pinecone") {
    const payload = {
      vector: embedding,
      topK: retrieval.topK,
      includeMetadata: true,
      namespace: options.namespace,
      ...(retrieval.scopes?.length && { filter: { scope: { $in: retrieval.scopes } } }),
    };
    const raw = options.client
      ? await options.client.query(payload)
      : await fetchJson(`${requiredUrl(options, "pinecone")}/query`, {
          method: "POST",
          apiKey: options.apiKey,
          body: payload,
        });
    return parseVectorResults(raw, retrieval.topK).filter((item) => item.score >= retrieval.minScore);
  }
  const rpc = options.searchRpc ?? "match_agentcraft_memory";
  const payload = {
    query_embedding: embedding,
    match_count: retrieval.topK,
    min_score: retrieval.minScore,
    scopes: retrieval.scopes ?? [],
  };
  const raw = options.client
    ? await options.client.search(rpc, payload)
    : await fetchJson(`${requiredUrl(options, "supabase")}/rest/v1/rpc/${rpc}`, {
        method: "POST",
        apiKey: options.apiKey,
        body: payload,
      });
  return parseVectorResults(raw, retrieval.topK);
}

export async function vectorDelete(
  options: BuiltInVectorMemoryOptions,
  id: string,
): Promise<void> {
  if (options.provider === "qdrant") {
    const payload = { points: [id] };
    if (options.client) {
      await options.client.delete(options.collection, payload);
      return;
    }
    await fetchJson(`${requiredUrl(options, "qdrant")}/collections/${options.collection}/points/delete?wait=true`, {
      method: "POST",
      apiKey: options.apiKey,
      body: payload,
    });
    return;
  }
  if (options.provider === "pinecone") {
    const payload = { ids: [id], namespace: options.namespace };
    if (options.client) {
      await options.client.deleteMany(payload);
      return;
    }
    await fetchJson(`${requiredUrl(options, "pinecone")}/vectors/delete`, {
      method: "POST",
      apiKey: options.apiKey,
      body: payload,
    });
    return;
  }
  const table = options.table ?? "agentcraft_memory";
  if (options.client) {
    await options.client.delete(table, id);
    return;
  }
  await fetchJson(`${requiredUrl(options, "supabase")}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    apiKey: options.apiKey,
  });
}

function parseVectorResults(raw: unknown, topK: number): SemanticMemorySearchResult[] {
  const candidates = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { result?: unknown[] }).result)
      ? (raw as { result: unknown[] }).result
      : Array.isArray((raw as { matches?: unknown[] }).matches)
        ? (raw as { matches: unknown[] }).matches
        : [];
  return candidates
    .map((item) => {
      const object = item as Record<string, unknown>;
      const payload = (object.payload ?? object.metadata ?? object) as Record<string, unknown>;
      if (typeof payload.text !== "string") return undefined;
      return {
        id: String(payload.id ?? object.id ?? randomUUID()),
        scope: String(payload.scope ?? "default"),
        text: payload.text,
        ...(isRecord(payload.metadata) && { metadata: payload.metadata }),
        ...(typeof payload.source === "string" && { source: payload.source }),
        createdAt: String(payload.createdAt ?? new Date().toISOString()),
        updatedAt: String(payload.updatedAt ?? payload.createdAt ?? new Date().toISOString()),
        ...(typeof payload.embeddingModel === "string" && { embeddingModel: payload.embeddingModel }),
        score: Number(object.score ?? object.similarity ?? payload.score ?? 0),
      } satisfies SemanticMemorySearchResult;
    })
    .filter((item): item is SemanticMemorySearchResult => item !== undefined)
    .slice(0, topK);
}

async function fetchJson(
  url: string,
  options: {
    readonly method: string;
    readonly apiKey?: string | undefined;
    readonly body?: unknown;
    readonly headers?: Record<string, string>;
  },
): Promise<unknown> {
  const response = await fetch(url, {
    method: options.method,
    headers: {
      ...(options.apiKey !== undefined && {
        authorization: `Bearer ${options.apiKey}`,
        apiKey: options.apiKey,
      }),
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
    ...(options.body !== undefined && { body: JSON.stringify(options.body) }),
  });
  if (!response.ok) {
    throw new Error(`AgentMemory.vector: request failed (${response.status}) for ${redactUrl(url)}`);
  }
  if (response.status === 204) return {};
  return (await response.json()) as unknown;
}
