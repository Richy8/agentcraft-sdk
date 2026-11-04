import { defineConfig } from 'vitepress';

// Update this when switching to a custom domain
const DOCS_SITE = 'https://agentcraft-sdk.vercel.app';

export default defineConfig({
  title: 'AgentCraft',
  description:
    'Production-grade TypeScript agent runtime with providers, tools, MCP, teams, tracing, and budgets.',
  cleanUrls: true,
  lastUpdated: true,
  srcExclude: ['api/media/**', 'public/api/media/**'],
  ignoreDeadLinks: true,
  head: [
    ['meta', { name: 'theme-color', content: '#2563eb' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: 'AgentCraft Documentation' }],
    ['meta', { property: 'og:url', content: DOCS_SITE }],
    ['link', { rel: 'canonical', href: DOCS_SITE }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'Build production-grade TypeScript agents with provider routing, tools, MCP, teams, and observability.',
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
          { text: 'Architecture', link: '/architecture' },
          { text: 'Choose Your Path', link: '/guides/choose-your-path' },
        ],
      },
      {
        text: 'Core Runtime',
        items: [
          { text: 'Agents', link: '/core/agents' },
          { text: 'Models & Providers', link: '/core/models-and-providers' },
          { text: 'Running Agents', link: '/core/running-agents' },
          { text: 'Streaming', link: '/core/streaming' },
          { text: 'Structured Output', link: '/core/structured-output' },
          { text: 'Prompt Assembly', link: '/core/prompt-assembly' },
          { text: 'Budgets & Cost', link: '/core/budgets-cost' },
          { text: 'Observability & Tracing', link: '/core/observability-replay' },
          { text: 'Agent Events', link: '/core/agent-events' },
          { text: 'Error Handling', link: '/core/error-handling' },
        ],
      },
      {
        text: 'Tools',
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
        text: 'Skills',
        items: [
          { text: 'Overview', link: '/skills/overview' },
          { text: 'API Reference', link: '/skills/api' },
        ],
      },
      {
        text: 'Adapters',
        items: [
          { text: 'Overview', link: '/adapters/overview' },
          { text: 'Built-In Adapters', link: '/adapters/built-in' },
          { text: 'Custom Adapters', link: '/adapters/custom' },
          { text: 'Adapter Safety', link: '/adapters/safety' },
        ],
      },
      {
        text: 'MCP',
        items: [
          { text: 'Overview', link: '/mcp/overview' },
          { text: 'Built-In MCP Wrappers', link: '/mcp/built-in' },
          { text: 'Custom MCP', link: '/mcp/custom' },
          { text: 'MCP Security', link: '/mcp/security' },
        ],
      },
      {
        text: 'Orchestration',
        items: [
          {
            text: 'Agent Workflow',
            link: '/orchestration/agent-workflow',
            items: [
              { text: 'Workflow Steps', link: '/orchestration/workflow-steps' },
            ],
          },
          {
            text: 'Agent Team',
            link: '/orchestration/agent-team',
            items: [
              { text: 'Dynamic Team Spawning', link: '/orchestration/dynamic-team-spawning' },
            ],
          },
          { text: 'Agent Pool', link: '/orchestration/agent-pool' },
          { text: 'Agent Workspace', link: '/orchestration/agent-workspace' },
        ],
      },
      {
        text: 'Persistence & Memory',
        items: [
          {
            text: 'AgentCache',
            link: '/persistence/agent-cache',
            items: [
              { text: 'Cache Warming', link: '/persistence/cache-warming' },
            ],
          },
          { text: 'Distributed Cache', link: '/persistence/distributed-cache' },
          { text: 'Semantic Memory', link: '/persistence/semantic-memory' },
          { text: 'Artifact Store', link: '/persistence/artifact-store' },
          { text: 'Artifact Registry', link: '/persistence/artifact-registry' },
          { text: 'Authoring a Domain Store', link: '/persistence/authoring-domain-store' },
        ],
      },
      {
        text: 'Production',
        items: [
          { text: 'Security Model', link: '/production/security-model' },
          { text: 'Governance Queue', link: '/production/governance-queue' },
          { text: 'AgentEval', link: '/production/agent-eval' },
          { text: 'AgentReports', link: '/production/agent-reports' },
          { text: 'Observability Reports', link: '/production/observability-reports' },
          { text: 'Testing & Mocking', link: '/production/testing' },
          { text: 'Runtime Hardening', link: '/production/runtime-hardening' },
          { text: 'API Stability', link: '/production/api-stability' },
        ],
      },
      {
        text: 'Examples & Cookbook',
        items: [
          { text: 'Overview', link: '/examples-cookbook/overview' },
          { text: 'Beginner', link: '/examples-cookbook/beginner' },
          { text: 'Providers', link: '/examples-cookbook/provider' },
          { text: 'Streaming', link: '/examples-cookbook/streaming' },
          { text: 'Structured Output', link: '/examples-cookbook/structured-output' },
          { text: 'Tools & Adapters', link: '/examples-cookbook/tools-adapters' },
          { text: 'Persistence & Caching', link: '/examples-cookbook/persistence' },
          { text: 'Semantic Memory', link: '/examples-cookbook/semantic-memory' },
          { text: 'MCP', link: '/examples-cookbook/mcp' },
          { text: 'Orchestration', link: '/examples-cookbook/orchestration' },
          { text: 'Budgets & Cost', link: '/examples-cookbook/budgets' },
          { text: 'Prompt Assembly', link: '/examples-cookbook/prompt-assembly' },
          { text: 'Error Handling', link: '/examples-cookbook/error-handling' },
          { text: 'Testing & Mocking', link: '/examples-cookbook/testing' },
          { text: 'Production', link: '/examples-cookbook/production' },
          { text: 'Runnable Examples Index', link: '/examples' },
        ],
      },
      {
        text: 'Configuration Reference',
        items: [
          { text: 'Overview', link: '/configuration/overview' },
          { text: 'Agent Config', link: '/configuration/agent-config' },
          { text: 'Run Config', link: '/configuration/run-config' },
          { text: 'Provider Config', link: '/configuration/provider-config' },
          { text: 'Retry Config', link: '/configuration/retry-config' },
          { text: 'Budget Config', link: '/configuration/budget-config' },
          { text: 'Tool Policy Config', link: '/configuration/tool-policy-config' },
          { text: 'Adapter Config', link: '/configuration/adapter-config' },
          { text: 'MCP Config', link: '/configuration/mcp-config' },
          { text: 'Cache Config', link: '/configuration/cache-config' },
          { text: 'Workspace Config', link: '/configuration/workspace-config' },
          { text: 'Workflow Config', link: '/configuration/workflow-config' },
          { text: 'Team & Pool Config', link: '/configuration/team-config' },
          { text: 'Structured Output Config', link: '/configuration/structured-output-config' },
          { text: 'Prompt Assembly Config', link: '/configuration/prompt-assembly-config' },
          { text: 'Memory & Store Config', link: '/configuration/memory-store-config' },
          { text: 'Observability Config', link: '/configuration/observability-config' },
          { text: 'Eval Config', link: '/configuration/eval-config' },
          { text: 'Environment Variables', link: '/configuration/environment-variables' },
        ],
      },
      {
        text: 'Reference',
        items: [
          { text: 'Built-In Adapters Index', link: '/reference/built-in-adapters' },
          { text: 'Built-In MCP Wrappers Index', link: '/reference/built-in-mcps' },
          { text: 'Architecture', link: '/architecture' },
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
