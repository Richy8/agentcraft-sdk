import type { AgentAdapter } from '../adapters/types.js';
import { stdioMcp } from './shared.js';

export const CloudflareMCP = {
  adapterName: 'cloudflare-mcp',
  connect(config: { apiToken: string; accountId?: string }): AgentAdapter {
    return stdioMcp(this.adapterName, '@cloudflare/mcp-server-cloudflare', {
      CLOUDFLARE_API_TOKEN: config.apiToken,
      ...(config.accountId !== undefined && { CLOUDFLARE_ACCOUNT_ID: config.accountId }),
    });
  },
};

