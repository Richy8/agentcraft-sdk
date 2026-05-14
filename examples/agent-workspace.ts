import {
  Agent,
  AgentCache,
  AgentWorkspace,
  FileArtifactStore,
  Provider,
} from "agentcraft";
import { FileSystemAdapter, TavilySearchAdapter } from "agentcraft/adapters";
import { AgentTeam } from "agentcraft/team";

// Workspace keeps shared runtime concerns in one place: cache, tools, policy,
// budget, store, and lightweight events.
const workspace = AgentWorkspace.create({
  cache: AgentCache.file(".cache", {
    strategy: "auto",
    namespace: "acme-research",
    version: "v1",
  }),
  store: FileArtifactStore({ root: ".artifacts" }),
  adapters: [
    TavilySearchAdapter.connect({ apiKey: process.env.TAVILY_API_KEY! }),
    FileSystemAdapter.connect({ rootPath: "./content", readOnly: false }),
  ],
  toolPolicy: { redactSecrets: true, maxResultBytes: 200_000 },
  budget: { maxCost: 8, maxToolCalls: 30 },
});

workspace.events.on("cache.hit", ({ toolName, estimatedSavedTokens }) => {
  console.log(
    `Cache hit: ${toolName} saved about ${estimatedSavedTokens ?? 0} tokens`,
  );
});

workspace.events.on("approval.requested", ({ toolName }) => {
  console.warn(`Approval needed for ${toolName}`);
});

const researcher = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
});

const writer = Agent.create({
  model: Provider.anthropic["claude-sonnet-4-6"],
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const team = AgentTeam.create({
  workspace,
  orchestrator: researcher,
  members: [
    { role: "researcher", agent: researcher },
    { role: "writer", agent: writer },
  ],
  // Research stays read-only; writer can use write-capable tools when approved.
  rolePolicies: {
    researcher: { readOnly: true },
    writer: { allowSideEffects: true },
  },
});

const response = await team.run({
  prompt: "Research and write a 1200-word article on AI caching strategies.",
});

console.log(response.content);
console.log("Cache hits:", response.cache?.hits ?? 0);
