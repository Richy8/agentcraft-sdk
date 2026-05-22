import { mkdir, writeFile } from 'node:fs/promises';
import { afterAll, describe, expect, it } from 'vitest';
import { Agent } from '../../agent/agent.js';
import { tool, type AgentAdapter } from '../../agent/adapters/types.js';
import { AgentCache } from '../../agent/cache/index.js';
import {
  CreatorPacks,
  DataAnalyticsPacks,
  FinancePacks,
  HealthcarePacks,
  MarketingPacks,
  ProductPacks,
  SalesPacks,
  SupportPacks,
} from '../../agent/packs/index.js';

const integrationEnabled = process.env.INTEGRATION_TESTS === 'true';
const skillsLiveEnabled = process.env.AGENTCRAFT_LIVE_SKILLS_CERTIFICATION === 'true';
const maxTokens = Number.parseInt(process.env.AGENTCRAFT_LIVE_SKILLS_MAX_TOKENS ?? '180', 10);

const providers = [
  providerConfig('openai', 'openai', process.env.OPENAI_API_KEY, [
    process.env.AGENTCRAFT_LIVE_OPENAI_MODEL,
    'gpt-4o-mini',
  ]),
  providerConfig('anthropic', 'anthropic', process.env.ANTHROPIC_API_KEY, [
    process.env.AGENTCRAFT_LIVE_ANTHROPIC_MODEL,
    'claude-haiku-4-5-20251001',
  ]),
  providerConfig('gemini', 'gemini', process.env.GOOGLE_API_KEY ?? process.env.GEMINI_API_KEY, [
    process.env.AGENTCRAFT_LIVE_GEMINI_MODEL,
    'gemini-2.5-flash-lite',
  ]),
  providerConfig('cohere', 'cohere', process.env.COHERE_API_KEY, [
    process.env.AGENTCRAFT_LIVE_COHERE_MODEL,
    'command-r7b-12-2024',
  ]),
  providerConfig('deepseek', 'deepseek', process.env.DEEPSEEK_API_KEY, [
    process.env.AGENTCRAFT_LIVE_DEEPSEEK_MODEL,
    'deepseek-chat',
  ]),
  providerConfig('groq', 'groq', process.env.GROQ_API_KEY, [
    process.env.AGENTCRAFT_LIVE_GROQ_MODEL,
    'llama-3.1-8b-instant',
  ]),
] as const;

const selectedProviders = parseProviderSelection(
  process.env.AGENTCRAFT_LIVE_SKILLS_PROVIDERS ?? process.env.AGENTCRAFT_LIVE_PROVIDERS
);
const reportEntries: string[] = [];

interface SkillCertificationCase {
  readonly name: string;
  readonly pack: () => AgentAdapter;
  readonly prompt: string;
  readonly expectedSkill: string;
  readonly score: (content: string) => number;
}

