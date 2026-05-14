import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

export interface BrandVoiceProfile {
  readonly id: string;
  readonly tone?: string;
  readonly preferredPhrases?: readonly string[];
  readonly bannedPhrases?: readonly string[];
  readonly examples?: readonly string[];
  readonly updatedAt: string;
}

export interface CorpusDocument {
  readonly id: string;
  readonly text: string;
  readonly tags: readonly string[];
  readonly source?: string;
  readonly updatedAt: string;
}

export interface CorpusSearchResult {
  readonly id: string;
  readonly text: string;
  readonly tags: readonly string[];
  readonly score: number;
  readonly source?: string;
}

export interface CreatorMemoryStore {
  upsertBrandVoice(profile: Omit<BrandVoiceProfile, 'updatedAt'>): Promise<BrandVoiceProfile>;
  readBrandVoice(id?: string): Promise<BrandVoiceProfile | undefined>;
  addCorpusDocument(document: Omit<CorpusDocument, 'updatedAt'>): Promise<CorpusDocument>;
  searchCorpus(query: string, options?: { readonly limit?: number; readonly tags?: readonly string[] }): Promise<CorpusSearchResult[]>;
}

interface CorpusDocumentRecord extends CorpusDocument {
  readonly vector: Record<string, number>;
}

export class FileSystemCreatorMemoryStore implements CreatorMemoryStore {
  readonly root: string;

  constructor(root = 'content/memory') {
    this.root = path.resolve(root);
  }

  async upsertBrandVoice(profile: Omit<BrandVoiceProfile, 'updatedAt'>): Promise<BrandVoiceProfile> {
    const record = {
      ...profile,
      id: safeId(profile.id),
      updatedAt: new Date().toISOString(),
    };
    await this.writeJson(this.pathFor('brand-voice', `${record.id}.json`), record);
    return record;
  }

  async readBrandVoice(id = 'default'): Promise<BrandVoiceProfile | undefined> {
    return await this.readJson<BrandVoiceProfile>(this.pathFor('brand-voice', `${safeId(id)}.json`));
  }

  async addCorpusDocument(document: Omit<CorpusDocument, 'updatedAt'>): Promise<CorpusDocument> {
    const record: CorpusDocumentRecord = {
      ...document,
      id: safeId(document.id),
      tags: [...document.tags],
      updatedAt: new Date().toISOString(),
      vector: vectorize([document.text, ...document.tags].join(' ')),
    };
    await this.writeJson(this.pathFor('corpus', `${record.id}.json`), record);
    const { vector: _vector, ...publicRecord } = record;
    return publicRecord;
  }

  async searchCorpus(
    query: string,
    options: { readonly limit?: number; readonly tags?: readonly string[] } = {}
  ): Promise<CorpusSearchResult[]> {
    const queryVector = vectorize(query);
    const records = await this.readCorpusRecords();
    const requiredTags = new Set(options.tags ?? []);
    return records
      .filter((record) => [...requiredTags].every((tag) => record.tags.includes(tag)))
      .map((record) => ({
        id: record.id,
        text: record.text,
        tags: record.tags,
        score: cosineSimilarity(queryVector, record.vector),
        ...(record.source !== undefined && { source: record.source }),
      }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
      .slice(0, options.limit ?? 5);
  }

  private async readCorpusRecords(): Promise<CorpusDocumentRecord[]> {
    try {
      const index = await this.readJson<string[]>(this.pathFor('corpus', 'index.json'));
      if (!index) return [];
      const records = await Promise.all(
        index.map((id) => this.readJson<CorpusDocumentRecord>(this.pathFor('corpus', `${safeId(id)}.json`)))
      );
      return records.filter((record): record is CorpusDocumentRecord => record !== undefined);
    } catch {
      return [];
    }
  }

  private async writeJson(filePath: string, value: unknown): Promise<void> {
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    if (path.basename(path.dirname(filePath)) === 'corpus' && path.basename(filePath) !== 'index.json') {
      await this.updateCorpusIndex(path.basename(filePath, '.json'));
    }
  }

  private async updateCorpusIndex(id: string): Promise<void> {
    const indexPath = this.pathFor('corpus', 'index.json');
    const current = (await this.readJson<string[]>(indexPath)) ?? [];
    const next = [...new Set([...current, id])].sort();
    await mkdir(path.dirname(indexPath), { recursive: true });
    await writeFile(indexPath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  }

  private async readJson<T>(filePath: string): Promise<T | undefined> {
    try {
      return JSON.parse(await readFile(filePath, 'utf8')) as T;
    } catch {
      return undefined;
    }
  }

  private pathFor(bucket: string, filename: string): string {
    const resolved = path.resolve(this.root, safeId(bucket), filename);
    if (!resolved.startsWith(`${this.root}${path.sep}`)) {
      throw new Error('Creator memory path escapes configured root');
    }
    return resolved;
  }
}

function safeId(value: string): string {
  if (!/^[a-zA-Z0-9_.-]+$/.test(value)) throw new Error(`Invalid creator memory id '${value}'`);
  return value;
}

function vectorize(text: string): Record<string, number> {
  const vector: Record<string, number> = {};
  for (const token of tokenize(text)) {
    vector[token] = (vector[token] ?? 0) + 1;
  }
  return vector;
}

function tokenize(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number {
  const aEntries = Object.entries(a);
  const bEntries = Object.entries(b);
  const bValues = new Map(bEntries);
  const dot = aEntries.reduce((sum, [key, value]) => sum + value * (bValues.get(key) ?? 0), 0);
  const aMagnitude = Math.sqrt(aEntries.reduce((sum, [, value]) => sum + value ** 2, 0));
  const bMagnitude = Math.sqrt(bEntries.reduce((sum, [, value]) => sum + value ** 2, 0));
  if (aMagnitude === 0 || bMagnitude === 0) return 0;
  return dot / (aMagnitude * bMagnitude);
}
