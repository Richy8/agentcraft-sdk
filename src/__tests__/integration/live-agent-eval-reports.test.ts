import { describe, expect, it } from "vitest";
import { Agent } from "../../agent/agent.js";
import { AgentEval } from "../../agent/eval/index.js";
import { AgentReports } from "../../agent/reports/index.js";
import { Provider } from "../../agent/provider-catalog.js";

const integrationEnabled = process.env.INTEGRATION_TESTS === "true";
const evalEnabled = process.env.AGENTCRAFT_LIVE_EVALS === "true";
const openAiEnabled = parseProviderSelection(
  process.env.AGENTCRAFT_LIVE_PROVIDERS,
).has("openai");
const openAiKey = process.env.OPENAI_API_KEY;
const liveIt =
  integrationEnabled && evalEnabled && openAiEnabled && openAiKey ? it : it.skip;
const liveModel = process.env.AGENTCRAFT_LIVE_OPENAI_MODEL ?? "gpt-4o-mini";

describe("live AgentEval and AgentReports", () => {
  liveIt("runs a light eval and emits a redacted report", async () => {
    const agent = Agent.create({
      model:
        Provider.openai[liveModel as keyof typeof Provider.openai] ??
        `openai:${liveModel}`,
      apiKey: openAiKey!,
      maxTokens: 80,
      temperature: 0,
      retry: {
        maxAttempts: 1,
        backoff: "fixed",
        initialDelay: 100,
        maxDelay: 100,
      },
    });

    const suite = AgentEval.suite({
      name: "Live Eval Smoke",
      defaults: { maxTotalTokens: 2_000, maxCostUsd: 0.03 },
    }).case({
      name: "cache sentence",
      prompt: "In one sentence, explain why cache hit rate matters for AI agent cost.",
      assertions: [AgentEval.assert.matches(/cache|cost/i)],
    });

    const report = await AgentEval.run({ agent, suite });
    const response = report.results[0]!.response;
    const runReport = AgentReports.fromResponse(response, {
      title: "Live Eval Smoke Report",
    });

    expect(report.status).not.toBe("failed");
    expect(JSON.stringify(runReport)).not.toContain(openAiKey);
  });
});

function parseProviderSelection(value: string | undefined): Set<string> {
  if (!value || value === "all") return new Set(["openai"]);
  return new Set(
    value
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}
