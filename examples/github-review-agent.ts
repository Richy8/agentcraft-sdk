import { Agent, Provider } from "agentcraft";
import { GitHubAdapter } from "agentcraft/adapters";

const agent = Agent.create({
  // Use a stronger model for code review because quality matters more than cost.
  model: Provider.openai["gpt-4o"],
  apiKey: process.env.OPENAI_API_KEY!,
  // This example only reads GitHub data. Keep write-capable tools blocked.
  toolPolicy: { readOnly: true },
}).use(
  GitHubAdapter.connect({
    // token is required for the native GitHub adapter.
    // Use a least-privilege token. For read-only review, repo read scopes are enough.
    token: process.env.GITHUB_TOKEN!,
    // Repository allowlists prevent an agent from wandering across org data.
    // Required for safe production usage. Values are 'owner/repo' strings.
    allowedRepos: ["owner/repo"],
  }),
);

const response = await agent.run({
  prompt:
    "Read the latest pull requests for owner/repo and identify review risks.",
});

console.log(response.content);
