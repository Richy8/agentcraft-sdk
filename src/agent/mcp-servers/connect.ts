import { MCPAdapter } from '../adapters/mcp.adapter.js';
import type { AgentAdapter } from '../adapters/types.js';

export type MCPAuth =
  | { type: 'bearer'; token: string }
  | { type: 'api-key'; header: string; key: string }
  | { type: 'basic'; username: string; password: string };

export type MCPConnectConfig =
  | {
      url: string;
      name?: string;
      auth?: MCPAuth;
      headers?: Record<string, string>;
      allowedTools?: string[];
      requireApproval?: 'never' | 'always' | string[];
      timeoutMs?: number;
    }
  | {
      command: string;
      name?: string;
      args?: string[];
      env?: Record<string, string>;
      allowedTools?: string[];
      requireApproval?: 'never' | 'always' | string[];
    }
  | {
      package: string;
      name?: string;
      env?: Record<string, string>;
      allowedTools?: string[];
      requireApproval?: 'never' | 'always' | string[];
    };

function buildAuthHeaders(auth: MCPAuth): Record<string, string> {
  switch (auth.type) {
    case 'bearer':
      return { Authorization: `Bearer ${auth.token}` };
    case 'api-key':
      return { [auth.header]: auth.key };
    case 'basic': {
      const encoded = Buffer.from(`${auth.username}:${auth.password}`).toString('base64');
      return { Authorization: `Basic ${encoded}` };
    }
  }
}

export const MCP = {
  connect(config: MCPConnectConfig): AgentAdapter {
    if ('url' in config) {
      const authHeaders = config.auth ? buildAuthHeaders(config.auth) : undefined;
      const allHeaders = { ...authHeaders, ...config.headers };
      return MCPAdapter.connect({
        transport: 'http',
        url: config.url,
        ...(config.name !== undefined && { name: config.name }),
        ...(Object.keys(allHeaders).length > 0 && { headers: allHeaders }),
        ...(config.allowedTools !== undefined && { allowedTools: config.allowedTools }),
        ...(config.timeoutMs !== undefined && { timeoutMs: config.timeoutMs }),
        metadata: {
          trustLevel: 'review-required',
          sideEffects: ['external'],
        },
      });
    }

    if ('command' in config) {
      return MCPAdapter.connect({
        transport: 'stdio',
        command: config.command,
        ...(config.name !== undefined && { name: config.name }),
        ...(config.args !== undefined && { args: config.args }),
        ...(config.env !== undefined && { env: config.env }),
        ...(config.allowedTools !== undefined && { allowedTools: config.allowedTools }),
        metadata: {
          trustLevel: 'review-required',
          sideEffects: ['external'],
        },
      });
    }

    // package branch — runs via npx
    return MCPAdapter.connect({
      transport: 'stdio',
      command: 'npx',
      args: ['-y', config.package],
      ...(config.name !== undefined && { name: config.name }),
      ...(config.env !== undefined && { env: config.env }),
      ...(config.allowedTools !== undefined && { allowedTools: config.allowedTools }),
      rejectUnpinnedPackage: true,
      metadata: {
        trustLevel: 'review-required',
        sideEffects: ['external'],
      },
    });
  },
};
