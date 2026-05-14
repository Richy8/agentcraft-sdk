import type { AgentAdapter } from '../adapters/types.js';
import { stdioMcp } from './shared.js';

export const BrowserbaseMCP = {
  adapterName: 'browserbase-mcp',
  connect(config: { apiKey: string; projectId: string }): AgentAdapter {
    return stdioMcp(this.adapterName, '@browserbasehq/mcp-server-browserbase', {
      BROWSERBASE_API_KEY: config.apiKey,
      BROWSERBASE_PROJECT_ID: config.projectId,
    });
  },
};

