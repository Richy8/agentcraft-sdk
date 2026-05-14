import { Agent, Provider } from "agentcraft";
import { AgentTeam } from "agentcraft/team";

const root = Agent.create({
  // root is required for AgentTeam.spawn(). It designs the team first, then
  // clones itself into role-specific members with cloneWithSystem().
  name: "root-orchestrator",
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const supervisor = root.cloneWithSystem(
  "Review final answers for correctness, missing risks, and unsupported claims.",
  "supervisor",
);

const team = AgentTeam.spawn({
  root,
  supervisor,
  // roleHints is optional. It nudges the spawn phase toward useful roles while
  // still allowing the root agent to decide what is needed for the task.
  roleHints: ["researcher", "architect", "reviewer"],
  // maxAgents is optional and defaults to 5. Keep it low for predictable cost.
  maxAgents: 3,
  // executionHint is optional. Values: 'parallel', 'sequential', 'pipeline', 'auto'.
  executionHint: "parallel",
  // mode is optional. 'planner-executor-reviewer' adds explicit planning and
  // review guidance to the orchestration prompt.
  mode: "planner-executor-reviewer",
  // onMemberError is optional. Values: 'retry', 'skip', or 'fail'.
  onMemberError: "skip",
  maxRounds: 4,
  maxRevisions: 2,
  maxSupervisorReviews: 1,
  roleBudgets: {
    orchestrator: { maxTokens: 6_000, maxCost: 0.03 },
    supervisor: { maxTokens: 2_000, maxCost: 0.01 },
    researcher: { maxTokens: 4_000, maxCost: 0.02 },
    architect: { maxTokens: 4_000, maxCost: 0.02 },
    reviewer: { maxTokens: 2_000, maxCost: 0.01 },
  },
});

const response = await team.run({
  prompt:
    "Design a production-readiness plan for a TypeScript agent framework.",
  trace: true,
});

console.log(response.rounds, response.agentsUsed, response.content);
await team.dispose();
