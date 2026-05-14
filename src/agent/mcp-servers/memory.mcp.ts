import type { AgentAdapter } from '../adapters/types.js';
import { stdioMcp } from './shared.js';

export const MemoryMCP = {
  adapterName: 'memory-mcp',
  connect(config: { filePath?: string } = {}): AgentAdapter {
    return stdioMcp(this.adapterName, '@modelcontextprotocol/server-memory', undefined, config.filePath ? [config.filePath] : []);
  },
};
