import type { AgentAdapter } from '../adapters/types.js';
import { stdioMcp } from './shared.js';

export const PostgresMCP = {
  adapterName: 'postgres-mcp',
  connect(config: { connectionString: string }): AgentAdapter {
    return stdioMcp(this.adapterName, '@modelcontextprotocol/server-postgres', { DATABASE_URL: config.connectionString });
  },
};

