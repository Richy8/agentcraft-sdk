# Brand & Voice Domain Skills

The brand domain provides 17 skills for brand research, positioning, messaging, and voice development. Use them to build brand intelligence agents, positioning workshops, and messaging consistency reviewers.

## Quick Start

```ts
import { Agent, Provider } from "@deskcreate/agentcraft";
import { createSkillPackByName } from "@deskcreate/agentcraft/skills";
import { TavilySearchAdapter, FirecrawlAdapter } from "@deskcreate/agentcraft/adapters";

const agent = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
  skillActivation: "auto",
})
  .use(createSkillPackByName("brand"))
  .use(TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }))
  .use(FirecrawlAdapter.connect({ apiKey: process.env.FIRECRAWL_API_KEY! }));

const response = await agent.run({
  prompt: "/audit-brand Conduct a brand audit for Notion. Focus on stated vs. observed positioning and competitive whitespace.",
});
console.log(response.content);
```

## Skills

### Research

| Skill | Directive | Purpose |
| --- | --- | --- |
| `brand-research` | `/audit-brand` | Comprehensive brand intelligence brief — stated vs. observed positioning |
| `audience-insight-research` | `/mine-audience` | Synthesize audience signals, beliefs, and language patterns |
| `voice-of-customer-mining` | `/mine-voc` | Extract verbatim customer language from reviews and interviews |
| `competitor-brand-scan` | `/scan-competitors` | Competitive brand landscape — claims, whitespace, parity zones |

### Positioning

| Skill | Directive | Purpose |
| --- | --- | --- |
| `brand-positioning` | `/position` | Develop or refine a brand positioning statement |
| `brand-differentiation-map` | `/map-differentiation` | Map points of difference and parity vs. category |
| `proof-point-mapper` | `/map-proof` | Identify and map credibility proof points |
| `value-proposition-writer` | `/write-value-prop` | Draft a validated value proposition |
| `brand-promise-writer` | `/draft-promise` | Write the brand promise with evidence anchoring |

### Messaging

| Skill | Directive | Purpose |
| --- | --- | --- |
| `messaging-framework-writer` | `/build-messaging-framework` | Build a tiered messaging framework (core → support → proof) |
| `brand-narrative-brief` | `/shape-narrative` | Write the brand narrative arc |
| `tagline-options-writer` | `/write-taglines` | Generate tagline options with rationale |
| `brand-story-writer` | `/write-brand-story` | Write the origin/mission brand story |

### Voice

| Skill | Directive | Purpose |
| --- | --- | --- |
| `brand-voice-profile` | `/extract-voice` | Extract and codify a brand voice profile from corpus |
| `tone-of-voice-guide` | `/write-tov-guide` | Write a tone-of-voice guide with examples |
| `brand-guideline-writer` | `/write-guidelines` | Write brand guidelines document |
| `brand-consistency-review` | `/review-brand-consistency` | Review content against brand voice and positioning |

## Patterns

### Brand Research Pipeline

```ts
const research = await agent.run({
  prompt: `/audit-brand Research the brand positioning for Linear.
  
  Brand context: B2B project management SaaS for engineering teams.
  Focus: How customers describe it vs. how they position themselves.`,
});

// Then use findings to develop positioning
const positioning = await agent.run({
  prompt: `/position Based on the brand research, develop a differentiated positioning statement.
  
  Key insight from research: ${research.content.slice(0, 500)}`,
});
```

### Voice Extraction and Consistency Check

```ts
// Extract voice from existing content
const voiceProfile = await agent.run({
  promptFile: "prompts/voice-extraction.prompt",
  vars: { contentSample: existingContent },
  skillActivation: "directive-only",
});

// Review new content against voice profile
const review = await agent.run({
  prompt: `/review-brand-consistency Review this blog draft against the brand voice profile.
  
  Voice profile: ${voiceProfile.content}
  Draft: ${newBlogDraft}`,
});
```

## Optional Adapters

| Adapter | Benefit |
| --- | --- |
| `TavilySearchAdapter` | Live competitor positioning and brand sentiment data |
| `FirecrawlAdapter` | Deep crawl competitor sites for claim analysis |
| `FileSystemAdapter` | Load brand assets, guidelines, and customer interview files |

## Related

- [Industry Domain Skills Overview](./overview.md)
- [Creator Domain](./creator.md)
- [Marketing Domain](./marketing.md)
