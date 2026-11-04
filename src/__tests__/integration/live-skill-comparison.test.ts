/**
 * Bare agent vs. skill-enhanced agent comparison.
 *
 * Runs the same prompt through:
 *   A. Bare agent   — no system prompt, no skill
 *   B. Skilled agent — Skill.define() with Level 1 + Level 2 instructions + Level 3 file
 *
 * For each of:
 *   - openai:gpt-4o-mini
 *   - anthropic:claude-haiku-4-5-20251001
 *
 * Scoring dimensions (deterministic, no LLM judge):
 *   1. Structure    — numbered list, clear sections
 *   2. Specificity  — concrete claims vs vague statements
 *   3. Filler-free  — absence of filler phrases
 *   4. Compliance   — follows skill markers (end signature)
 *   5. Conciseness  — word count within target range
 *
 * Run with:
 *   INTEGRATION_TESTS=true AGENTCRAFT_LIVE_SKILL_COMPARISON=true \
 *   AGENTCRAFT_LIVE_PROVIDERS=openai,anthropic \
 *   npm run test:int -- src/__tests__/integration/live-skill-comparison.test.ts
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { afterAll, describe, expect, it } from 'vitest';
import { Agent } from '../../agent/agent.js';
import { Skill } from '../../agent/skills/skill.js';
import type { AgentResponse } from '../../agent/types.js';

// ---------------------------------------------------------------------------
// Gate
// ---------------------------------------------------------------------------

const integrationEnabled = process.env.INTEGRATION_TESTS === 'true';
const comparisonEnabled = process.env.AGENTCRAFT_LIVE_SKILL_COMPARISON === 'true';
const enabledProviders = parseProviderSelection(process.env.AGENTCRAFT_LIVE_PROVIDERS);
const liveIt = integrationEnabled && comparisonEnabled ? it : it.skip;

// ---------------------------------------------------------------------------
// Skill under test
// ---------------------------------------------------------------------------

const PRECISION_WRITER = Skill.define({
  name: 'precision-writer',
  description:
    'Produces structured, concise technical writing with clear sections and measurable claims.',
  instructions: `
## Precision Writer — Output Contract

Structure every response as:
  1. One-sentence hook: state the core claim directly (no preamble)
  2. Three supporting points, each on its own line, each with a concrete example
  3. One-sentence actionable takeaway

Hard rules:
  - 150–220 words total (count carefully)
  - No filler phrases: "In today's world", "It is important to note", "In conclusion"
  - Every claim must be specific — name a number, a system, or a measurable outcome
  - Active voice only
  - End your response with the exact line: ─── end ───
`.trim(),
  files: {
    'tone-guide.txt': `
Tone: direct, confident, senior-engineer level
Audience: engineering leads evaluating production AI systems
Avoid: buzzwords ("revolutionize", "game-changing"), hedging ("might", "could potentially")
Good opener examples:
  "Agent memory cuts redundant API calls by storing session context across runs."
  "Stateless LLM calls lose all context on every request — agents with memory don't."
Bad opener examples:
  "In today's rapidly evolving AI landscape..."
  "It is important to understand that..."
`.trim(),
  },
});

// ---------------------------------------------------------------------------
// Models to compare (both providers support skills — skills are prompt injection)
// ---------------------------------------------------------------------------

const MODELS = [
  {
    label: 'openai:gpt-4o-mini',
    provider: 'openai',
    model: 'gpt-4o-mini',
    apiKeyEnv: 'OPENAI_API_KEY',
  },
  {
    label: 'anthropic:claude-haiku-4-5-20251001',
    provider: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
  },
] as const;

// ---------------------------------------------------------------------------
// Test prompt — same for every run
// ---------------------------------------------------------------------------

const PROMPT =
  'Write about why AI agents with persistent memory are better than stateless LLM calls for production applications.';

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

interface ScoreResult {
  structure: number;    // 0–2: numbered list, clear sections present
  specificity: number;  // 0–2: concrete claims (numbers, system names, measurables)
  fillerFree: number;   // 0–2: absence of known filler phrases
  compliance: number;   // 0–2: skill signature + word-count compliance
  conciseness: number;  // 0–2: word count 100–250 range vs bare bloat
  total: number;        // 0–10
}

const FILLER_PHRASES = [
  /in today'?s (rapidly )?evolving/i,
  /it is important to (note|understand)/i,
  /in conclusion/i,
  /it'?s worth noting/i,
  /at the end of the day/i,
  /game.?changing/i,
  /revolutioni[sz]/i,
  /needless to say/i,
];

const SPECIFICITY_SIGNALS = [
  /\d+%/,                          // percentages
  /\d+x\b/,                        // multipliers
  /\$[\d,.]+/,                     // dollar amounts
  /\b(redis|postgres|qdrant|pinecone|supabase|openai|anthropic|gpt|claude)\b/i,
  /\b(latency|throughput|tokens?|cost|cache|vector|embed)/i,
  /\d+\s*(ms|seconds?|minutes?|hours?)/i,
];

const STRUCTURE_SIGNALS = [
  /^\s*\d+\./m,                   // numbered list item
  /^\s*[-•*]/m,                   // bullet point
  /\n.*\n.*\n/,                   // at least 3 lines
];

function score(content: string, isSkilled: boolean): ScoreResult {
  const words = content.trim().split(/\s+/).length;

  // Structure (0–2)
  const structureHits = STRUCTURE_SIGNALS.filter((r) => r.test(content)).length;
  const structure = Math.min(2, structureHits);

  // Specificity (0–2)
  const specificHits = SPECIFICITY_SIGNALS.filter((r) => r.test(content)).length;
  const specificity = specificHits >= 3 ? 2 : specificHits >= 1 ? 1 : 0;

  // Filler-free (0–2): 2 if no fillers, 1 if one filler, 0 if two+
  const fillerHits = FILLER_PHRASES.filter((r) => r.test(content)).length;
  const fillerFree = fillerHits === 0 ? 2 : fillerHits === 1 ? 1 : 0;

  // Compliance (0–2): skilled agent should include "─── end ───" and stay in range
  let compliance = 0;
  if (isSkilled) {
    if (content.includes('─── end ───')) compliance += 1;
    if (words >= 100 && words <= 280) compliance += 1;
  } else {
    // bare agent: just give 1 point for responding meaningfully
    compliance = content.length > 50 ? 1 : 0;
  }

  // Conciseness (0–2): 150–250 is ideal; penalise bloat >350 or too short <80
  const conciseness = words >= 150 && words <= 250 ? 2 : words >= 80 && words <= 350 ? 1 : 0;

  const total = structure + specificity + fillerFree + compliance + conciseness;
  return { structure, specificity, fillerFree, compliance, conciseness, total };
}

// ---------------------------------------------------------------------------
// Report helpers
// ---------------------------------------------------------------------------

interface RunResult {
  label: string;
  bare: { response: AgentResponse; score: ScoreResult };
  skilled: { response: AgentResponse; score: ScoreResult };
}

const allResults: RunResult[] = [];

afterAll(async () => {
  if (allResults.length === 0) return;
  await mkdir('reports', { recursive: true });
  await writeFile(
    'reports/agentcraft-skill-comparison.md',
    renderReport(allResults),
    'utf8',
  );
  console.log('\n📊 Skill comparison report written to reports/agentcraft-skill-comparison.md\n');
});

function bar(n: number, max: number = 10): string {
  const filled = Math.round((n / max) * 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function renderReport(results: RunResult[]): string {
  const lines: string[] = [
    '# AgentCraft — Bare vs. Skilled Agent Comparison',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `**Prompt:** ${PROMPT}`,
    '',
    '**Skill:** `precision-writer` (Level 1 + Level 2 instructions + Level 3 tone-guide.txt)',
    '',
    '**Scoring** (each dimension 0–2, total 0–10):',
    '| Dimension | What it measures |',
    '|---|---|',
    '| Structure | Numbered lists, sections, multi-line layout |',
    '| Specificity | Concrete claims: numbers, system names, measurables |',
    '| Filler-free | Absence of filler/hedge phrases |',
    '| Compliance | Followed skill contract (end signature, word count) |',
    '| Conciseness | Word count in target range (150–250) |',
    '',
    '---',
    '',
  ];

  for (const result of results) {
    const { label, bare, skilled } = result;
    const delta = skilled.score.total - bare.score.total;
    const deltaStr = delta >= 0 ? `+${delta}` : `${delta}`;

    lines.push(
      `## ${label}`,
      '',
      '### Score Summary',
      '',
      `| Dimension | Bare | Skilled | Δ |`,
      `|---|:---:|:---:|:---:|`,
      `| Structure    | ${bare.score.structure}/2 | ${skilled.score.structure}/2 | ${skilled.score.structure - bare.score.structure >= 0 ? '+' : ''}${skilled.score.structure - bare.score.structure} |`,
      `| Specificity  | ${bare.score.specificity}/2 | ${skilled.score.specificity}/2 | ${skilled.score.specificity - bare.score.specificity >= 0 ? '+' : ''}${skilled.score.specificity - bare.score.specificity} |`,
      `| Filler-free  | ${bare.score.fillerFree}/2 | ${skilled.score.fillerFree}/2 | ${skilled.score.fillerFree - bare.score.fillerFree >= 0 ? '+' : ''}${skilled.score.fillerFree - bare.score.fillerFree} |`,
      `| Compliance   | ${bare.score.compliance}/2 | ${skilled.score.compliance}/2 | ${skilled.score.compliance - bare.score.compliance >= 0 ? '+' : ''}${skilled.score.compliance - bare.score.compliance} |`,
      `| Conciseness  | ${bare.score.conciseness}/2 | ${skilled.score.conciseness}/2 | ${skilled.score.conciseness - bare.score.conciseness >= 0 ? '+' : ''}${skilled.score.conciseness - bare.score.conciseness} |`,
      `| **Total**    | **${bare.score.total}/10** | **${skilled.score.total}/10** | **${deltaStr}** |`,
      '',
      `Bare:    ${bar(bare.score.total)} ${bare.score.total}/10`,
      `Skilled: ${bar(skilled.score.total)} ${skilled.score.total}/10`,
      '',
      `Words — bare: ${bare.response.content.trim().split(/\s+/).length} | skilled: ${skilled.response.content.trim().split(/\s+/).length}`,
      `Tokens — bare: ${bare.response.tokensUsed.total} | skilled: ${skilled.response.tokensUsed.total}`,
      `Cost   — bare: $${bare.response.cost.toFixed(6)} | skilled: $${skilled.response.cost.toFixed(6)}`,
      '',
      '### Bare Agent Output',
      '',
      '```text',
      bare.response.content.trim(),
      '```',
      '',
      '### Skilled Agent Output',
      '',
      '```text',
      skilled.response.content.trim(),
      '```',
      '',
      '---',
      '',
    );
  }

  // Overall summary
  if (results.length > 1) {
    const avgBare = results.reduce((s, r) => s + r.bare.score.total, 0) / results.length;
    const avgSkilled = results.reduce((s, r) => s + r.skilled.score.total, 0) / results.length;
    lines.push(
      '## Overall Summary',
      '',
      `| | Bare avg | Skilled avg | Improvement |`,
      `|---|:---:|:---:|:---:|`,
      `| Score (0–10) | ${avgBare.toFixed(1)} | ${avgSkilled.toFixed(1)} | +${(avgSkilled - avgBare).toFixed(1)} |`,
      '',
    );
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('bare vs. skilled agent comparison', () => {
  for (const model of MODELS) {
    const apiKey = process.env[model.apiKeyEnv];
    const providerEnabled = enabledProviders.has(model.provider);
    const modelIt = liveIt && providerEnabled && apiKey ? it : it.skip;

    modelIt(
      `${model.label} — bare vs. precision-writer skill`,
      async () => {
        const commonConfig = {
          model: `${model.provider}:${model.model}`,
          apiKey: apiKey!,
          temperature: 0,
          maxTokens: 512,
          toolSelection: 'auto' as const,
          retry: { maxAttempts: 2, backoff: 'fixed' as const, initialDelay: 500, maxDelay: 500 },
        };

        // ── Bare agent ──────────────────────────────────────────────────────
        const bareAgent = Agent.create(commonConfig);
        const bareResponse = await bareAgent.run({
          prompt: PROMPT,
          temperature: 0,
          maxTokens: 512,
        });

        // ── Skilled agent ───────────────────────────────────────────────────
        const skilledAgent = Agent.create(commonConfig).use(PRECISION_WRITER);
        const skilledResponse = await skilledAgent.run({
          prompt: PROMPT,
          temperature: 0,
          maxTokens: 512,
        });

        // ── Score ───────────────────────────────────────────────────────────
        const bareScore = score(bareResponse.content, false);
        const skilledScore = score(skilledResponse.content, true);

        // ── Console summary ─────────────────────────────────────────────────
        console.log(`\n${'─'.repeat(60)}`);
        console.log(`Model: ${model.label}`);
        console.log(`${'─'.repeat(60)}`);
        console.log(`BARE    [${bareScore.total}/10] ${bar(bareScore.total)}`);
        console.log(`  structure:${bareScore.structure} specificity:${bareScore.specificity} filler-free:${bareScore.fillerFree} compliance:${bareScore.compliance} concise:${bareScore.conciseness}`);
        console.log(`  words: ${bareResponse.content.trim().split(/\s+/).length}  tokens: ${bareResponse.tokensUsed.total}  cost: $${bareResponse.cost.toFixed(6)}`);
        console.log(`\nSKILLED [${skilledScore.total}/10] ${bar(skilledScore.total)}`);
        console.log(`  structure:${skilledScore.structure} specificity:${skilledScore.specificity} filler-free:${skilledScore.fillerFree} compliance:${skilledScore.compliance} concise:${skilledScore.conciseness}`);
        console.log(`  words: ${skilledResponse.content.trim().split(/\s+/).length}  tokens: ${skilledResponse.tokensUsed.total}  cost: $${skilledResponse.cost.toFixed(6)}`);
        console.log(`\nΔ score: ${skilledScore.total >= bareScore.total ? '+' : ''}${skilledScore.total - bareScore.total}`);
        console.log(`\n--- BARE OUTPUT ---\n${bareResponse.content.trim()}`);
        console.log(`\n--- SKILLED OUTPUT ---\n${skilledResponse.content.trim()}`);

        // ── Store for report ────────────────────────────────────────────────
        allResults.push({
          label: model.label,
          bare: { response: bareResponse, score: bareScore },
          skilled: { response: skilledResponse, score: skilledScore },
        });

        // ── Assertions ──────────────────────────────────────────────────────
        expect(bareResponse.content.length, 'bare agent responded').toBeGreaterThan(0);
        expect(skilledResponse.content.length, 'skilled agent responded').toBeGreaterThan(0);
        // Skilled agent should score at least as well as bare on structure
        // (soft assertion — logs the delta without failing on tied scores)
        expect(
          skilledScore.total,
          `skilled score (${skilledScore.total}) should be >= bare score (${bareScore.total}) on ${model.label}`,
        ).toBeGreaterThanOrEqual(bareScore.total);
      },
      120_000,
    );
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseProviderSelection(value: string | undefined): Set<string> {
  if (!value || value.trim() === '') return new Set(['openai', 'anthropic']);
  const parts = value.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean);
  return parts.includes('all') ? new Set(['openai', 'anthropic']) : new Set(parts);
}
