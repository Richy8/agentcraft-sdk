/** Query filters supported by ArtifactStore implementations. */
export interface ArtifactFilter {
  readonly status?: string;
  readonly createdAfter?: string;
  readonly createdBefore?: string;
  readonly limit?: number;
}

/** Typed reference to a stored artifact. */
export interface ArtifactRef {
  readonly type: string;
  readonly id: string;
}

/** One stored artifact revision snapshot. */
export interface ArtifactHistory {
  readonly id: string;
  readonly type: string;
  readonly changedAt: string;
  readonly snapshot: unknown;
}

/** Durable persistence interface for structured artifacts. */
export interface ArtifactStore {
  put(type: string, artifact: unknown): Promise<string>;
  get(type: string, id: string): Promise<unknown | undefined>;
  query(type: string, filter?: ArtifactFilter): Promise<unknown[]>;
  update(id: string, patch: unknown): Promise<void>;
  delete(type: string, id: string): Promise<boolean>;
  listTypes(): Promise<string[]>;
  history(type: string, id: string): Promise<ArtifactHistory[]>;
  link(source: ArtifactRef, target: ArtifactRef): Promise<void>;
}