const certificationCases: readonly SkillCertificationCase[] = [
  {
    name: 'creator-medium',
    pack: () => CreatorPacks.medium({ skillActivation: 'auto', readOnlyByDefault: true }),
    prompt:
      'Create a compact Medium article plan about reducing token waste in AI agent workflows. Include audience, angle, outline, evidence, and risk notes. Keep it under 160 words.',
    expectedSkill: 'medium-article-writer',
    score: scoreCreatorPlan,
  },
  {
    name: 'marketing-seo',
    pack: () => MarketingPacks.seo({ skillActivation: 'auto', readOnlyByDefault: true }),
    prompt:
      'Create an SEO content brief for AI agent cost optimization with audience, SERP gap, internal link idea, evidence need, and risk note. Keep it under 160 words.',
    expectedSkill: 'seo-content-brief',
    score: scoreSeoBrief,
  },
  {
    name: 'sales-prospecting',
    pack: () => SalesPacks.prospecting({ skillActivation: 'auto', readOnlyByDefault: true }),
    prompt:
      'Prioritize B2B leads for an AI workflow platform using only this dataset. Acme FinOps: 1,200 employees, Salesforce, new RevOps hiring, public AI ops budget, security review risk. BetaShop: 30 employees, no AI budget, Shopify stack, founder asked about automation. Northstar Health: 4,000 employees, active RFP, HIPAA procurement, 6-month buying cycle. Include fit score, trigger, disqualification risk, outreach angle, and next action. Keep it under 160 words.',
    expectedSkill: 'lead-prioritization',
    score: scoreSalesPlan,
  },
  {
    name: 'finance-stock-research',
    pack: () => FinancePacks.stockResearch({ skillActivation: 'auto', readOnlyByDefault: true }),
    prompt:
      'Produce a compact equity research brief for a semiconductor watchlist using only this snapshot: AI accelerator demand is strong, consumer electronics demand is uneven, foundry capacity is tight, export controls remain a policy risk, and valuations already price high growth. Do not invent earnings dates. Include thesis, catalyst, valuation risk, evidence need, and watchlist action. Keep it under 160 words.',
    expectedSkill: 'equity-research-brief',
    score: scoreFinanceBrief,
  },
  {
    name: 'product-prd',
    pack: () => ProductPacks.prd({ skillActivation: 'auto', readOnlyByDefault: true }),
    prompt:
      'Write a PRD brief for a workspace cache feature with user problem, user story, acceptance criteria, risks, and metric. Keep it under 160 words.',
    expectedSkill: 'prd-writer',
    score: scoreProductBrief,
  },
  {
    name: 'support-customer-support',
    pack: () => SupportPacks.customerSupport({ skillActivation: 'auto', readOnlyByDefault: true }),
    prompt:
      'Triage this refund ticket and draft a support response plan. Ticket: customer bought an annual AI workflow plan 9 days ago, says onboarding failed twice, asks for full refund, tone is frustrated but not abusive. Policy: full refund within 14 days if onboarding blockers are unresolved. Include customer issue, policy check, escalation risk, tone, and next action. Keep it under 160 words.',
    expectedSkill: 'ticket-triage',
    score: scoreSupportBrief,
  },
  {
    name: 'healthcare-medical-research',
    pack: () => HealthcarePacks.medicalResearch({ skillActivation: 'auto', readOnlyByDefault: true }),
    prompt:
      'Perform a compact medical literature synthesis for this patient education topic: hypertension medication adherence. Provided evidence notes: adherence aids and home BP monitoring can improve control, but individual medication changes require clinician review. Do not invent citations. Include evidence grade, guideline caveat, plain-language boundary, and review trigger. Keep it under 160 words.',
    expectedSkill: 'medical-literature-synthesis',
    score: scoreHealthcareBrief,
  },
  {
    name: 'data-analytics-experiment',
    pack: () => DataAnalyticsPacks.experimentAnalysis({ skillActivation: 'auto', readOnlyByDefault: true }),
    prompt:
      'Analyze this A/B test readout: control 10,000 users at 8.0% activation, variant 10,200 users at 8.4%, p=0.08, support tickets rose 9%, test ran during a pricing email campaign. Include metric movement, sample caveat, causality risk, decision recommendation, and next experiment. Keep it under 160 words.',
    expectedSkill: 'ab-test-analysis',
    score: scoreAnalyticsBrief,
  },
];

