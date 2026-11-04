import { z } from "zod";

type AnyZodSchema = z.ZodTypeAny;

const registry = new Map<string, AnyZodSchema>();

export const ArtifactRegistry = {
  register(name: string, schema: AnyZodSchema): void {
    if (registry.has(name)) {
      throw new Error(
        `ArtifactRegistry: schema '${name}' is already registered. Use a unique name for custom artifact types.`,
      );
    }
    registry.set(name, schema);
  },

  lookup(name: string): AnyZodSchema | undefined {
    return registry.get(name);
  },

  list(): string[] {
    return [...registry.keys()];
  },

  deregister(name: string): boolean {
    return registry.delete(name);
  },
} as const;
