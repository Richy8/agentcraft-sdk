import type { AgentAdapter } from '../adapters/types.js';
import { stdioMcp } from './shared.js';

export const QdrantMCP = {
  adapterName: 'qdrant-mcp',
  connect(config: { url: string; apiKey?: string; collectionName?: string }): AgentAdapter {
    return stdioMcp(this.adapterName, 'mcp-server-qdrant', {
      QDRANT_URL: config.url,
      ...(config.apiKey !== undefined && { QDRANT_API_KEY: config.apiKey }),
      ...(config.collectionName !== undefined && { QDRANT_COLLECTION_NAME: config.collectionName }),
    });
  },
};

