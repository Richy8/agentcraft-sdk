import type { AgentAdapter } from '../adapters/types.js';
import { stdioMcp } from './shared.js';

export const LinearMCP = {
  adapterName: 'linear-mcp',
  connect(config: { apiKey: string }): AgentAdapter {
    return stdioMcp(this.adapterName, 'linear-mcp-server', { LINEAR_API_KEY: config.apiKey });
  },
};

