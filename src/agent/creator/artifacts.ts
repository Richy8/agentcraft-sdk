import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import type { CreatorArtifact } from './types.js';
import { CreatorArtifactSchema } from './types.js';

export class FileSystemCreatorArtifactStore {
  readonly root: string;

  constructor(root = 'content/artifacts') {
    this.root = path.resolve(root);
  }

  async save(artifact: CreatorArtifact): Promise<string> {
    CreatorArtifactSchema.parse(artifact);
    const filePath = this.resolveArtifactPath(artifact.type, `${artifact.id}.json`);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    return filePath;
  }

  async load(type: string, id: string): Promise<CreatorArtifact> {
    const filePath = this.resolveArtifactPath(type, `${id}.json`);
    const raw = await readFile(filePath, 'utf8');
    return CreatorArtifactSchema.parse(JSON.parse(raw));
  }

  resolveArtifactPath(type: string, filename: string): string {
    if (!/^[a-zA-Z0-9_-]+$/.test(type)) throw new Error(`Invalid artifact type '${type}'`);
    if (!/^[a-zA-Z0-9_.-]+$/.test(filename)) throw new Error(`Invalid artifact filename '${filename}'`);
    const resolved = path.resolve(this.root, type, filename);
    if (!resolved.startsWith(`${this.root}${path.sep}`)) {
      throw new Error('Artifact path escapes configured root');
    }
    return resolved;
  }
}

export function createArtifactBase(input: {
  id: string;
  type: string;
  sourceSkill: string;
  inputs?: string[];
}): CreatorArtifact {
  return {
    id: input.id,
    type: input.type,
    createdAt: new Date().toISOString(),
    sourceSkill: input.sourceSkill,
    provenance: [{ kind: 'model', ref: input.sourceSkill }],
    inputs: input.inputs ?? [],
    status: 'draft',
  };
}
