import type { AgentAdapter } from '../adapters/types.js';
import { stdioMcp } from './shared.js';

export const BraveSearchMCP = {
  adapterName: 'brave-search-mcp',
  connect(config: { apiKey: string }): AgentAdapter {
    return stdioMcp(this.adapterName, '@modelcontextprotocol/server-brave-search', { BRAVE_API_KEY: config.apiKey });
  },
};

