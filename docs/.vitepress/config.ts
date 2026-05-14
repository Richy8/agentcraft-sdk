import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'AgentCraft',
  description:
    'Production-grade TypeScript agent runtime with providers, tools, MCP, skills, teams, tracing, and budgets.',
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: ['api/media/**', 'public/api/media/**'],
  ignoreDeadLinks: [/^\/api\//, /^\.\.\/examples\//],
  head: [
    ['meta', { name: 'theme-color', content: '#2563eb' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'AgentCraft Documentation' }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'Build production-grade TypeScript agents with provider routing, tools, MCP, skills, teams, and observability.',
      },
    ],
  ],
  themeConfig: {
    logo: { src: '/agentcraft-mark.svg', width: 28, height: 28 },
    nav: [
      { text: 'Start', link: '/start/quickstart' },
      { text: 'Features', link: '/start/feature-map' },
      { text: 'Config', link: '/configuration/overview' },
      { text: 'Cookbook', link: '/examples-cookbook/overview' },
      { text: 'API', link: '/api/' },
    ],
    sidebar: [
      {
        text: 'Start Here',
        items: [
          { text: 'Overview', link: '/' },
          { text: 'Quickstart', link: '/start/quickstart' },
          { text: 'Mental Model', link: '/start/mental-model' },
          { text: 'Feature Map', link: '/start/feature-map' },
          { text: 'Choose Your Path', link: '/guides/choose-your-path' },
        ],
      },
      {
        text: 'Core Runtime',
        items: [
          { text: 'Agents', link: '/core/agents' },
          { text: 'Models And Providers', link: '/core/models-and-providers' },
          { text: 'Running Agents', link: '/core/running-agents' },
          { text: 'Streaming', link: '/core/streaming' },
          { text: 'Structured Output', link: '/core/structured-output' },
          { text: 'Prompt Assembly', link: '/core/prompt-assembly' },
          { text: 'Budgets And Cost', link: '/core/budgets-cost' },
          { text: 'Observability And Replay', link: '/core/observability-replay' },
        ],
      },
      {
        text: 'Tools And Safety',
        items: [
          { text: 'Tools', link: '/tools/tools' },
          { text: 'Tool Policy', link: '/tools/tool-policy' },
          { text: 'Guardrails', link: '/tools/guardrails' },
          { text: 'Approvals', link: '/tools/approvals' },
          { text: 'Tool Caching', link: '/tools/tool-caching' },
          { text: 'Tool Authoring', link: '/tools/tool-authoring' },
        ],
      },
      {
        text: 'Adapters',
        items: [
          { text: 'Overview', link: '/adapters/overview' },
          { text: 'Built-In Adapters', link: '/adapters/built-in' },
          { text: 'Creator Adapters', link: '/adapters/creator-adapters' },
          { text: 'Adapter Configs', link: '/adapters/configs' },
          { text: 'Custom Adapters', link: '/adapters/custom' },
          { text: 'Adapter Safety', link: '/adapters/safety' },
        ],
      },
      {
        text: 'MCP',
        items: [
          { text: 'Overview', link: '/mcp/overview' },
          { text: 'Built-In MCP Wrappers', link: '/mcp/built-in' },
          { text: 'MCP Configs', link: '/mcp/configs' },
          { text: 'Custom MCP', link: '/mcp/custom' },
          { text: 'MCP Security', link: '/mcp/security' },
        ],
      },
      {
        text: 'Skills',
        items: [
          { text: 'Overview', link: '/skills/overview' },
          { text: 'Built-In Skills', link: '/skills/built-in' },
          { text: 'Skill Activation', link: '/skills/activation' },
          { text: 'Directives', link: '/skills/directives' },
          { text: 'External Skills', link: '/skills/external-skills' },
          { text: 'Custom Skills', link: '/skills/custom' },
        ],
      },
      {
        text: 'Creator System',
        items: [
          { text: 'Overview', link: '/creator/overview' },
          { text: 'Creator Packs', link: '/creator/packs' },
          { text: 'Default Pack', link: '/creator/packs/default' },
          { text: 'Blog Pack', link: '/creator/packs/blog' },
          { text: 'SEO Pack', link: '/creator/packs/seo' },
          { text: 'Social Pack', link: '/creator/packs/social' },
          { text: 'Video Pack', link: '/creator/packs/video' },
          { text: 'Book Pack', link: '/creator/packs/book' },
          { text: 'Copy Pack', link: '/creator/packs/copy' },
          { text: 'Publishing Pack', link: '/creator/packs/publishing' },
          { text: 'Analytics Pack', link: '/creator/packs/analytics' },
          { text: 'Creator Skills', link: '/creator/skills' },
          { text: 'Creator Adapters', link: '/creator/adapters' },
          { text: 'Creator Memory', link: '/creator/memory' },
          { text: 'Creator Analytics', link: '/creator/analytics' },
          { text: 'Creator Workflows', link: '/creator/workflows' },
          { text: 'Certification', link: '/creator/certification' },
        ],
      },
      {
        text: 'Orchestration',
        items: [
          { text: 'Agent Pool', link: '/orchestration/agent-pool' },
          { text: 'Agent Team', link: '/orchestration/agent-team' },
          { text: 'Dynamic Team Spawning', link: '/orchestration/dynamic-team-spawning' },
          { text: 'Agent Workspace', link: '/orchestration/agent-workspace' },
          { text: 'Agent Workflow', link: '/orchestration/agent-workflow' },
        ],
      },
      {
        text: 'Persistence And Cache',
        items: [
          { text: 'AgentCache', link: '/persistence/agent-cache' },
          { text: 'Artifact Store', link: '/persistence/artifact-store' },
          { text: 'Artifact Registry', link: '/persistence/artifact-registry' },
          { text: 'Citation Store', link: '/persistence/citation-store' },
          { text: 'Creator Memory Store', link: '/persistence/creator-memory-store' },
          { text: 'Analytics History Store', link: '/persistence/analytics-history-store' },
        ],
      },
      {
        text: 'Configuration Reference',
        items: [
          { text: 'Overview', link: '/configuration/overview' },
          { text: 'Agent Config', link: '/configuration/agent-config' },
          { text: 'Run Config', link: '/configuration/run-config' },
          { text: 'Tool Policy Config', link: '/configuration/tool-policy-config' },
          { text: 'Adapter Config', link: '/configuration/adapter-config' },
          { text: 'MCP Config', link: '/configuration/mcp-config' },
          { text: 'Skill Config', link: '/configuration/skill-config' },
          { text: 'Creator Pack Config', link: '/configuration/creator-pack-config' },
          { text: 'Cache Config', link: '/configuration/cache-config' },
          { text: 'Workspace Config', link: '/configuration/workspace-config' },
          { text: 'Workflow Config', link: '/configuration/workflow-config' },
          { text: 'Structured Output Config', link: '/configuration/structured-output-config' },
          { text: 'Prompt Assembly Config', link: '/configuration/prompt-assembly-config' },
          { text: 'Environment Variables', link: '/configuration/environment-variables' },
        ],
      },
      {
        text: 'Examples Cookbook',
        items: [
          { text: 'Overview', link: '/examples-cookbook/overview' },
          { text: 'Beginner', link: '/examples-cookbook/beginner' },
          { text: 'Providers', link: '/examples-cookbook/provider' },
          { text: 'Tools And Adapters', link: '/examples-cookbook/tools-adapters' },
          { text: 'MCP', link: '/examples-cookbook/mcp' },
          { text: 'Skills', link: '/examples-cookbook/skills' },
          { text: 'Creator', link: '/examples-cookbook/creator' },
          { text: 'Orchestration', link: '/examples-cookbook/orchestration' },
          { text: 'Production', link: '/examples-cookbook/production' },
          { text: 'Runnable Examples Index', link: '/examples' },
        ],
      },
      {
        text: 'Production',
        items: [
          { text: 'Security Model', link: '/production/security-model' },
          { text: 'API Stability', link: '/production/api-stability' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Built-In Skills', link: '/reference/built-in-skills' },
          { text: 'Built-In Adapters', link: '/reference/built-in-adapters' },
          { text: 'Built-In MCP Wrappers', link: '/reference/built-in-mcps' },
          { text: 'Architecture', link: '/architecture' },
          { text: 'Legacy Config Reference', link: '/guides/config-reference' },
          { text: 'API Reference', link: '/api/' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/' }],
    search: {
      provider: 'local',
    },
    outline: {
      level: [2, 3],
      label: 'On this page',
    },
    docFooter: {
      prev: 'Previous',
      next: 'Next',
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright AgentCraft contributors.',
    },
  },
});
