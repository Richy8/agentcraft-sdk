import type { AgentAdapter } from '../adapters/types.js';
import { stdioMcp } from './shared.js';

export const JiraMCP = {
  adapterName: 'jira-mcp',
  connect(config: { host: string; email: string; apiToken: string }): AgentAdapter {
    return stdioMcp(this.adapterName, '@aashari/mcp-server-atlassian-jira', {
      JIRA_HOST: config.host,
      JIRA_USER_EMAIL: config.email,
      JIRA_API_TOKEN: config.apiToken,
    });
  },
};

