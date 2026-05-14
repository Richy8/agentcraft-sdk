import type { AgentAdapter } from '../adapters/types.js';
import { stdioMcp } from './shared.js';

export const RailwayMCP = {
  adapterName: 'railway-mcp',
  connect(config: { apiToken: string }): AgentAdapter {
    return stdioMcp(this.adapterName, '@railway/mcp-server', { RAILWAY_API_TOKEN: config.apiToken });
  },
};

