import type { AgentAdapter } from '../adapters/types.js';
import { httpMcp } from './shared.js';

export const VercelMCP = {
  adapterName: 'vercel-mcp',
  connect(config: { apiToken: string }): AgentAdapter {
    return httpMcp(this.adapterName, 'https://vercel.com/api/mcp', { Authorization: `Bearer ${config.apiToken}` });
  },
};

