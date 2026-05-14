import type { AgentAdapter } from '../adapters/types.js';
import { stdioMcp } from './shared.js';

export const RenderMCP = {
  adapterName: 'render-mcp',
  connect(config: { apiKey: string }): AgentAdapter {
    return stdioMcp(this.adapterName, '@niyogi/render-mcp', { RENDER_API_KEY: config.apiKey });
  },
};

