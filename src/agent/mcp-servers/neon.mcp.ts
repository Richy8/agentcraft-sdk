import type { AgentAdapter } from '../adapters/types.js';
import { httpMcp } from './shared.js';

export const NeonMCP = {
  adapterName: 'neon-mcp',
  connect(config: { apiKey: string }): AgentAdapter {
    return httpMcp(this.adapterName, 'https://mcp.neon.tech/sse', { Authorization: `Bearer ${config.apiKey}` });
  },
};

