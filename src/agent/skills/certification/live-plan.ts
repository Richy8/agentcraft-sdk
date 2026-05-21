export const LIVE_PROVIDER_CERTIFICATION_PLAN = {
  envGate: 'INTEGRATION_TESTS=true',
  recommendedCommand: 'INTEGRATION_TESTS=true AGENTCRAFT_LIVE_SKILLS_CERTIFICATION=true npm run test:int:skills',
  representativeProviders: ['openai', 'anthropic', 'google', 'cohere', 'deepseek', 'groq'],
  representativeSkills: ['blog-writer', 'linkedin-post-writer', 'youtube-scriptwriter', 'resume-writer'],
  reportPath: 'reports/agentcraft-live-skills-certification.md',
} as const;
