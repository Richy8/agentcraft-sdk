import type { AgentAdapter } from '../adapters/types.js';
import { stdioMcp } from './shared.js';

export const SupabaseMCP = {
  adapterName: 'supabase-mcp',
  connect(config: { url: string; apiKey: string }): AgentAdapter {
    return stdioMcp(this.adapterName, '@supabase/mcp-server-supabase', {
      SUPABASE_URL: config.url,
      SUPABASE_API_KEY: config.apiKey,
    });
  },
};

