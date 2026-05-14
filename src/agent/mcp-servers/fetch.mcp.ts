import type { AgentAdapter } from '../adapters/types.js';
import { stdioMcp } from './shared.js';

export const FetchMCP = {
  adapterName: 'fetch-mcp',
  connect(config: { proxy?: string; packageSpec?: string } = {}): AgentAdapter {
    return stdioMcp(
      this.adapterName,
      config.packageSpec,
      config.proxy ? { HTTPS_PROXY: config.proxy, HTTP_PROXY: config.proxy } : undefined
    );
  },
};
