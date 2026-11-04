/**
 * Skills + Structured Output — content workflow
 *
 * Replaces the removed CreatorResourcesAdapter / AnalyticsAdapter / FileSystemCreatorMemoryStore
 * pattern with current-API equivalents:
 *
 *  - Skill.define()       — injects brand voice and output contract
 *  - AgentMemory          — persists project facts across runs
 *  - TavilySearchAdapter  — web research for content
 *  - Structured output    — typed article + metrics schemas
 */

import { Agent, AgentMemory, Provider } from "@deskcreate/agentcraft";
import { Skill } from "@deskcreate/agentcraft/skills";
import { TavilySearchAdapter } from "@deskcreate/agentcraft/adapters";

// ---------------------------------------------------------------------------
// Brand voice skill — replaces FileSystemCreatorMemoryStore + CreatorResourcesAdapter
// ---------------------------------------------------------------------------

const brandVoice = Skill.define({
  name: "brand-voice",
  description:
    "Applies brand tone: practical, evidence-led, engineer audience. No marketing filler.",
  instructions: `
## Output Contract

- Lead with the claim or finding — not the background
- Active voice, present tense
- One concrete example or number per supporting point
- No: "In today's rapidly evolving...", "It is important to note", "game-changing"
- End each response with: <!-- brand-voice-applied -->
  `.trim(),
  files: {
    "tone-examples.txt": `
Good opener: "Agent memory cuts redundant API calls by storing session context across runs."
Bad opener: "In today's AI landscape, memory is increasingly crucial for agents."

Good claim: "Providers with streaming support reduce time-to-first-token by 60–80% vs buffered responses."
Bad claim: "Streaming can potentially improve performance in some scenarios."
    `.trim(),
  },
});

// ---------------------------------------------------------------------------
// Semantic memory — replaces FileSystemCreatorMemoryStore for persistent facts
// ---------------------------------------------------------------------------

const memory = AgentMemory.create({ backend: "local" });

// ---------------------------------------------------------------------------
// Agent with skill + memory + web research
// ---------------------------------------------------------------------------

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
  memory,
})
  .use(brandVoice)
  .use(
    TavilySearchAdapter.connect({
      apiKey: process.env.TAVILY_API_KEY!,
      maxResults: 5,
    }),
  );

// ---------------------------------------------------------------------------
// Seed memory with project facts (replaces CreatorResourcesAdapter.connect({ brandVoice }))
// ---------------------------------------------------------------------------

await agent.run({
  prompt:
    "Remember: our primary audience is backend engineering leads evaluating production AI systems. Preferred examples: Redis, Postgres, Qdrant, Pinecone.",
  budget: { maxToolCalls: 1 },
});

// ---------------------------------------------------------------------------
// Research + draft — the skill shapes tone, memory provides context
// ---------------------------------------------------------------------------

const draftResponse = await agent.run({
  prompt:
    "Research the top 3 open-source vector databases used with AI agents, then draft a 200-word comparison post in our brand voice.",
  budget: { maxToolCalls: 6 },
});

console.log("--- DRAFT ---");
console.log(draftResponse.content);
console.log(`\nTokens: ${draftResponse.tokensUsed.total}  Cost: $${draftResponse.cost.toFixed(6)}`);

// ---------------------------------------------------------------------------
// Structured metrics — replaces AnalyticsAdapter / FileSystemAnalyticsHistoryStore
// ---------------------------------------------------------------------------

const metricsResponse = await agent.run({
  prompt:
    "Based on the draft above, give me a JSON object with: wordCount, hasConcreteNumbers (boolean), hasFillerPhrases (boolean), estimatedReadingTimeSeconds.",
  responseFormat: "json",
  budget: { maxToolCalls: 0 },
});

console.log("\n--- METRICS ---");
console.log(metricsResponse.content);
