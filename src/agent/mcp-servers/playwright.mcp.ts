import type { AgentAdapter } from '../adapters/types.js';
import { stdioMcp } from './shared.js';

export const PlaywrightMCP = {
  adapterName: 'playwright-mcp',
  connect(config: { headless?: boolean; browser?: 'chromium' | 'firefox' | 'webkit' } = {}): AgentAdapter {
    const args = [
      ...(config.headless === false ? ['--headless=false'] : []),
      ...(config.browser ? [`--browser=${config.browser}`] : []),
    ];
    return stdioMcp(this.adapterName, '@playwright/mcp', undefined, args);
  },
};

