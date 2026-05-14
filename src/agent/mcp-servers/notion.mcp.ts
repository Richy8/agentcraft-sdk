import type { AgentAdapter } from '../adapters/types.js';
import { stdioMcp } from './shared.js';

export const NotionMCP = {
  adapterName: 'notion-mcp',
  connect(config: { token: string }): AgentAdapter {
    return stdioMcp(this.adapterName, '@modelcontextprotocol/server-notion', { NOTION_TOKEN: config.token });
  },
};

