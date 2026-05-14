import type { AgentAdapter } from '../adapters/types.js';
import { stdioMcp } from './shared.js';

export const AirtableMCP = {
  adapterName: 'airtable-mcp',
  connect(config: { apiKey: string; baseId?: string }): AgentAdapter {
    return stdioMcp(this.adapterName, 'airtable-mcp-server', {
      AIRTABLE_API_KEY: config.apiKey,
      ...(config.baseId !== undefined && { AIRTABLE_BASE_ID: config.baseId }),
    });
  },
};

