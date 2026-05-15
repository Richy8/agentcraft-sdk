import { Agent, Provider } from "@deskcreate/agentcraft";
import { FetchAdapter } from "@deskcreate/agentcraft/adapters";
import { ResearchSkill } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  // FetchAdapter wraps fetched content as untrusted and enforces URL policy.
  // allowedDomains is optional but recommended. Omit only for broad web agents.
  .use(FetchAdapter.connect({ allowedDomains: ["example.com"] }))
  // ResearchSkill contributes a structured research-oriented system prompt.
  // Most skills accept optional configuration in their create() method; omit
  // config for the standard built-in behavior.
  .use(ResearchSkill.create());

const response = await agent.run({
  prompt: "Research https://example.com and produce a concise brief.",
});

console.log(response.content);
