import type { AgentAdapter } from '../adapters/types.js';
import { stdioMcp } from './shared.js';

export const FigmaMCP = {
  adapterName: 'figma-mcp',
  connect(config: { apiToken: string; filePath?: string }): AgentAdapter {
    return stdioMcp(
      this.adapterName,
      'figma-developer-mcp',
      { FIGMA_API_TOKEN: config.apiToken },
      config.filePath ? [config.filePath] : []
    );
  },
};

