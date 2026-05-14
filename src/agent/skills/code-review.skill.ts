import { FileSystemAdapter, GitHubAdapter } from '../adapters/index.js';
import { createBuiltInSkill, SKILL_SPECS } from './catalog.js';

export class CodeReviewSkill {
  static readonly skillName = 'code-review';

  static create() {
    return createBuiltInSkill(SKILL_SPECS['code-review'], { dependsOn: [[FileSystemAdapter, GitHubAdapter]] });
  }
}
