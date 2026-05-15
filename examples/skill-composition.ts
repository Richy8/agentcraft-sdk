import { Agent, Provider } from "@deskcreate/agentcraft";
import {
  SummarizeSkill,
  TranslationSkill,
  WritingSkill,
} from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  // Skills add structured system guidance. Compose only skills that share the task goal.
  // Each .create() call can be used with default config, as shown here.
  // Do not combine contradictory skills unless your prompt explains the priority.
  .use(SummarizeSkill.create())
  .use(WritingSkill.create())
  .use(TranslationSkill.create());

const response = await agent.run({
  prompt:
    "Summarize this launch note, rewrite it warmly, then translate it to Spanish: AgentCraft now supports MCP.",
});

console.log(response.content);
