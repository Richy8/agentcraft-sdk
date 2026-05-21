import { formatMemoryContext } from "../formatting.js";
import type {
  AgentMemoryAddInput,
  AgentMemoryStore,
  AgentMemoryWriteOptions,
  MemoryRetrievalOptions,
  SemanticMemoryRecord,
  SemanticMemorySearchResult,
} from "../types.js";
import type { AgentEventEmitter } from "../../events.js";

export class DelegatingMemoryStore implements AgentMemoryStore {
  readonly namespace?: string;

  constructor(private readonly store: AgentMemoryStore) {
    if (store.namespace !== undefined) this.namespace = store.namespace;
  }

  setEventEmitter(events: AgentEventEmitter | undefined): void {
    this.store.setEventEmitter?.(events);
  }

  add(input: AgentMemoryAddInput, options?: AgentMemoryWriteOptions): Promise<SemanticMemoryRecord> {
    return this.store.add(input, options);
  }

  search(query: string, options?: MemoryRetrievalOptions): Promise<SemanticMemorySearchResult[]> {
    return this.store.search(query, options);
  }

  summarize(query: string, options?: MemoryRetrievalOptions): Promise<string> {
    if (this.store.summarize) return this.store.summarize(query, options);
    return this.store.search(query, options).then((results) => formatMemoryContext(results, options));
  }

  delete(id: string, options?: AgentMemoryWriteOptions): Promise<boolean> {
    return this.store.delete(id, options);
  }
}
