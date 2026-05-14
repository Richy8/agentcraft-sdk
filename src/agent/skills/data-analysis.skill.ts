import { DatabaseAdapter, FileSystemAdapter, SupabaseAdapter } from '../adapters/index.js';
import { createBuiltInSkill, SKILL_SPECS } from './catalog.js';

export class DataAnalysisSkill {
  static readonly skillName = 'data-analysis';

  static create() {
    return createBuiltInSkill(SKILL_SPECS['data-analysis'], { dependsOn: [[FileSystemAdapter, DatabaseAdapter, SupabaseAdapter]] });
  }
}
