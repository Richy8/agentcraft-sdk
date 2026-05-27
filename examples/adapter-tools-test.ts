/**
 * Adapter + Tools benchmark
 *
 * Demonstrates how adapters and tools work after the skills/traits/packs removal.
 * Three scenarios measured side by side:
 *   1. Plain agent — no adapters, no tools, free-form answer
 *   2. Custom adapter — agent with a hand-rolled tool via createAdapter + tool()
 *   3. Built-in adapter — SeoAdapter (read-only SERP + keyword tools) with ToolPolicy
 *
 * Each scenario prints tokens used, latency, and the response content so you can
 * compare quality and cost at a glance.
 */

import { Agent, Provider } from "@deskcreate/agentcraft";
import { createAdapter, tool } from "@deskcreate/agentcraft/adapters";
import { SeoAdapter } from "@deskcreate/agentcraft/adapters";

const MODEL = Provider.openai["gpt-4o-mini"];
const API_KEY = process.env.OPENAI_API_KEY!;

function separator(label: string) {
  console.log(`\n${"─".repeat(60)}`);
  console.log(`  ${label}`);
  console.log("─".repeat(60));
}

function report(label: string, result: { content: string; tokensUsed?: { total?: number }; latencyMs?: number }) {
  console.log(`\n[${label}]`);
  console.log(`  tokens : ${result.tokensUsed?.total ?? "n/a"}`);
  console.log(`  latency: ${result.latencyMs ?? "n/a"}ms`);
  console.log(`  output :`);
  console.log(result.content.trim().split("\n").map((l) => `    ${l}`).join("\n"));
}

// ── Scenario 1: Plain agent ──────────────────────────────────────────────────

separator("Scenario 1 — Plain agent (no adapters, no tools)");

const plainAgent = Agent.create({ model: MODEL, apiKey: API_KEY });

const t1 = Date.now();
const plain = await plainAgent.run({
  prompt: "What is the average monthly search volume for the keyword 'typescript tutorial'? Give a specific number.",
});
const latency1 = Date.now() - t1;

report("plain", { ...plain, latencyMs: latency1 });

// ── Scenario 2: Custom adapter ───────────────────────────────────────────────

separator("Scenario 2 — Custom adapter (createAdapter + tool)");

const auditLog: string[] = [];

const mathAdapter = createAdapter({
  name: "math",
  metadata: {
    kind: "custom",
    auth: "none",
    sideEffects: ["none"],
    scopes: ["math.compute"],
    readOnly: true,
  },
  tools: [
    tool({
      name: "compound_interest",
      description: "Calculate compound interest given principal, annual rate, and years.",
      security: { sideEffect: "none" },
      params: {
        principal: { type: "number", description: "Starting amount in USD." },
        rate: { type: "number", description: "Annual interest rate as a decimal (e.g. 0.07 = 7%)." },
        years: { type: "number", description: "Number of years." },
      },
      run: async ({ principal, rate, years }) => {
        const result = principal * Math.pow(1 + rate, years);
        return { result: parseFloat(result.toFixed(2)), formula: `${principal} × (1 + ${rate})^${years}` };
      },
    }),
    tool({
      name: "percentage_change",
      description: "Calculate the percentage change between two values.",
      security: { sideEffect: "none" },
      params: {
        from: { type: "number", description: "Starting value." },
        to: { type: "number", description: "Ending value." },
      },
      run: async ({ from, to }) => {
        const pct = ((to - from) / from) * 100;
        return { change: parseFloat(pct.toFixed(2)), direction: pct >= 0 ? "increase" : "decrease" };
      },
    }),
  ],
});

const mathAgent = Agent.create({
  model: MODEL,
  apiKey: API_KEY,
  toolPolicy: {
    allowSideEffects: true,
    onAuditEvent: (evt) => auditLog.push(`${evt.type}:${("toolName" in evt ? evt.toolName : "")}`),
  },
}).use(mathAdapter);

const t2 = Date.now();
const mathResult = await mathAgent.run({
  prompt:
    "I invest $10,000 at 7% annually. What will it be worth in 20 years? " +
    "Also, what is the percentage change from the initial to final amount?",
});
const latency2 = Date.now() - t2;

report("math-adapter", { ...mathResult, latencyMs: latency2 });
console.log(`  tool calls : ${auditLog.filter((e) => e.startsWith("tool_start")).map((e) => e.split(":")[1]).join(", ")}`);

// ── Scenario 3: Built-in adapter + ToolPolicy ────────────────────────────────

separator("Scenario 3 — Built-in SeoAdapter + read-only ToolPolicy");

const seoAudit: string[] = [];

const seoAgent = Agent.create({
  model: MODEL,
  apiKey: API_KEY,
  toolPolicy: {
    readOnly: true,
    onAuditEvent: (evt) => seoAudit.push(`${evt.type}:${("toolName" in evt ? evt.toolName : "")}`),
  },
}).use(
  SeoAdapter.connect({
    serpResults: [
      { position: 1, url: "https://www.typescriptlang.org/docs/", title: "TypeScript Docs", snippet: "Official documentation." },
      { position: 2, url: "https://roadmap.sh/typescript", title: "TypeScript Roadmap", snippet: "Step-by-step learning path." },
      { position: 3, url: "https://basarat.gitbook.io/typescript/", title: "TypeScript Deep Dive", snippet: "Free open-source book." },
    ],
    keywordMetrics: [
      {
        keyword: "typescript tutorial",
        volume: { available: true, value: 40500 },
        difficulty: { available: true, value: 62 },
        cpc: { available: true, value: 1.85 },
      },
    ],
  })
);

const t3 = Date.now();
const seoResult = await seoAgent.run({
  prompt:
    "Look up SERP results for 'typescript tutorial' and keyword metrics. " +
    "Give me: top 3 organic results, monthly search volume, keyword difficulty, and CPC. " +
    "Then recommend whether I should target this keyword.",
});
const latency3 = Date.now() - t3;

report("seo-adapter", { ...seoResult, latencyMs: latency3 });
console.log(`  tool calls : ${seoAudit.filter((e) => e.startsWith("tool_start")).map((e) => e.split(":")[1]).join(", ")}`);

// ── Summary ──────────────────────────────────────────────────────────────────

separator("Summary");
console.log(`
  Scenario               Tokens   Latency   Tools called
  ─────────────────────────────────────────────────────
  1. Plain agent         ${String(plain.tokensUsed?.total ?? "?").padEnd(8)} ${String(latency1 + "ms").padEnd(9)} none
  2. Custom math adapter ${String(mathResult.tokensUsed?.total ?? "?").padEnd(8)} ${String(latency2 + "ms").padEnd(9)} ${auditLog.filter((e) => e.startsWith("tool_start")).map((e) => e.split(":")[1]).join(", ")}
  3. SeoAdapter (r/o)    ${String(seoResult.tokensUsed?.total ?? "?").padEnd(8)} ${String(latency3 + "ms").padEnd(9)} ${seoAudit.filter((e) => e.startsWith("tool_start")).map((e) => e.split(":")[1]).join(", ")}
`);
