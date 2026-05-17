import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

export interface MemoryFreshness {
  readonly stale: boolean;
  readonly ageMs: number;
  readonly staleAfterMs?: number;
  readonly checkedAt: string;
}

export interface BrandVoiceProfile {
  readonly id: string;
  readonly tone?: string;
  readonly preferredPhrases?: readonly string[];
  readonly bannedPhrases?: readonly string[];
  readonly examples?: readonly string[];
  readonly updatedAt: string;
  readonly freshness?: MemoryFreshness;
}

export interface CorpusDocument {
  readonly id: string;
  readonly text: string;
  readonly tags: readonly string[];
  readonly source?: string;
  readonly updatedAt: string;
  readonly freshness?: MemoryFreshness;
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
  summarizeContext?(options?: MemorySummaryOptions): Promise<string>;
}

export interface CreatorMemoryWriteApprovalRequest {
  readonly operation: 'brand-voice.upsert' | 'corpus.add';
  readonly id: string;
  readonly preview: string;
}

export interface FileSystemCreatorMemoryStoreOptions {
  readonly root?: string;
  readonly staleAfterMs?: number;
  readonly requireWriteApproval?: boolean;
  readonly approveWrite?: (request: CreatorMemoryWriteApprovalRequest) => boolean | Promise<boolean>;
  readonly redactSensitive?: boolean;
}

export interface MemorySummaryOptions {
  readonly brandVoiceId?: string;
  readonly query?: string;
  readonly tags?: readonly string[];
  readonly corpusLimit?: number;
  readonly maxChars?: number;
  readonly includeStaleWarnings?: boolean;
}

interface CorpusDocumentRecord extends CorpusDocument {
  readonly vector: Record<string, number>;
}

export class FileSystemCreatorMemoryStore implements CreatorMemoryStore {
  readonly root: string;
  private readonly staleAfterMs: number | undefined;
  private readonly requireWriteApproval: boolean;
  private readonly approveWrite:
    | ((request: CreatorMemoryWriteApprovalRequest) => boolean | Promise<boolean>)
    | undefined;
  private readonly redactSensitive: boolean;

  constructor(rootOrOptions: string | FileSystemCreatorMemoryStoreOptions = 'content/memory') {
    const options =
      typeof rootOrOptions === 'string' ? { root: rootOrOptions } : rootOrOptions;
    this.root = path.resolve(options.root ?? 'content/memory');
    this.staleAfterMs = options.staleAfterMs;
    this.requireWriteApproval = options.requireWriteApproval ?? false;
    this.approveWrite = options.approveWrite;
    this.redactSensitive = options.redactSensitive ?? true;
  }

  async upsertBrandVoice(profile: Omit<BrandVoiceProfile, 'updatedAt'>): Promise<BrandVoiceProfile> {
    this.assertMemorySafe(profile);
    await this.requireApproval({
      operation: 'brand-voice.upsert',
      id: profile.id,
      preview: compactPreview([profile.tone, ...(profile.preferredPhrases ?? []), ...(profile.examples ?? [])].join(' ')),
    });
    const record = {
      ...profile,
      id: safeId(profile.id),
      updatedAt: new Date().toISOString(),
    };
    await this.writeJson(this.pathFor('brand-voice', `${record.id}.json`), record);
    return record;
  }

  async readBrandVoice(id = 'default'): Promise<BrandVoiceProfile | undefined> {
    const record = await this.readJson<BrandVoiceProfile>(this.pathFor('brand-voice', `${safeId(id)}.json`));
    return record ? withFreshness(record, this.staleAfterMs) : undefined;
  }

