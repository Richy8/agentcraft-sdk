import { Agent, Provider } from "@deskcreate/agentcraft";
import { HumanizerSkill, WritingSkill } from "@deskcreate/agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  // Skills can add global prompt behavior, but directives let a user target
  // the behavior to one section of a prompt.
  .use(HumanizerSkill.create())
  .use(WritingSkill.create());

const response = await agent.run({
  prompt: [
    "Prepare two versions of this release blurb.",
    "",
    "/humanizer",
    "AgentCraft is a production-grade agent framework for teams building reliable AI workflows.",
    "",
    "/write",
    "Create a short launch paragraph for senior TypeScript engineers.",
  ].join("\n"),
});

console.log(response.content);
