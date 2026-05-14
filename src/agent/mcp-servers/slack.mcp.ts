import type { AgentAdapter } from '../adapters/types.js';
import { stdioMcp } from './shared.js';

export const SlackMCP = {
  adapterName: 'slack-mcp',
  connect(config: { botToken: string; teamId: string }): AgentAdapter {
    return stdioMcp(this.adapterName, '@modelcontextprotocol/server-slack', {
      SLACK_BOT_TOKEN: config.botToken,
      SLACK_TEAM_ID: config.teamId,
    });
  },
};

