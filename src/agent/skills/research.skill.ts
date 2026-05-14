import { FirecrawlAdapter, TavilySearchAdapter } from '../adapters/index.js';
import { createBuiltInSkill, SKILL_SPECS } from './catalog.js';

export class ResearchSkill {
  static readonly skillName = 'research';

  static create() {
    return createBuiltInSkill(SKILL_SPECS.research, { dependsOn: [[TavilySearchAdapter, FirecrawlAdapter]] });
  }
}