describe('live skills certification', () => {
  afterAll(async () => {
    if (reportEntries.length === 0) return;
    await mkdir('reports', { recursive: true });
    await writeFile(
      'reports/agentcraft-live-skills-certification.md',
      [
        '# AgentCraft Live Skills Certification',
        '',
        `Generated: ${new Date().toISOString()}`,
        '',
        `Selected providers: ${Array.from(selectedProviders).join(', ')}`,
        '',
        ...reportEntries,
      ].join('\n'),
      'utf8'
    );
  });

  for (const provider of providers) {
    const liveProviderIt =
      integrationEnabled &&
      skillsLiveEnabled &&
      provider.apiKey &&
      selectedProviders.has(provider.name)
        ? it
        : it.skip;

    liveProviderIt(
      `${provider.name}:${provider.model} produces domain skill quality signals`,
      async () => {
        let selectedModel = provider.model;
        let results = await runDomainSkillCertification(provider, selectedModel);
        let failed = results.filter(
          (result) => result.score < 3 || !result.activeSkills.includes(result.expectedSkill),
        );
        let fallbackNote = '';
        if (failed.length > 0 && provider.fallbackModels.length > 0) {
          for (const fallbackModel of provider.fallbackModels) {
            selectedModel = fallbackModel;
            results = await runDomainSkillCertification(provider, selectedModel);
            failed = results.filter(
              (result) => result.score < 3 || !result.activeSkills.includes(result.expectedSkill),
            );
            fallbackNote = `Fallback model used after low-quality response from ${provider.model}: ${fallbackModel}`;
            if (failed.length === 0) break;
          }
        }

        reportEntries.push(
          [
            `## ${provider.name}:${selectedModel}`,
            '',
            '| Case | Expected skill | Active skills | Score | Prompt tokens | Total tokens |',
            '| --- | --- | --- | ---: | ---: | ---: |',
            ...results.map(
              (result) =>
                `| ${result.name} | \`${result.expectedSkill}\` | ${
                  result.activeSkills.map((skill) => `\`${skill}\``).join(', ') || '-'
                } | ${result.score} | ${result.promptTokens} | ${result.totalTokens} |`,
            ),
            fallbackNote ? `| Fallback note | ${fallbackNote} | | | | |` : undefined,
            '',
            ...results.flatMap((result) => [
              `### ${result.name} output preview`,
              '',
              fenced(trimForReport(result.content)),
              '',
            ]),
            '',
          ].join('\n')
        );

        for (const result of results) {
          expect(result.activeSkills, result.name).toContain(result.expectedSkill);
          expect(result.score, result.name).toBeGreaterThanOrEqual(3);
          expect(result.totalTokens, result.name).toBeGreaterThan(0);
        }
      },
      180_000
    );
  }

  const openAiToolIt =
    integrationEnabled &&
    skillsLiveEnabled &&
    process.env.OPENAI_API_KEY &&
    selectedProviders.has('openai')
      ? it
      : it.skip;

  openAiToolIt(
    'openai creator workflow uses a real safe read tool and cache on repeated runs',
    async () => {
      let calls = 0;
      const cache = AgentCache.file('.agentcraft/live-skills-cache', {
        namespace: 'live-skills-certification',
        version: '2026-05-12',
        defaultTtlMs: 60_000,
        maxEntryBytes: 20_000,
      });
      await cache.clear?.();

      const sourceTool = tool({
        name: 'get_creator_research_note',
        description: 'Return a concise source note for a creator workflow.',
        security: { sideEffect: 'read' },
        params: {},
        run: async () => {
          calls += 1;
          return {
            audience: 'technical founders',
            angle: 'cache safe read tools before spending tokens again',
            evidence: 'repeat tool calls can be avoided when inputs and tool identity match',
          };
        },
      });

      const agent = Agent.create({
        model: `openai:${process.env.AGENTCRAFT_LIVE_OPENAI_MODEL ?? 'gpt-4o-mini'}`,
        apiKey: process.env.OPENAI_API_KEY!,
        temperature: 0,
        maxTokens,
        cache,
        skillActivation: 'auto',
        retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
      }).use(CreatorPacks.blog({ skillActivation: 'auto', readOnlyByDefault: true }));

      const prompt =
        'Use get_creator_research_note exactly once, then create a compact article angle with audience, evidence, and risk notes.';
      const first = await agent.run({ prompt, temperature: 0, maxTokens, tools: [sourceTool] });
      const second = await agent.run({ prompt, temperature: 0, maxTokens, tools: [sourceTool] });

      expect(first.cache.misses).toBeGreaterThanOrEqual(1);
      expect(second.cache.hits).toBeGreaterThanOrEqual(1);
      expect(second.cache.toolCallsAvoided).toBeGreaterThanOrEqual(1);
      expect(calls).toBe(1);

      reportEntries.push(
        [
          '## OpenAI Tool + Cache Certification',
          '',
          '| Metric | First run | Second run |',
          '| --- | ---: | ---: |',
          `| Cache hits | ${first.cache.hits} | ${second.cache.hits} |`,
          `| Cache misses | ${first.cache.misses} | ${second.cache.misses} |`,
          `| Cache writes | ${first.cache.writes} | ${second.cache.writes} |`,
          `| Tool calls avoided | ${first.cache.toolCallsAvoided} | ${second.cache.toolCallsAvoided} |`,
          `| Real tool executions | ${calls} | ${calls} |`,
          '',
          'Result: the first live run executed the safe read tool. The second live run requested the same tool result, hit cache, and avoided the real tool call.',
          '',
        ].join('\n')
      );
    },
    90_000
  );
});

