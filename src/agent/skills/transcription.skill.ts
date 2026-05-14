import { createBuiltInSkill, SKILL_SPECS } from './catalog.js';

export class TranscriptionSkill {
  static readonly skillName = 'transcription';

  static create() {
    return createBuiltInSkill(SKILL_SPECS.transcription);
  }
}
