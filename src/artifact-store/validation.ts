import { ArtifactRegistry } from '../artifact-registry/index.js';

export interface ArtifactValidationOptions {
  readonly validateSchemas?: boolean;
}

export function validateArtifactForStore(
  type: string,
  value: unknown,
  options: ArtifactValidationOptions | undefined,
): void {
  if (!options?.validateSchemas) return;
  const schema = ArtifactRegistry.lookup(type);
  if (!schema) return;
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new Error(
      `ArtifactStore: artifact '${type}' failed schema validation - ${result.error.message}`,
    );
  }
}
