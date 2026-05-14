import { Agent, Provider } from "agentcraft";
import { FileSystemAdapter, GitHubAdapter } from "agentcraft/adapters";
import { CodeReviewSkill } from "agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  // FileSystemAdapter gives the agent local repo context.
  // rootPath is mandatory. Keep it as narrow as possible.
  // readOnly true is the safest default for review and analysis workflows.
  .use(
    FileSystemAdapter.connect({
      rootPath: "./src",
      readOnly: true,
      // allowedExtensions is optional. It keeps the agent focused and prevents
      // accidental reads of binary files, build output, or secrets.
      allowedExtensions: [".ts", ".tsx", ".md"],
    }),
  )
  // GitHubAdapter gives the agent remote pull-request context.
  // token is mandatory for private repos and rate-limit-friendly public access.
  // owner/repo are optional defaults; omit them if each run supplies repo scope.
  .use(
    GitHubAdapter.connect({
      token: process.env.GITHUB_TOKEN!,
      defaultOwner: "acme",
      defaultRepo: "checkout-service",
      allowedRepos: ["acme/checkout-service"],
    }),
  )
  // CodeReviewSkill contributes review-specific prompt behavior and requires
  // either filesystem or GitHub tooling. We attach both so it can compare local
  // source context with remote PR context when the app allows it.
  .use(CodeReviewSkill.create());

const review = await agent.run({
  prompt: [
    "/code-review Review the checkout retry changes.",
    "Focus on payment safety, idempotency, timeout behavior, and missing tests.",
  ].join("\n"),
  toolPolicy: {
    timeoutMs: 15_000,
    // readOnly true allows inspections while blocking mutation-oriented tools.
    readOnly: true,
    // requireApproval defaults depend on tool metadata. Set a callback when your
    // product wants human review before tool execution.
    onApprovalRequired: async ({ tool }) => {
      console.log(`Approval requested for ${tool.name}`);
      return false;
    },
  },
  budget: {
    maxToolCalls: 8,
  },
});

console.log(review.content);
