import { Agent, AgentCache, Provider } from "agentcraft";
import { CreatorPacks } from "agentcraft/packs";
import { BlogWriterSkill } from "agentcraft/skills";
import { CreatorResourcesAdapter, SeoAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  model: Provider.ollama["llama3.2"],
  cache: AgentCache.disabled(),
  skillActivation: "auto",
  toolSelection: "auto",
})
  .use(CreatorPacks.blog({ contentRoot: "content", readOnlyByDefault: true }))
  .use(CreatorPacks.seo())
  .use(BlogWriterSkill.create())
  .use(
    CreatorResourcesAdapter.connect({
      brandVoice: { tone: "practical", bannedPhrases: ["game changer"] },
      corpus: [{ id: "post-1", text: "Prior article about tool guardrails." }],
    }),
  )
  .use(
    SeoAdapter.connect({
      keywordMetrics: [
        {
          keyword: "agent tool guardrails",
          volume: {
            available: false,
            reason: "No live keyword provider configured",
          },
          difficulty: {
            available: false,
            reason: "No live keyword provider configured",
          },
          cpc: {
            available: false,
            reason: "No live keyword provider configured",
          },
        },
      ],
    }),
  );

await agent.run({
  prompt: "/blog Draft a practical Medium article about agent tool guardrails.",
  budget: { maxToolCalls: 4 },
});
