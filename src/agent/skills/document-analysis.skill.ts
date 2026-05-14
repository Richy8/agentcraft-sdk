import { FileSystemAdapter } from '../adapters/index.js';
import { createBuiltInSkill, SKILL_SPECS } from './catalog.js';

export class DocumentAnalysisSkill {
  static readonly skillName = 'document-analysis';

  static create() {
    return createBuiltInSkill(SKILL_SPECS['document-analysis'], { dependsOn: [FileSystemAdapter] });
  }
}
