import { Agent, Provider } from "agentcraft";
import { EmailAdapter, SlackAdapter } from "agentcraft/adapters";
import { SlackMCP } from "agentcraft/mcp";
import { EmailDraftSkill, SummarizeSkill } from "agentcraft/skills";

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  // SlackMCP is useful when your organization prefers MCP-hosted Slack tooling.
  // It requires a bot token and team id. Keep the token scoped to the channels
  // and actions the agent is allowed to perform.
  .use(
    SlackMCP.connect({
      botToken: process.env.SLACK_BOT_TOKEN!,
      teamId: process.env.SLACK_TEAM_ID!,
    }),
  )
  // SlackAdapter is the native adapter path. This example intentionally shows
  // MCP and native adapters together because teams often migrate gradually.
  .use(
    SlackAdapter.connect({
      token: process.env.SLACK_BOT_TOKEN!,
      defaultChannel: "support-escalations",
    }),
  )
  // EmailAdapter exposes draft/send style email tools. provider is mandatory.
  // Values: 'sendgrid', 'resend', or 'smtp'. SMTP is a placeholder that expects
  // a host application mailer integration, so this example uses Resend.
  .use(
    EmailAdapter.connect({
      provider: "resend",
      apiKey: process.env.RESEND_API_KEY!,
      from: "support@example.com",
    }),
  )
  // SummarizeSkill handles incident/thread condensation. EmailDraftSkill handles
  // customer-facing copy and depends on EmailAdapter.
  .use(SummarizeSkill.create())
  .use(EmailDraftSkill.create());

const response = await agent.run({
  prompt: [
    "Summarize the latest support escalation thread, then draft a customer update.",
    "The draft should be empathetic, concrete, and should not promise an ETA.",
  ].join("\n"),
  toolPolicy: {
    timeoutMs: 12_000,
    // external allows network-backed Slack/MCP lookups. Keep email sending
    // approval-gated because it is customer-visible.
    readOnly: false,
    onApprovalRequired: async ({ tool }) => {
      if (tool.name.includes("send")) return false;
      return true;
    },
  },
  budget: {
    maxToolCalls: 6,
  },
});

console.log(response.content);
