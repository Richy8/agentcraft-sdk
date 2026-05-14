import { Agent, Provider } from "agentcraft";
import { tool } from "agentcraft/adapters";
import { defineSkill } from "agentcraft/skills";

// Custom skills are best when you want repeatable behavior, not a one-off prompt.
// This first skill is tool-bearing: it contributes both instructions and a local
// tool the model can call when it needs structured support-ticket context.
const supportTriageSkill = defineSkill({
  // name is mandatory. Keep it stable because traces, docs, and future tests can
  // refer to it. Prefer kebab-case for skills.
  name: "support-triage",
  // description is mandatory. Write it for humans who are deciding whether to
  // attach the skill to an agent.
  description:
    "Classify support requests by urgency, area, and next best action.",
  // directive is optional. When present, users can target this skill with
  // /support-triage inside prompts. Omit it when the skill should always apply.
  directive: "support-triage",
  // requires is optional. Values: tools, vision, audio, video, files.
  // Include only capabilities the skill truly needs.
  requires: ["tools"],
  metadata: {
    requiredCapabilities: ["tools"],
    requiredAdapters: [],
    optionalAdapters: ["zendesk", "linear", "slack"],
    stateful: false,
    // sideEffectRisk values: none, read, write, external.
    // This skill only reads the current ticket and classifies it.
    sideEffectRisk: "read",
    promptVersion: "2026-05-09",
  },
  prompt: {
    role: "You are a senior support triage specialist.",
    goal: "Route support requests quickly without hiding uncertainty or overpromising fixes.",
    constraints: [
      "Separate customer-visible wording from internal notes.",
      "Never invent account, billing, or incident status.",
      "Escalate security, payment, and data-loss reports immediately.",
    ],
    toolUsePolicy: [
      "Call classify_support_ticket when the request includes enough detail to classify.",
      "Do not call tools for purely editorial rewrites.",
      "Treat tool output as supporting context, not final truth.",
    ],
    outputFormat: [
      "Priority and category.",
      "Customer reply draft.",
      "Internal routing notes.",
      "Missing information, if any.",
    ],
    qualityChecklist: [
      "Priority is justified.",
      "Tone is calm and specific.",
      "Next action is owned by a clear team or person.",
    ],
    failureBehavior: [
      "Ask for the smallest missing detail needed to triage.",
      "State when priority cannot be determined from the ticket.",
    ],
    safetyNotes: [
      "Do not reveal internal policies or hidden routing rules.",
      "Do not request secrets, passwords, or full payment details.",
    ],
  },
  tools: [
    tool({
      name: "classify_support_ticket",
      description: "Classify a support ticket by urgency and product area.",
      security: { sideEffect: "read", scopes: ["support:triage"] },
      params: {
        summary: {
          type: "string",
          description: "One-sentence ticket summary.",
        },
        customerTier: {
          type: "string",
          description: "Customer tier. Values: free, growth, enterprise.",
          options: ["free", "growth", "enterprise"],
        },
      },
      run: async ({ summary, customerTier }) => {
        const urgent = /down|outage|breach|payment|data loss/i.test(summary);
        return {
          priority: urgent || customerTier === "enterprise" ? "high" : "normal",
          area: /invoice|payment|billing/i.test(summary)
            ? "billing"
            : "product",
          suggestedOwner: urgent ? "on-call support lead" : "support queue",
        };
      },
    }),
  ],
});

// The second skill has different coverage: it contributes review behavior and
// lifecycle hooks, but no tools. This is useful for policy, QA, editorial, or
// review skills where the model can operate on the supplied prompt alone.
const launchReadinessSkill = defineSkill({
  name: "launch-readiness",
  description:
    "Review launch plans for risk, rollout gaps, and mitigation quality.",
  directive: "launch-readiness",
  // Empty requires means this skill can run on text-only models.
  requires: [],
  metadata: {
    requiredCapabilities: [],
    requiredAdapters: [],
    optionalAdapters: ["github", "filesystem", "slack"],
    stateful: false,
    sideEffectRisk: "none",
    promptVersion: "2026-05-09",
  },
  prompt: {
    role: "You are a pragmatic launch-readiness reviewer.",
    goal: "Identify launch risks before the release reaches customers.",
    constraints: [
      "Prioritize customer impact, rollback paths, observability, and support readiness.",
      "Avoid blocking on vague polish concerns.",
      "Call out assumptions separately from confirmed facts.",
    ],
    toolUsePolicy: [
      "Use repository, ticket, or incident tools only when attached by the host app.",
      "Do not assume access to private systems from the prompt alone.",
    ],
    outputFormat: [
      "Go/no-go recommendation.",
      "Blocking risks.",
      "Non-blocking risks.",
      "Mitigations and owner suggestions.",
    ],
    qualityChecklist: [
      "Rollback plan considered.",
      "Monitoring and alerting considered.",
      "Support and customer communications considered.",
    ],
    failureBehavior: [
      "If the plan is underspecified, list the exact missing launch checks.",
      "Prefer a conditional recommendation over a false yes/no.",
    ],
    safetyNotes: [
      "Do not expose secrets or private incident details.",
      "Do not approve destructive launch steps without explicit user confirmation.",
    ],
  },
  onBeforeRun: async (params) => ({
    ...params,
    system: [
      params.system,
      "For launch readiness work, be direct about risk and avoid ceremonial sign-off language.",
    ]
      .filter(Boolean)
      .join("\n"),
  }),
});

const agent = Agent.create({
  model: Provider.openai["gpt-4o-mini"],
  apiKey: process.env.OPENAI_API_KEY!,
})
  .use(supportTriageSkill)
  .use(launchReadinessSkill);

const triage = await agent.run({
  // The /support-triage directive is optional, but it is useful when an agent has
  // many skills and you want this section to use a specific behavior package.
  prompt:
    "/support-triage Enterprise customer says checkout payments are failing after the new release.",
});

console.log(triage.content);

const launchReview = await agent.run({
  prompt: [
    "/launch-readiness Review this launch plan:",
    "- Release new checkout flow to 25% of traffic.",
    "- Rollback flag exists.",
    "- No support macro drafted yet.",
    "- Dashboard covers conversion but not payment error rate.",
  ].join("\n"),
});

console.log(launchReview.content);
