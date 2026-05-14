import type { AgentAdapter } from '../adapters/types.js';
import { stdioMcp } from './shared.js';

export const GmailMCP = {
  adapterName: 'gmail-mcp',
  connect(config: { credentialsPath?: string } = {}): AgentAdapter {
    return stdioMcp(
      this.adapterName,
      '@gongrzhe/server-gmail-autoauth-mcp',
      config.credentialsPath ? { GMAIL_CREDENTIALS_PATH: config.credentialsPath } : undefined
    );
  },
};