  async addCorpusDocument(document: Omit<CorpusDocument, 'updatedAt'>): Promise<CorpusDocument> {
    this.assertMemorySafe(document);
    await this.requireApproval({
      operation: 'corpus.add',
      id: document.id,
      preview: compactPreview(document.text),
    });
    const record: CorpusDocumentRecord = {
      ...document,
      id: safeId(document.id),
      tags: [...document.tags],
      updatedAt: new Date().toISOString(),
      vector: vectorize([document.text, ...document.tags].join(' ')),
    };
    await this.writeJson(this.pathFor('corpus', `${record.id}.json`), record);
    const { vector: _vector, ...publicRecord } = record;
    return withFreshness(publicRecord, this.staleAfterMs);
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

  async summarizeContext(options: MemorySummaryOptions = {}): Promise<string> {
    const maxChars = options.maxChars ?? 1400;
    const brand = await this.readBrandVoice(options.brandVoiceId);
    const corpus =
      options.query !== undefined
        ? await this.searchCorpus(options.query, {
            limit: options.corpusLimit ?? 3,
            ...(options.tags !== undefined && { tags: options.tags }),
          })
        : [];
    const lines = [
      '# Creator Memory Context',
      brand ? `Brand voice: ${summarizeBrandVoice(brand)}` : undefined,
      brand?.freshness?.stale && options.includeStaleWarnings !== false
        ? `Memory warning: brand voice '${brand.id}' is stale.`
        : undefined,
      corpus.length > 0 ? 'Relevant corpus:' : undefined,
      ...corpus.map((item) => `- ${item.id}: ${compactPreview(item.text, 180)}${item.source ? ` (${item.source})` : ''}`),
    ].filter((line): line is string => line !== undefined && line.trim().length > 0);
    return truncate(lines.join('\n'), maxChars);
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

  private async requireApproval(request: CreatorMemoryWriteApprovalRequest): Promise<void> {
    if (!this.requireWriteApproval) return;
    const approved = await this.approveWrite?.(request);
    if (approved !== true) {
      throw new Error(`CreatorMemoryStore: write '${request.operation}' for '${request.id}' requires approval`);
    }
  }

  private assertMemorySafe(value: unknown): void {
    if (!this.redactSensitive) return;
    const serialized = JSON.stringify(value);
    if (containsSensitiveMaterial(serialized)) {
      throw new Error('CreatorMemoryStore: refusing to store likely secret or sensitive personal data');
    }
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

function withFreshness<T extends { readonly updatedAt: string }>(
  record: T,
  staleAfterMs: number | undefined,
): T & { readonly freshness: MemoryFreshness } {
  const checkedAt = new Date();
  const updatedAt = new Date(record.updatedAt);
  const ageMs = Number.isNaN(updatedAt.getTime()) ? Number.POSITIVE_INFINITY : checkedAt.getTime() - updatedAt.getTime();
  return {
    ...record,
    freshness: {
      stale: staleAfterMs !== undefined && ageMs > staleAfterMs,
      ageMs,
      ...(staleAfterMs !== undefined && { staleAfterMs }),
      checkedAt: checkedAt.toISOString(),
    },
  };
}

function summarizeBrandVoice(profile: BrandVoiceProfile): string {
  const parts = [
    profile.tone ? `tone=${profile.tone}` : undefined,
    profile.preferredPhrases?.length ? `prefer=${profile.preferredPhrases.slice(0, 5).join(', ')}` : undefined,
    profile.bannedPhrases?.length ? `avoid=${profile.bannedPhrases.slice(0, 5).join(', ')}` : undefined,
    profile.examples?.length ? `example=${compactPreview(profile.examples[0]!, 160)}` : undefined,
  ].filter((part): part is string => part !== undefined);
  return parts.join('; ') || `id=${profile.id}`;
}

function compactPreview(value: string, maxChars = 220): string {
  return truncate(value.replace(/\s+/g, ' ').trim(), maxChars);
}

function truncate(value: string, maxChars: number): string {
  return value.length > maxChars ? `${value.slice(0, Math.max(0, maxChars - 1))}…` : value;
}

function containsSensitiveMaterial(value: string): boolean {
  return /(?:sk-[a-zA-Z0-9_-]{16,}|api[_-]?key|secret|password|ssn|social security|\b\d{3}-\d{2}-\d{4}\b)/i.test(value);
}
