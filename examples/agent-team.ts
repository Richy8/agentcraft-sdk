import { Agent, Provider } from "agentcraft";
import { AgentTeam } from "agentcraft/team";

const root = Agent.create({
  // The root agent acts as orchestrator. Members can be cloned with role-specific systems.
  // model is required. Prefer Provider.* constants over raw strings so TypeScript
  // catches typos. Alternatives include Provider.openai['gpt-4o'] for stronger
  // reasoning or Provider.ollama['llama3.2'] for local/private execution.
  model: Provider.openai["gpt-4o-mini"],
  // apiKey is required for OpenAI cloud models. Omit it for no-auth local
  // providers such as ollama/lmstudio, or use provider-specific fields for
  // Bedrock/Vertex.
  apiKey: process.env.OPENAI_API_KEY!,
});

// cloneWithSystem(system, name) keeps provider config and gives the clone a role.
// The first string is required and becomes that agent's system prompt.
// The second string is optional but recommended; it is used in traces/lookups.
const researcher = root.cloneWithSystem(
  "Act as a careful technical researcher.",
  "researcher",
);
const reviewer = root.cloneWithSystem(
  "Act as a skeptical senior reviewer.",
  "reviewer",
);

const team = AgentTeam.create({
  orchestrator: root,
  members: [
    // role is required and becomes the tool name suffix, trace label, and budget key.
    { role: "researcher", agent: researcher },
    { role: "reviewer", agent: reviewer },
  ],
  // executionHint is optional. Values:
  // - 'parallel': ask all members first, then orchestrate with their outputs
  // - 'sequential': prefer one member after another
  // - 'pipeline': pass work through roles in order
  // - 'auto': let the orchestrator choose
  executionHint: "parallel",
  // mode is optional. Values:
  // - 'orchestrator': default; orchestrator decides when to call members
  // - 'planner-executor-reviewer': adds explicit plan/execute/review guidance
  mode: "planner-executor-reviewer",
  // Role budgets prevent one member from consuming the whole run budget.
  // Keys must match member roles. All fields are optional: maxTokens,
  // maxInputTokens, maxOutputTokens, maxToolCalls, maxCost.
  roleBudgets: {
    researcher: { maxTokens: 8_000 },
    reviewer: { maxTokens: 4_000 },
    orchestrator: { maxTokens: 8_000 },
  },
});

const response = await team.run({
  // prompt is required unless using promptFile.
  prompt: "Prepare a migration plan for moving an AI package to production.",
  // trace can be true for built-in trace output, false/omitted for no trace,
  // or a TraceSink/OpenTelemetry bridge for external observability.
  trace: true,
});

console.log(response.content);
