export const CREATOR_DOMAIN_SKILL_EVAL_FIXTURES = [
  {
    skill: 'blog-research',
    prompt: 'Research a blog post about semantic memory for TypeScript agent apps.',
    expectedSignals: ['research question', 'Evidence map', 'Contradictions and uncertainty'],
  },
  {
    skill: 'blog-brief',
    prompt: 'Create a brief for a blog post about reducing token costs in agent workflows.',
    expectedSignals: ['reader promise and angle', 'Execution outline', 'review gates'],
  },
  {
    skill: 'blog-seo-review',
    prompt: 'Review an article draft for search intent and people-first SEO fit.',
    expectedSignals: ['Intent verdict', 'High-impact fixes', 'Do-not-do list'],
  },
  {
    skill: 'blog-writer',
    prompt: 'Write a source-aware blog draft about reducing agent token costs.',
    expectedSignals: ['Title options', 'article draft', 'verification queue'],
  },
  {
    skill: 'blog-fact-check',
    prompt: 'Fact-check a draft that includes model pricing, benchmark claims, and provider names.',
    expectedSignals: ['Claim map', 'Publishing blockers', 'Verified claims'],
  },
  {
    skill: 'blog-citation',
    prompt: 'Create a citation map for a source-backed engineering blog post.',
    expectedSignals: ['Citation map', 'Missing citations', 'Attribution notes'],
  },
  {
    skill: 'linkedin-audience-research',
    prompt: 'Research the LinkedIn audience for technical founders buying agent infrastructure.',
    expectedSignals: ['Segments', 'Language bank', 'Messaging risks'],
  },
  {
    skill: 'linkedin-ideation',
    prompt: 'Generate LinkedIn post ideas for an open source AI agent package.',
    expectedSignals: ['idea bank', 'format fit', 'priority stack'],
  },
  {
    skill: 'linkedin-post-writer',
    prompt: 'Draft a LinkedIn post for a founder explaining why prompt caching matters.',
    expectedSignals: ['Hook alternatives', 'Risk check', 'specific'],
  },
  {
    skill: 'linkedin-hook-review',
    prompt: 'Review five LinkedIn hooks for a post about tool governance.',
    expectedSignals: ['Verdict', 'Alternatives', 'Best pick'],
  },
  {
    skill: 'linkedin-calendar',
    prompt: 'Plan two weeks of LinkedIn posts across product education and launch proof.',
    expectedSignals: ['Calendar table', 'capacity diagnosis', 'dependency log'],
  },
  {
    skill: 'youtube-topic-research',
    prompt: 'Research a YouTube video topic about building memory into AI agents.',
    expectedSignals: ['viewer', 'packaging angle', 'satisfaction risk'],
  },
  {
    skill: 'youtube-scriptwriter',
    prompt: 'Write a 6 minute YouTube script about building a resilient AI agent workflow.',
    expectedSignals: ['cold open', 'full script', 'retention architecture'],
  },
  {
    skill: 'youtube-retention-review',
    prompt: 'Review a YouTube script for pacing, payoff, and drop-off risks.',
    expectedSignals: ['retention diagnosis', 'evidence table', 'packaging promise'],
  },
  {
    skill: 'youtube-thumbnail-brief',
    prompt: 'Create a title and thumbnail brief for a video about agent cache warming.',
    expectedSignals: ['thumbnail strategy', 'variant briefs', 'asset list'],
  },
  {
    skill: 'resume-role-research',
    prompt: 'Research a senior platform engineer role and map requirements to evidence.',
    expectedSignals: ['requirement map', 'evidence needed', 'ats keyword cluster'],
  },
  {
    skill: 'resume-writer',
    prompt: 'Rewrite resume bullets for a senior backend engineer role without inventing metrics.',
    expectedSignals: ['resume draft', 'revision requests', 'evidence'],
  },
  {
    skill: 'resume-ats-review',
    prompt: 'Review a resume against a staff backend engineer job description.',
    expectedSignals: ['ats verdict', 'parsing risk review', 'keyword-proof map'],
  },
  {
    skill: 'resume-tailoring',
    prompt: 'Create a tailoring plan for a product engineer resume and role description.',
    expectedSignals: ['tailoring diagnosis', 'decision log', 'keyword proof map'],
  },
] as const;
