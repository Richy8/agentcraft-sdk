import { ArtifactRegistry } from '../artifact-registry/index.js';
import type { ArtifactFilter, ArtifactStore } from './types.js';

export type ArtifactTypeName = ReturnType<typeof ArtifactRegistry.list>[number];

export interface TypedArtifactStoreHelper<T> {
  readonly type: string;
  put(artifact: T): Promise<string>;
  get(id: string): Promise<T | undefined>;
  query(filter?: ArtifactFilter): Promise<T[]>;
  update(id: string, patch: Partial<T>): Promise<void>;
}

export function createArtifactTypeHelper<T = unknown>(
  store: ArtifactStore,
  type: string,
): TypedArtifactStoreHelper<T> {
  return {
    type,
    async put(artifact: T): Promise<string> {
      return await store.put(type, artifact);
    },
    async get(id: string): Promise<T | undefined> {
      return (await store.get(type, id)) as T | undefined;
    },
    async query(filter?: ArtifactFilter): Promise<T[]> {
      return (await store.query(type, filter)) as T[];
    },
    async update(id: string, patch: Partial<T>): Promise<void> {
      await store.updateByType(type, id, patch);
    },
  };
}

export function createRegisteredArtifactHelper<TName extends string>(
  store: ArtifactStore,
  type: TName,
): TypedArtifactStoreHelper<unknown> {
  if (!ArtifactRegistry.lookup(type)) {
    throw new Error(`ArtifactStore: artifact type '${type}' is not registered`);
  }
  return createArtifactTypeHelper(store, type);
}