function providerConfig(
  name: string,
  modelPrefix: string,
  apiKey: string | undefined,
  models: ReadonlyArray<string | undefined>
) {
  const candidates = models.filter((model): model is string => Boolean(model));
  const [model, ...fallbackModels] = [...new Set(candidates)];
  return {
    name,
    modelPrefix,
    apiKey,
    model: model!,
    fallbackModels,
  };
}

function createLiveAgent(provider: {
  readonly modelPrefix: string;
  readonly model: string;
  readonly apiKey: string;
}) {
  return Agent.create({
    model: `${provider.modelPrefix}:${provider.model}`,
    apiKey: provider.apiKey,
    temperature: 0,
    maxTokens,
    skillActivation: 'auto',
    retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
  });
}

async function runDomainSkillCertification(
  provider: {
    readonly modelPrefix: string;
    readonly apiKey: string;
  },
  model: string,
) {
  const results = [];
  for (const item of certificationCases) {
    const response = await createLiveAgent({ ...provider, model })
      .use(item.pack())
      .run({ prompt: item.prompt, temperature: 0, maxTokens });
    results.push({
      name: item.name,
      expectedSkill: item.expectedSkill,
      activeSkills: response.selection.activeSkills,
      content: response.content,
      score: item.score(response.content),
      promptTokens: response.tokensUsed.prompt,
      totalTokens: response.tokensUsed.total,
    });
  }
  return results;
}

function scoreCreatorPlan(content: string): number {
  const signals = [
    /audience|reader|who/i,
    /angle|thesis|hook/i,
    /outline|structure|section/i,
    /evidence|proof|example/i,
    /risk|fact|claim/i,
    /token|cache|cost/i,
  ];
  return signals.reduce((score, pattern) => score + (pattern.test(content) ? 1 : 0), 0);
}

function scoreSeoBrief(content: string): number {
  return scoreSignals(content, [/audience|intent/i, /serp|keyword|query/i, /internal link/i, /evidence|source/i, /risk|gap/i]);
}

function scoreSalesPlan(content: string): number {
  return scoreSignals(content, [/fit|score/i, /trigger/i, /risk|disqual/i, /outreach|angle/i, /next action/i]);
}

function scoreFinanceBrief(content: string): number {
  return scoreSignals(content, [/thesis/i, /catalyst/i, /valuation|multiple/i, /risk/i, /evidence|watchlist/i]);
}

function scoreProductBrief(content: string): number {
  return scoreSignals(content, [/problem|user/i, /story/i, /acceptance criteria/i, /risk/i, /metric/i]);
}

function scoreSupportBrief(content: string): number {
  return scoreSignals(content, [/customer|issue/i, /policy/i, /escalation|risk/i, /tone/i, /next action|response/i]);
}

function scoreHealthcareBrief(content: string): number {
  return scoreSignals(content, [/evidence/i, /guideline|grade/i, /plain language|patient/i, /boundary|caveat/i, /review|trigger/i]);
}

function scoreAnalyticsBrief(content: string): number {
  return scoreSignals(content, [/metric/i, /sample|power/i, /causal|causality/i, /decision|recommend/i, /experiment/i]);
}

function scoreSignals(content: string, signals: readonly RegExp[]): number {
  return signals.reduce((score, pattern) => score + (pattern.test(content) ? 1 : 0), 0);
}

function trimForReport(content: string): string {
  return content.length > 900 ? `${content.slice(0, 900)}...` : content;
}

function fenced(content: string): string {
  return ['```text', content.trim(), '```'].join('\n');
}

function parseProviderSelection(value: string | undefined): Set<string> {
  if (!value || value.trim() === '') return new Set(['openai']);
  const selected = value
    .split(',')
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean);
  return selected.includes('all') ? new Set(providers.map((provider) => provider.name)) : new Set(selected);
}
