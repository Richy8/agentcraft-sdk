import { FileSystemAdapter, TavilySearchAdapter } from '../adapters/index.js';
import { createBuiltInSkill, SKILL_SPECS } from './catalog.js';

export class DeepResearchSkill {
  static readonly skillName = 'deep-research';

  static create() {
    return createBuiltInSkill(SKILL_SPECS['deep-research'], { dependsOn: [TavilySearchAdapter, FileSystemAdapter] });
  }
}
