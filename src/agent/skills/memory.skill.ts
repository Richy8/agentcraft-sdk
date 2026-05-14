import { PineconeAdapter, RedisAdapter } from '../adapters/index.js';
import { MemoryMCP, SupabaseMCP } from '../mcp-servers/index.js';
import { createBuiltInSkill, SKILL_SPECS } from './catalog.js';

export class MemorySkill {
  static readonly skillName = 'memory';

  static create() {
    return createBuiltInSkill(SKILL_SPECS.memory, { dependsOn: [[PineconeAdapter, RedisAdapter, SupabaseMCP, MemoryMCP]] });
  }
}
