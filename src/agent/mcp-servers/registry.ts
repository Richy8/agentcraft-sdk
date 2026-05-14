import type { McpServerMetadata } from '../adapters/mcp.adapter.js';

export interface McpWrapperDefinition {
  adapterName: string;
  transport: 'stdio' | 'http' | 'dual';
  packageName?: string;
  packageStatus?: 'published' | 'requires-user-package';
  trustLevel: NonNullable<McpServerMetadata['trustLevel']>;
  requiredSecrets: string[];
  sideEffects: NonNullable<McpServerMetadata['sideEffects']>;
  scopes: string[];
}

const externalWrite: Array<'read' | 'write' | 'external'> = ['read', 'write', 'external'];
const externalRead: Array<'read' | 'external'> = ['read', 'external'];

export const MCP_WRAPPER_REGISTRY: Record<string, McpWrapperDefinition> = {
  'github-mcp': { adapterName: 'github-mcp', transport: 'stdio', packageStatus: 'requires-user-package', trustLevel: 'review-required', requiredSecrets: ['GITHUB_PERSONAL_ACCESS_TOKEN'], sideEffects: externalWrite, scopes: ['repo'] },
  'linear-mcp': { adapterName: 'linear-mcp', transport: 'stdio', packageName: 'linear-mcp-server@0.1.0', packageStatus: 'published', trustLevel: 'review-required', requiredSecrets: ['LINEAR_API_KEY'], sideEffects: externalWrite, scopes: ['issues'] },
  'jira-mcp': { adapterName: 'jira-mcp', transport: 'stdio', packageName: '@aashari/mcp-server-atlassian-jira@3.3.0', packageStatus: 'published', trustLevel: 'review-required', requiredSecrets: ['JIRA_EMAIL', 'JIRA_API_TOKEN', 'JIRA_BASE_URL'], sideEffects: externalWrite, scopes: ['issues', 'projects'] },
  'sentry-mcp': { adapterName: 'sentry-mcp', transport: 'dual', packageName: '@sentry/mcp-server@0.33.0', packageStatus: 'published', trustLevel: 'review-required', requiredSecrets: ['SENTRY_AUTH_TOKEN'], sideEffects: externalRead, scopes: ['events', 'projects'] },
  'playwright-mcp': { adapterName: 'playwright-mcp', transport: 'stdio', packageName: '@playwright/mcp@0.0.75', packageStatus: 'published', trustLevel: 'review-required', requiredSecrets: [], sideEffects: externalWrite, scopes: ['browser'] },
  'browserbase-mcp': { adapterName: 'browserbase-mcp', transport: 'stdio', packageName: '@browserbasehq/mcp-server-browserbase@2.4.3', packageStatus: 'published', trustLevel: 'review-required', requiredSecrets: ['BROWSERBASE_API_KEY', 'BROWSERBASE_PROJECT_ID'], sideEffects: externalWrite, scopes: ['browser'] },
  'apify-mcp': { adapterName: 'apify-mcp', transport: 'dual', packageName: '@apify/actors-mcp-server@0.10.1', packageStatus: 'published', trustLevel: 'review-required', requiredSecrets: ['APIFY_TOKEN'], sideEffects: externalWrite, scopes: ['actors', 'datasets'] },
  'firecrawl-mcp': { adapterName: 'firecrawl-mcp', transport: 'stdio', packageName: 'firecrawl-mcp@3.15.0', packageStatus: 'published', trustLevel: 'review-required', requiredSecrets: ['FIRECRAWL_API_KEY'], sideEffects: externalRead, scopes: ['web'] },
  'fetch-mcp': { adapterName: 'fetch-mcp', transport: 'stdio', packageStatus: 'requires-user-package', trustLevel: 'review-required', requiredSecrets: [], sideEffects: externalRead, scopes: ['web'] },
  'brave-search-mcp': { adapterName: 'brave-search-mcp', transport: 'stdio', packageName: '@modelcontextprotocol/server-brave-search@0.6.2', packageStatus: 'published', trustLevel: 'review-required', requiredSecrets: ['BRAVE_API_KEY'], sideEffects: externalRead, scopes: ['web_search'] },
  'supabase-mcp': { adapterName: 'supabase-mcp', transport: 'stdio', packageName: '@supabase/mcp-server-supabase@0.8.1', packageStatus: 'published', trustLevel: 'review-required', requiredSecrets: ['SUPABASE_ACCESS_TOKEN', 'SUPABASE_PROJECT_REF'], sideEffects: externalWrite, scopes: ['database', 'storage'] },
  'postgres-mcp': { adapterName: 'postgres-mcp', transport: 'stdio', packageName: '@modelcontextprotocol/server-postgres@0.6.2', packageStatus: 'published', trustLevel: 'review-required', requiredSecrets: ['DATABASE_URL'], sideEffects: ['read', 'write'], scopes: ['database'] },
  'neon-mcp': { adapterName: 'neon-mcp', transport: 'http', trustLevel: 'review-required', requiredSecrets: ['Authorization'], sideEffects: externalWrite, scopes: ['database', 'projects'] },
  'qdrant-mcp': { adapterName: 'qdrant-mcp', transport: 'stdio', packageName: 'mcp-server-qdrant@0.0.1', packageStatus: 'published', trustLevel: 'review-required', requiredSecrets: ['QDRANT_URL', 'QDRANT_API_KEY'], sideEffects: externalWrite, scopes: ['vectors'] },
  'airtable-mcp': { adapterName: 'airtable-mcp', transport: 'stdio', packageName: 'airtable-mcp-server@1.13.0', packageStatus: 'published', trustLevel: 'review-required', requiredSecrets: ['AIRTABLE_API_KEY', 'AIRTABLE_BASE_ID'], sideEffects: externalWrite, scopes: ['records'] },
  'filesystem-mcp': { adapterName: 'filesystem-mcp', transport: 'stdio', packageName: '@modelcontextprotocol/server-filesystem@2026.1.14', packageStatus: 'published', trustLevel: 'review-required', requiredSecrets: [], sideEffects: ['read', 'write'], scopes: ['filesystem'] },
  'memory-mcp': { adapterName: 'memory-mcp', transport: 'stdio', packageName: '@modelcontextprotocol/server-memory@2026.1.26', packageStatus: 'published', trustLevel: 'review-required', requiredSecrets: [], sideEffects: ['read', 'write'], scopes: ['memory'] },
  'slack-mcp': { adapterName: 'slack-mcp', transport: 'stdio', packageName: '@modelcontextprotocol/server-slack@2025.4.25', packageStatus: 'published', trustLevel: 'review-required', requiredSecrets: ['SLACK_BOT_TOKEN', 'SLACK_TEAM_ID'], sideEffects: externalWrite, scopes: ['messages'] },
  'gmail-mcp': { adapterName: 'gmail-mcp', transport: 'stdio', packageName: '@gongrzhe/server-gmail-autoauth-mcp@1.1.11', packageStatus: 'published', trustLevel: 'review-required', requiredSecrets: ['GMAIL_CREDENTIALS'], sideEffects: externalWrite, scopes: ['email'] },
  'resend-mcp': { adapterName: 'resend-mcp', transport: 'dual', packageName: 'resend-mcp@2.6.0', packageStatus: 'published', trustLevel: 'review-required', requiredSecrets: ['RESEND_API_KEY'], sideEffects: externalWrite, scopes: ['email'] },
  'notion-mcp': { adapterName: 'notion-mcp', transport: 'stdio', packageName: '@notionhq/notion-mcp-server@2.2.1', packageStatus: 'published', trustLevel: 'review-required', requiredSecrets: ['NOTION_TOKEN'], sideEffects: externalWrite, scopes: ['pages', 'databases'] },
  'figma-mcp': { adapterName: 'figma-mcp', transport: 'stdio', packageName: 'figma-developer-mcp@0.11.0', packageStatus: 'published', trustLevel: 'review-required', requiredSecrets: ['FIGMA_API_KEY'], sideEffects: externalRead, scopes: ['design'] },
  'cloudflare-mcp': { adapterName: 'cloudflare-mcp', transport: 'stdio', packageName: '@cloudflare/mcp-server-cloudflare@0.2.0', packageStatus: 'published', trustLevel: 'review-required', requiredSecrets: ['CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID'], sideEffects: externalWrite, scopes: ['cloud'] },
  'railway-mcp': { adapterName: 'railway-mcp', transport: 'stdio', packageName: '@railway/mcp-server@0.1.8', packageStatus: 'published', trustLevel: 'review-required', requiredSecrets: ['RAILWAY_API_TOKEN'], sideEffects: externalWrite, scopes: ['deployments'] },
  'render-mcp': { adapterName: 'render-mcp', transport: 'stdio', packageName: '@niyogi/render-mcp@1.0.1', packageStatus: 'published', trustLevel: 'review-required', requiredSecrets: ['RENDER_API_KEY'], sideEffects: externalWrite, scopes: ['deployments'] },
  'vercel-mcp': { adapterName: 'vercel-mcp', transport: 'http', trustLevel: 'review-required', requiredSecrets: ['Authorization'], sideEffects: externalWrite, scopes: ['deployments'] },
  'elevenlabs-mcp': { adapterName: 'elevenlabs-mcp', transport: 'stdio', packageStatus: 'requires-user-package', trustLevel: 'review-required', requiredSecrets: ['ELEVENLABS_API_KEY'], sideEffects: externalWrite, scopes: ['audio'] },
  'context7-mcp': { adapterName: 'context7-mcp', transport: 'dual', packageName: '@upstash/context7-mcp@2.2.4', packageStatus: 'published', trustLevel: 'trusted', requiredSecrets: [], sideEffects: externalRead, scopes: ['documentation'] },
  'stripe-mcp': { adapterName: 'stripe-mcp', transport: 'dual', packageName: '@stripe/mcp@0.3.3', packageStatus: 'published', trustLevel: 'review-required', requiredSecrets: ['STRIPE_SECRET_KEY'], sideEffects: externalWrite, scopes: ['payments'] },
} satisfies Record<string, McpWrapperDefinition>;

export function getMcpWrapperMetadata(adapterName: string): McpServerMetadata {
  const definition = MCP_WRAPPER_REGISTRY[adapterName];
  if (!definition) {
    return { trustLevel: 'review-required', sideEffects: ['external'] };
  }
  return {
    trustLevel: definition.trustLevel,
    ...(definition.packageName !== undefined && { packageName: definition.packageName }),
    requiredSecrets: definition.requiredSecrets,
    sideEffects: [...definition.sideEffects],
    scopes: definition.scopes,
  };
}
