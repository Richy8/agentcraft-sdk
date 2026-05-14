import type { AgentAdapter } from '../adapters/types.js';
import { stdioMcp } from './shared.js';

export const FirecrawlMCP = {
  adapterName: 'firecrawl-mcp',
  connect(config: { apiKey: string }): AgentAdapter {
    return stdioMcp(this.adapterName, 'firecrawl-mcp', { FIRECRAWL_API_KEY: config.apiKey });
  },
};

