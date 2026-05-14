import { mkdir, readFile, writeFile } from 'node:fs/promises';
import * as path from 'node:path';
import {
  ExperimentPlanSchema,
  PerformanceReportSchema,
  type CreatorArtifact,
} from './types.js';

export interface ExperimentResult {
  readonly id: string;
  readonly experimentPlanId: string;
  readonly metric: string;
  readonly baseline: number;
  readonly variant: number;
  readonly source: string;
  readonly observedAt: string;
  readonly decision: 'ship' | 'iterate' | 'stop' | 'inconclusive';
}

export interface AnalyticsHistorySnapshot {
  readonly performanceReports: readonly CreatorArtifact[];
  readonly experimentPlans: readonly CreatorArtifact[];
  readonly experimentResults: readonly ExperimentResult[];
}

export class FileSystemAnalyticsHistoryStore {
  readonly root: string;

  constructor(root = 'content/analytics-history') {
    this.root = path.resolve(root);
  }

  async savePerformanceReport(report: CreatorArtifact): Promise<CreatorArtifact> {
    const parsed = PerformanceReportSchema.parse(report);
    await this.writeRecord('performance', parsed.id, parsed);
    return parsed;
  }

  async saveExperimentPlan(plan: CreatorArtifact): Promise<CreatorArtifact> {
    const parsed = ExperimentPlanSchema.parse(plan);
    await this.writeRecord('experiments', parsed.id, parsed);
    return parsed;
  }

  async saveExperimentResult(result: Omit<ExperimentResult, 'observedAt'>): Promise<ExperimentResult> {
    const record: ExperimentResult = {
      ...result,
      id: safeId(result.id),
      experimentPlanId: safeId(result.experimentPlanId),
      observedAt: new Date().toISOString(),
    };
    await this.writeRecord('results', record.id, record);
    return record;
  }

  async snapshot(): Promise<AnalyticsHistorySnapshot> {
    return {
      performanceReports: await this.readBucket<CreatorArtifact>('performance'),
      experimentPlans: await this.readBucket<CreatorArtifact>('experiments'),
      experimentResults: await this.readBucket<ExperimentResult>('results'),
    };
  }

  async summarizeInsights(): Promise<string[]> {
    const snapshot = await this.snapshot();
    const recommendations = snapshot.performanceReports.flatMap((report) => {
      const maybeReport = PerformanceReportSchema.safeParse(report);
      return maybeReport.success ? maybeReport.data.recommendations : [];
    });
    const decisions = snapshot.experimentResults.map(
      (result) => `${result.metric}: ${result.decision} (${result.variant - result.baseline >= 0 ? '+' : ''}${result.variant - result.baseline})`
    );
    return [...recommendations, ...decisions];
  }

  private async writeRecord(bucket: string, id: string, value: unknown): Promise<void> {
    const safeBucket = safeId(bucket);
    const safeRecordId = safeId(id);
    const filePath = this.pathFor(safeBucket, `${safeRecordId}.json`);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await this.updateIndex(safeBucket, safeRecordId);
  }

  private async readBucket<T>(bucket: string): Promise<T[]> {
    const safeBucket = safeId(bucket);
    const index = (await this.readJson<string[]>(this.pathFor(safeBucket, 'index.json'))) ?? [];
    const records: T[] = [];
    for (const id of index) {
      const record = await this.readJson<T>(this.pathFor(safeBucket, `${safeId(id)}.json`));
      if (record !== undefined) records.push(record);
    }
    return records;
  }

  private async updateIndex(bucket: string, id: string): Promise<void> {
    const indexPath = this.pathFor(bucket, 'index.json');
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
    const resolved = path.resolve(this.root, bucket, filename);
    if (!resolved.startsWith(`${this.root}${path.sep}`)) {
      throw new Error('Analytics history path escapes configured root');
    }
    return resolved;
  }
}

function safeId(value: string): string {
  if (!/^[a-zA-Z0-9_.-]+$/.test(value)) throw new Error(`Invalid analytics history id '${value}'`);
  return value;
}
