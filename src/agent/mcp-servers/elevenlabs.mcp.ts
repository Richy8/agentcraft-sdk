import type { AgentAdapter } from '../adapters/types.js';
import { stdioMcp } from './shared.js';

export const ElevenLabsMCP = {
  adapterName: 'elevenlabs-mcp',
  connect(config: { apiKey: string; packageSpec?: string }): AgentAdapter {
    return stdioMcp(this.adapterName, config.packageSpec, { ELEVENLABS_API_KEY: config.apiKey });
  },
};
