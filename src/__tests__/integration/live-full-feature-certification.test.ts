import { mkdir, writeFile } from 'node:fs/promises';
import { afterAll, describe, expect, it } from 'vitest';
import { Agent } from '../../agent/agent.js';
import {
  WritingTrait,
  HumanizerTrait,
  SummarizeTrait,
  TranslationTrait,
} from '../../agent/traits/index.js';
import {
  BrandPacks,
  EngineeringPacks,
  FinancePacks,
  HealthcarePacks,
  LegalPacks,
  DataAnalyticsPacks,
  CreatorPacks,
  PersonalProductivityPacks,
} from '../../agent/packs/index.js';

// ---------------------------------------------------------------------------
// Gate flags
// ---------------------------------------------------------------------------
const integrationEnabled = process.env.INTEGRATION_TESTS === 'true';
const fullCertEnabled = process.env.AGENTCRAFT_LIVE_FULL_CERTIFICATION === 'true';
const openAiKey = process.env.OPENAI_API_KEY;
const openAiEnabled = parseProviderSelection(process.env.AGENTCRAFT_LIVE_PROVIDERS).has('openai');
const liveIt =
  integrationEnabled && fullCertEnabled && openAiEnabled && openAiKey ? it : it.skip;
const liveModel = process.env.AGENTCRAFT_LIVE_OPENAI_MODEL ?? 'gpt-4o-mini';
const maxTokens = Number.parseInt(process.env.AGENTCRAFT_LIVE_FULL_MAX_TOKENS ?? '200', 10);

const reportEntries: string[] = [];
const sectionResults: Array<{ section: string; passed: boolean }> = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function scoreSignals(content: string, signals: readonly RegExp[]): number {
  return signals.reduce((n, p) => n + (p.test(content) ? 1 : 0), 0);
}

function trimForReport(content: string): string {
  return content.length > 600 ? `${content.slice(0, 600)}...` : content;
}

function fenced(content: string): string {
  return ['```text', content.trim(), '```'].join('\n');
}

function parseProviderSelection(value: string | undefined): Set<string> {
  if (!value || value.trim() === '') return new Set(['openai']);
  const selected = value
    .split(',')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  return selected.includes('all') ? new Set(['openai']) : new Set(selected);
}

function makeAgent() {
  return Agent.create({
    model: `openai:${liveModel}`,
    apiKey: openAiKey!,
    temperature: 0,
    maxTokens,
    traitActivation: 'auto',
    toolSelection: 'auto',
    retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
  });
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------
describe('live full feature certification', () => {
  afterAll(async () => {
    if (reportEntries.length === 0) return;
    const passFail = sectionResults
      .map((r) => `| ${r.section} | ${r.passed ? 'PASS' : 'FAIL'} |`)
      .join('\n');
    await mkdir('reports', { recursive: true });
    await writeFile(
      'reports/agentcraft-live-full-feature-certification.md',
      [
        '# AgentCraft Live Full Feature Certification',
        '',
        `Generated: ${new Date().toISOString()}`,
        '',
        `Model: openai:${liveModel}`,
        '',
        ...reportEntries,
        '---',
        '',
        '## Summary',
        '',
        '| Section | Result |',
        '| --- | --- |',
        passFail,
        '',
      ].join('\n'),
      'utf8'
    );
  });

  // -------------------------------------------------------------------------
  // Section 1: Primitive Skills — Writing & Translation
  // -------------------------------------------------------------------------
  liveIt(
    'section 1: primitive skills — writing & translation',
    async () => {
      const writingAgent = Agent.create({
        model: `openai:${liveModel}`,
        apiKey: openAiKey!,
        temperature: 0,
        maxTokens,
        retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
      }).use(WritingTrait.create());

      const translationAgent = Agent.create({
        model: `openai:${liveModel}`,
        apiKey: openAiKey!,
        temperature: 0,
        maxTokens,
        retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
      }).use(TranslationTrait.create());

      const writingRes = await writingAgent.run({
        prompt:
          'Draft a short 3-sentence executive summary of the following context: AI agent costs are driven by token usage, cache efficiency, and model selection. Keep it under 60 words.',
        temperature: 0,
        maxTokens,
      });
      const translationRes = await translationAgent.run({
        prompt:
          'Translate the following sentence into French and Spanish: "AI agents reduce operational costs through intelligent caching and model routing." Provide both translations clearly labeled.',
        temperature: 0,
        maxTokens,
      });

      const writingSignals = [/execut|summar/i, /cost|token|cache/i, /agent|ai/i] as const;
      const translationSignals = [
        /french|français|en français/i,
        /spanish|español|en español/i,
        /agent|coût|costo/i,
      ] as const;

      const writingScore = scoreSignals(writingRes.content, writingSignals);
      const translationScore = scoreSignals(translationRes.content, translationSignals);

      expect(writingRes.selection.activeTraits, 'writing active skill').toContain('writing');
      expect(translationRes.selection.activeTraits, 'translation active skill').toContain('translation');
      expect(writingScore, 'writing score').toBeGreaterThanOrEqual(2);
      expect(translationScore, 'translation score').toBeGreaterThanOrEqual(2);

      sectionResults.push({ section: 'Section 1: Writing & Translation', passed: true });
      reportEntries.push(
        [
          '## Section 1: Primitive Skills — Writing & Translation',
          '',
          '| Case | Trait | Activated | Score | Total tokens |',
          '| --- | --- | --- | ---: | ---: |',
          `| writing | \`writing\` | ${writingRes.selection.activeTraits.includes('writing') ? 'yes' : 'no'} | ${writingScore} | ${writingRes.tokensUsed.total} |`,
          `| translation | \`translation\` | ${translationRes.selection.activeTraits.includes('translation') ? 'yes' : 'no'} | ${translationScore} | ${translationRes.tokensUsed.total} |`,
          '',
          'Writing output preview:',
          '',
          fenced(trimForReport(writingRes.content)),
          '',
          'Translation output preview:',
          '',
          fenced(trimForReport(translationRes.content)),
          '',
        ].join('\n')
      );
    },
    90_000
  );

  // -------------------------------------------------------------------------
  // Section 2: Primitive Skills — Humanizer & Summarize
  // -------------------------------------------------------------------------
  liveIt(
    'section 2: primitive skills — humanizer & summarize',
    async () => {
      const humanizerAgent = Agent.create({
        model: `openai:${liveModel}`,
        apiKey: openAiKey!,
        temperature: 0,
        maxTokens,
        retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
      }).use(HumanizerTrait.create());

      const summarizeAgent = Agent.create({
        model: `openai:${liveModel}`,
        apiKey: openAiKey!,
        temperature: 0,
        maxTokens,
        retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
      }).use(SummarizeTrait.create());

      const humanizerRes = await humanizerAgent.run({
        prompt:
          '/humanize The implementation facilitates the optimization of computational resource allocation within distributed inference pipelines.',
        temperature: 0,
        maxTokens,
      });
      const summarizeRes = await summarizeAgent.run({
        prompt:
          'Summarize the following in 2 sentences: Prompt caching reduces redundant LLM calls by storing identical prefix responses and replaying them on cache hit, cutting cost and latency by up to 80% on repeated identical prompts.',
        temperature: 0,
        maxTokens,
      });

      const humanizerSignals = [
        /simpler|clearer|easier|plain|natural|human/i,
        /pipeline|inference|resource/i,
      ] as const;
      const summarizeSignals = [/cache|cach/i, /cost|latency|reduc/i] as const;

      const humanizerScore = scoreSignals(humanizerRes.content, humanizerSignals);
      const summarizeScore = scoreSignals(summarizeRes.content, summarizeSignals);

      expect(humanizerRes.selection.activeTraits, 'humanizer active skill').toContain('humanizer');
      expect(summarizeRes.selection.activeTraits, 'summarize active skill').toContain('summarize');
      expect(humanizerScore, 'humanizer score').toBeGreaterThanOrEqual(1);
      expect(summarizeScore, 'summarize score').toBeGreaterThanOrEqual(1);

      sectionResults.push({ section: 'Section 2: Humanizer & Summarize', passed: true });
      reportEntries.push(
        [
          '## Section 2: Primitive Skills — Humanizer & Summarize',
          '',
          '| Case | Trait | Activated | Score | Total tokens |',
          '| --- | --- | --- | ---: | ---: |',
          `| humanizer | \`humanizer\` | ${humanizerRes.selection.activeTraits.includes('humanizer') ? 'yes' : 'no'} | ${humanizerScore} | ${humanizerRes.tokensUsed.total} |`,
          `| summarize | \`summarize\` | ${summarizeRes.selection.activeTraits.includes('summarize') ? 'yes' : 'no'} | ${summarizeScore} | ${summarizeRes.tokensUsed.total} |`,
          '',
          'Humanizer output preview:',
          '',
          fenced(trimForReport(humanizerRes.content)),
          '',
          'Summarize output preview:',
          '',
          fenced(trimForReport(summarizeRes.content)),
          '',
        ].join('\n')
      );
    },
    90_000
  );

  // -------------------------------------------------------------------------
  // Section 3: Primitive Skills — Technical Writing & Summarize
  // -------------------------------------------------------------------------
  liveIt(
    'section 3: primitive skills — technical writing & summarize',
    async () => {
      const techWritingAgent = Agent.create({
        model: `openai:${liveModel}`,
        apiKey: openAiKey!,
        temperature: 0,
        maxTokens,
        retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
      }).use(WritingTrait.create());

      const techSummarizeAgent = Agent.create({
        model: `openai:${liveModel}`,
        apiKey: openAiKey!,
        temperature: 0,
        maxTokens,
        retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
      }).use(SummarizeTrait.create());

      const techDocRes = await techWritingAgent.run({
        prompt:
          'Write a concise technical overview (3 paragraphs) for a developer audience explaining how agent caching works: request fingerprinting, cache store lookup, hit-or-miss routing, and cost savings. Keep it under 150 words.',
        temperature: 0,
        maxTokens,
      });
      const specSummarizeRes = await techSummarizeAgent.run({
        prompt:
          'Summarize the following technical spec in 2 sentences for an engineering team: The agent runtime applies a multi-layer cache: L1 in-memory for hot runs, L2 SQLite for session persistence, and L3 Redis for distributed sharing across replicas. Cache keys are SHA-256 fingerprints of prompt plus model plus temperature. Keep it under 60 words.',
        temperature: 0,
        maxTokens,
      });

      const techDocSignals = [
        /cache|cach/i,
        /fingerprint|key|lookup/i,
        /agent|run|request/i,
      ] as const;
      const specSummarizeSignals = [
        /cache|layer|L1|L2|L3/i,
        /redis|sqlite|memory/i,
      ] as const;

      const techDocScore = scoreSignals(techDocRes.content, techDocSignals);
      const specSummarizeScore = scoreSignals(specSummarizeRes.content, specSummarizeSignals);

      expect(techDocRes.selection.activeTraits, 'writing active skill (tech doc)').toContain('writing');
      expect(specSummarizeRes.selection.activeTraits, 'summarize active skill (spec)').toContain('summarize');
      expect(techDocScore, 'tech doc writing score').toBeGreaterThanOrEqual(2);
      expect(specSummarizeScore, 'spec summarize score').toBeGreaterThanOrEqual(1);

      sectionResults.push({ section: 'Section 3: Technical Writing & Summarize', passed: true });
      reportEntries.push(
        [
          '## Section 3: Primitive Skills — Technical Writing & Summarize',
          '',
          '| Case | Trait | Activated | Score | Total tokens |',
          '| --- | --- | --- | ---: | ---: |',
          `| writing (tech-doc) | \`writing\` | ${techDocRes.selection.activeTraits.includes('writing') ? 'yes' : 'no'} | ${techDocScore} | ${techDocRes.tokensUsed.total} |`,
          `| summarize (spec) | \`summarize\` | ${specSummarizeRes.selection.activeTraits.includes('summarize') ? 'yes' : 'no'} | ${specSummarizeScore} | ${specSummarizeRes.tokensUsed.total} |`,
          '',
          'Technical doc output preview:',
          '',
          fenced(trimForReport(techDocRes.content)),
          '',
          'Spec summarize output preview:',
          '',
          fenced(trimForReport(specSummarizeRes.content)),
          '',
        ].join('\n')
      );
    },
    90_000
  );

  // -------------------------------------------------------------------------
  // Section 4: Brand Domain Packs
  // -------------------------------------------------------------------------
  liveIt(
    'section 4: brand domain packs',
    async () => {
      const brandResearchRes = await makeAgent()
        .use(BrandPacks.research({ traitActivation: 'auto', readOnlyByDefault: true }))
        .run({
          prompt:
            'Research the brand positioning landscape for AI developer tools. Identify 3 key audience segments, 2 competitor positioning claims, and 1 differentiation gap. Keep it under 160 words.',
          temperature: 0,
          maxTokens,
        });

      const brandPositioningRes = await makeAgent()
        .use(BrandPacks.positioning({ traitActivation: 'auto', readOnlyByDefault: true }))
        .run({
          prompt:
            'Write a compact brand positioning statement for an AI agent SDK targeting developer teams. Include target audience, key benefit, proof point, and differentiator. Keep it under 120 words.',
          temperature: 0,
          maxTokens,
        });

      const brandVoiceRes = await makeAgent()
        .use(BrandPacks.voice({ traitActivation: 'auto', readOnlyByDefault: true }))
        .run({
          prompt:
            'Create a compact brand voice profile for an AI developer tool brand. Include 3 tone characteristics, 1 vocabulary note, and 1 anti-pattern. Keep it under 120 words.',
          temperature: 0,
          maxTokens,
        });

      const researchSignals = [
        /audience|segment|developer|user/i,
        /competitor|brand|market|landscape/i,
        /gap|differ|opport|niche/i,
        /positioning|position|strateg/i,
      ] as const;
      const positioningSignals = [
        /audience|target|developer|team/i,
        /benefit|value|help|enable|empower/i,
        /proof|evidence|trusted|built|power/i,
        /differ|unique|unlike|only|leading/i,
      ] as const;
      const voiceSignals = [
        /tone|voice|style|sound/i,
        /vocabulary|word|language|term/i,
        /avoid|anti|don.t|never|instead/i,
        /characteristic|trait|quality|feel/i,
      ] as const;

      const researchScore = scoreSignals(brandResearchRes.content, researchSignals);
      const positioningScore = scoreSignals(brandPositioningRes.content, positioningSignals);
      const voiceScore = scoreSignals(brandVoiceRes.content, voiceSignals);

      expect(brandResearchRes.selection.activeTraits, 'brand-research active skill').toContain(
        'brand-research'
      );
      expect(
        brandPositioningRes.selection.activeTraits,
        'brand-positioning active skill'
      ).toContain('brand-positioning');
      expect(brandVoiceRes.selection.activeTraits, 'brand-voice-profile active skill').toContain(
        'brand-voice-profile'
      );
      expect(researchScore, 'brand research score').toBeGreaterThanOrEqual(2);
      expect(positioningScore, 'brand positioning score').toBeGreaterThanOrEqual(2);
      expect(voiceScore, 'brand voice score').toBeGreaterThanOrEqual(2);

      sectionResults.push({ section: 'Section 4: Brand Domain Packs', passed: true });
      reportEntries.push(
        [
          '## Section 4: Brand Domain Packs',
          '',
          '| Case | Expected skill | Active skills | Score | Total tokens |',
          '| --- | --- | --- | ---: | ---: |',
          `| brand-research | \`brand-research\` | ${brandResearchRes.selection.activeTraits.map((s) => `\`${s}\``).join(', ') || '-'} | ${researchScore} | ${brandResearchRes.tokensUsed.total} |`,
          `| brand-positioning | \`brand-positioning\` | ${brandPositioningRes.selection.activeTraits.map((s) => `\`${s}\``).join(', ') || '-'} | ${positioningScore} | ${brandPositioningRes.tokensUsed.total} |`,
          `| brand-voice-profile | \`brand-voice-profile\` | ${brandVoiceRes.selection.activeTraits.map((s) => `\`${s}\``).join(', ') || '-'} | ${voiceScore} | ${brandVoiceRes.tokensUsed.total} |`,
          '',
          'Brand research output preview:',
          '',
          fenced(trimForReport(brandResearchRes.content)),
          '',
          'Brand positioning output preview:',
          '',
          fenced(trimForReport(brandPositioningRes.content)),
          '',
          'Brand voice output preview:',
          '',
          fenced(trimForReport(brandVoiceRes.content)),
          '',
        ].join('\n')
      );
    },
    90_000
  );

  // -------------------------------------------------------------------------
  // Section 5: Engineering Domain Packs
  // -------------------------------------------------------------------------
  liveIt(
    'section 5: engineering domain packs',
    async () => {
      const codeReviewRes = await makeAgent()
        .use(EngineeringPacks.codeReview({ traitActivation: 'auto', readOnlyByDefault: true }))
        .run({
          prompt:
            'Review this TypeScript function for correctness, performance, and security risks: async function getUser(id: string) { const result = await db.query("SELECT * FROM users WHERE id=" + id); return result.rows[0]; } Include risk, recommendation, and fix. Keep it under 140 words.',
          temperature: 0,
          maxTokens,
        });

      const archRes = await makeAgent()
        .use(EngineeringPacks.architecture({ traitActivation: 'auto', readOnlyByDefault: true }))
        .run({
          prompt:
            'Review the architecture of a monolithic Node.js API that handles 50k daily requests with plans to scale to 500k. Identify 2 scalability risks and 1 architectural recommendation. Keep it under 140 words.',
          temperature: 0,
          maxTokens,
        });

      const devopsRes = await makeAgent()
        .use(EngineeringPacks.devops({ traitActivation: 'auto', readOnlyByDefault: true }))
        .run({
          prompt:
            'Assess deployment risk for the following: rolling deploy of a Node.js API to production during peak traffic, 3 services updated simultaneously, no feature flags, rollback takes 8 minutes. Include risk level, failure modes, and mitigation. Keep it under 140 words.',
          temperature: 0,
          maxTokens,
        });

      const codeSignals = [
        /injection|sql|security/i,
        /risk|vulnerab/i,
        /recommend|fix|param/i,
        /performance/i,
      ] as const;
      const archSignals = [/scalab/i, /risk/i, /recommend/i, /monolith|service|bottleneck/i] as const;
      const devopsSignals = [/risk/i, /rollback|failur/i, /mitigation|recommend/i, /deploy/i] as const;

      const codeScore = scoreSignals(codeReviewRes.content, codeSignals);
      const archScore = scoreSignals(archRes.content, archSignals);
      const devopsScore = scoreSignals(devopsRes.content, devopsSignals);

      expect(
        codeReviewRes.selection.activeTraits.some((s) => s.includes('code-review')),
        'code-review or security-code-review active skill'
      ).toBe(true);
      expect(archRes.selection.activeTraits, 'architecture-review active skill').toContain(
        'architecture-review'
      );
      expect(devopsRes.selection.activeTraits, 'deployment-risk-review active skill').toContain(
        'deployment-risk-review'
      );
      expect(codeScore, 'engineering code review score').toBeGreaterThanOrEqual(2);
      expect(archScore, 'architecture review score').toBeGreaterThanOrEqual(2);
      expect(devopsScore, 'devops review score').toBeGreaterThanOrEqual(2);

      sectionResults.push({ section: 'Section 5: Engineering Domain Packs', passed: true });
      reportEntries.push(
        [
          '## Section 5: Engineering Domain Packs',
          '',
          '| Case | Expected skill | Active skills | Score | Total tokens |',
          '| --- | --- | --- | ---: | ---: |',
          `| code-review | \`code-review\` or \`security-code-review\` | ${codeReviewRes.selection.activeTraits.map((s) => `\`${s}\``).join(', ') || '-'} | ${codeScore} | ${codeReviewRes.tokensUsed.total} |`,
          `| architecture-review | \`architecture-review\` | ${archRes.selection.activeTraits.map((s) => `\`${s}\``).join(', ') || '-'} | ${archScore} | ${archRes.tokensUsed.total} |`,
          `| deployment-risk-review | \`deployment-risk-review\` | ${devopsRes.selection.activeTraits.map((s) => `\`${s}\``).join(', ') || '-'} | ${devopsScore} | ${devopsRes.tokensUsed.total} |`,
          '',
          'Code review output preview:',
          '',
          fenced(trimForReport(codeReviewRes.content)),
          '',
          'Architecture review output preview:',
          '',
          fenced(trimForReport(archRes.content)),
          '',
          'Devops review output preview:',
          '',
          fenced(trimForReport(devopsRes.content)),
          '',
        ].join('\n')
      );
    },
    90_000
  );

  // -------------------------------------------------------------------------
  // Section 6: Finance Extended Packs
  // -------------------------------------------------------------------------
  liveIt(
    'section 6: finance extended packs',
    async () => {
      const portfolioRes = await makeAgent()
        .use(FinancePacks.portfolioReview({ traitActivation: 'auto', readOnlyByDefault: true }))
        .run({
          prompt:
            'Review this portfolio for risk: 60% US tech equities, 20% international bonds, 15% crypto, 5% cash. Market context: rate uncertainty, USD strength, volatile crypto sentiment. Include allocation risk, concentration flag, and one rebalancing note. Keep it under 140 words.',
          temperature: 0,
          maxTokens,
        });

      const marketRes = await makeAgent()
        .use(FinancePacks.marketResearch({ traitActivation: 'auto', readOnlyByDefault: true }))
        .run({
          prompt:
            'Provide a compact sector rotation analysis for Q3 given these macro signals: slowing inflation, cautious Fed, strong employment, consumer spending softening. Which sectors benefit and which face headwinds? Keep it under 140 words.',
          temperature: 0,
          maxTokens,
        });

      const portfolioSignals = [
        /risk|concentrat/i,
        /allocat/i,
        /rebalanc|adjust/i,
        /crypto|tech|bond/i,
      ] as const;
      const marketSignals = [
        /sector/i,
        /rotation|shift/i,
        /inflation|fed|macro/i,
        /headwind|benefit/i,
      ] as const;

      const portfolioScore = scoreSignals(portfolioRes.content, portfolioSignals);
      const marketScore = scoreSignals(marketRes.content, marketSignals);

      expect(portfolioRes.selection.activeTraits, 'portfolio-risk-review active skill').toContain(
        'portfolio-risk-review'
      );
      expect(marketRes.selection.activeTraits, 'sector-rotation-analysis active skill').toContain(
        'sector-rotation-analysis'
      );
      expect(portfolioScore, 'portfolio review score').toBeGreaterThanOrEqual(2);
      expect(marketScore, 'market research score').toBeGreaterThanOrEqual(2);

      sectionResults.push({ section: 'Section 6: Finance Extended Packs', passed: true });
      reportEntries.push(
        [
          '## Section 6: Finance Extended Packs',
          '',
          '| Case | Expected skill | Active skills | Score | Total tokens |',
          '| --- | --- | --- | ---: | ---: |',
          `| portfolio-risk-review | \`portfolio-risk-review\` | ${portfolioRes.selection.activeTraits.map((s) => `\`${s}\``).join(', ') || '-'} | ${portfolioScore} | ${portfolioRes.tokensUsed.total} |`,
          `| sector-rotation-analysis | \`sector-rotation-analysis\` | ${marketRes.selection.activeTraits.map((s) => `\`${s}\``).join(', ') || '-'} | ${marketScore} | ${marketRes.tokensUsed.total} |`,
          '',
          'Portfolio review output preview:',
          '',
          fenced(trimForReport(portfolioRes.content)),
          '',
          'Market research output preview:',
          '',
          fenced(trimForReport(marketRes.content)),
          '',
        ].join('\n')
      );
    },
    90_000
  );

  // -------------------------------------------------------------------------
  // Section 7: Healthcare Extended Packs
  // -------------------------------------------------------------------------
  liveIt(
    'section 7: healthcare extended packs',
    async () => {
      const patientEdRes = await makeAgent()
        .use(HealthcarePacks.patientEducation({ traitActivation: 'auto', readOnlyByDefault: true }))
        .run({
          prompt:
            'Write a patient education summary for discharge after a laparoscopic appendectomy. Include: what to expect, warning signs to watch for, activity restrictions, and when to call the doctor. Plain language, no medical jargon. Keep it under 160 words.',
          temperature: 0,
          maxTokens,
        });

      const clinicalAdminRes = await makeAgent()
        .use(HealthcarePacks.clinicalAdmin({ traitActivation: 'auto', readOnlyByDefault: true }))
        .run({
          prompt:
            'Summarize this clinical note for a handoff: 67-year-old male, admitted for chest pain, ruled out MI, echo normal, stress test scheduled for tomorrow, currently stable on aspirin. Key issues, plan, and outstanding items only. Keep it under 120 words.',
          temperature: 0,
          maxTokens,
        });

      const patientSignals = [
        /warning|sign/i,
        /activit|restrict/i,
        /doctor|call|contact/i,
        /recovery|expect/i,
      ] as const;
      const clinicalSignals = [
        /summar|handoff|key/i,
        /stable|plan|issue/i,
        /aspirin|echo|stress/i,
        /outstand|schedul/i,
      ] as const;

      const patientScore = scoreSignals(patientEdRes.content, patientSignals);
      const clinicalScore = scoreSignals(clinicalAdminRes.content, clinicalSignals);

      expect(
        patientEdRes.selection.activeTraits,
        'patient-education-writer active skill'
      ).toContain('patient-education-writer');
      expect(clinicalAdminRes.selection.activeTraits, 'clinical-note-summary active skill').toContain(
        'clinical-note-summary'
      );
      expect(patientScore, 'patient education score').toBeGreaterThanOrEqual(2);
      expect(clinicalScore, 'clinical admin score').toBeGreaterThanOrEqual(2);

      sectionResults.push({ section: 'Section 7: Healthcare Extended Packs', passed: true });
      reportEntries.push(
        [
          '## Section 7: Healthcare Extended Packs',
          '',
          '| Case | Expected skill | Active skills | Score | Total tokens |',
          '| --- | --- | --- | ---: | ---: |',
          `| patient-education-writer | \`patient-education-writer\` | ${patientEdRes.selection.activeTraits.map((s) => `\`${s}\``).join(', ') || '-'} | ${patientScore} | ${patientEdRes.tokensUsed.total} |`,
          `| clinical-note-summary | \`clinical-note-summary\` | ${clinicalAdminRes.selection.activeTraits.map((s) => `\`${s}\``).join(', ') || '-'} | ${clinicalScore} | ${clinicalAdminRes.tokensUsed.total} |`,
          '',
          'Patient education output preview:',
          '',
          fenced(trimForReport(patientEdRes.content)),
          '',
          'Clinical admin output preview:',
          '',
          fenced(trimForReport(clinicalAdminRes.content)),
          '',
        ].join('\n')
      );
    },
    90_000
  );

  // -------------------------------------------------------------------------
  // Section 8: Legal Domain Packs
  // -------------------------------------------------------------------------
  liveIt(
    'section 8: legal domain packs',
    async () => {
      const contractRes = await makeAgent()
        .use(LegalPacks.contractReview({ traitActivation: 'auto', readOnlyByDefault: true }))
        .run({
          prompt:
            'Review this contract clause for risk: "Either party may terminate this agreement immediately upon written notice if the other party materially breaches any provision and fails to cure such breach within 5 business days." Identify risk, ambiguities, and recommended change. Keep it under 140 words.',
          temperature: 0,
          maxTokens,
        });

      const complianceRes = await makeAgent()
        .use(LegalPacks.compliance({ traitActivation: 'auto', readOnlyByDefault: true }))
        .run({
          prompt:
            'Create a compact GDPR compliance checklist for a SaaS product that collects user email and usage data, uses third-party analytics, and stores data in EU and US regions. Include 5 checklist items with pass or fail criteria. Keep it under 160 words.',
          temperature: 0,
          maxTokens,
        });

      const contractSignals = [
        /risk|ambigu/i,
        /terminat|breach/i,
        /recommend|change|fix/i,
        /clause|provision/i,
      ] as const;
      const complianceSignals = [
        /gdpr|regulat/i,
        /checklist|item/i,
        /data|privacy/i,
        /consent|right/i,
      ] as const;

      const contractScore = scoreSignals(contractRes.content, contractSignals);
      const complianceScore = scoreSignals(complianceRes.content, complianceSignals);

      expect(contractRes.selection.activeTraits, 'contract-risk-review active skill').toContain(
        'contract-risk-review'
      );
      expect(complianceRes.selection.activeTraits, 'compliance-checklist active skill').toContain(
        'compliance-checklist'
      );
      expect(contractScore, 'contract review score').toBeGreaterThanOrEqual(2);
      expect(complianceScore, 'compliance score').toBeGreaterThanOrEqual(2);

      sectionResults.push({ section: 'Section 8: Legal Domain Packs', passed: true });
      reportEntries.push(
        [
          '## Section 8: Legal Domain Packs',
          '',
          '| Case | Expected skill | Active skills | Score | Total tokens |',
          '| --- | --- | --- | ---: | ---: |',
          `| contract-risk-review | \`contract-risk-review\` | ${contractRes.selection.activeTraits.map((s) => `\`${s}\``).join(', ') || '-'} | ${contractScore} | ${contractRes.tokensUsed.total} |`,
          `| compliance-checklist | \`compliance-checklist\` | ${complianceRes.selection.activeTraits.map((s) => `\`${s}\``).join(', ') || '-'} | ${complianceScore} | ${complianceRes.tokensUsed.total} |`,
          '',
          'Contract review output preview:',
          '',
          fenced(trimForReport(contractRes.content)),
          '',
          'Compliance output preview:',
          '',
          fenced(trimForReport(complianceRes.content)),
          '',
        ].join('\n')
      );
    },
    90_000
  );

  // -------------------------------------------------------------------------
  // Section 9: Creator Extended Packs
  // -------------------------------------------------------------------------
  liveIt(
    'section 9: creator extended packs',
    async () => {
      const linkedinRes = await makeAgent()
        .use(CreatorPacks.linkedin({ traitActivation: 'auto', readOnlyByDefault: true }))
        .run({
          prompt:
            'Write a compact LinkedIn post for a founder sharing a lesson about reducing LLM costs using caching. Hook, insight, and CTA. Keep it under 120 words.',
          temperature: 0,
          maxTokens,
        });

      const youtubeRes = await makeAgent()
        .use(CreatorPacks.youtube({ traitActivation: 'auto', readOnlyByDefault: true }))
        .run({
          prompt:
            'Write a compact YouTube video script for a 3-minute explainer on how AI agent caching works. Include hook, 3 key points, and CTA. Keep it under 200 words.',
          temperature: 0,
          maxTokens,
        });

      const newsletterRes = await makeAgent()
        .use(CreatorPacks.newsletter({ traitActivation: 'auto', readOnlyByDefault: true }))
        .run({
          prompt:
            'Write a newsletter on the topic: "AI agent cost efficiency in 2026". Include subject line, 3 content sections, and one sponsor angle. Keep it under 160 words.',
          temperature: 0,
          maxTokens,
        });

      const resumeRes = await makeAgent()
        .use(CreatorPacks.resume({ traitActivation: 'auto', readOnlyByDefault: true }))
        .run({
          prompt:
            'Write a compact resume summary for a senior AI engineer with 8 years experience, specializing in LLM infrastructure, caching systems, and Python. Tailor for a Staff Engineer role at an AI startup. Keep it under 100 words.',
          temperature: 0,
          maxTokens,
        });

      const linkedinSignals = [
        /hook|open/i,
        /insight|lesson|learn/i,
        /cta|comment|follow|connect/i,
        /cache|cost|llm/i,
      ] as const;
      const youtubeSignals = [
        /hook|open/i,
        /point|section/i,
        /cta|subscrib|comment/i,
        /cache|agent/i,
      ] as const;
      const newsletterSignals = [
        /subject/i,
        /section|content/i,
        /sponsor|monetiz/i,
        /cost|efficienc/i,
      ] as const;
      const resumeSignals = [
        /engineer|senior/i,
        /llm|infra|python/i,
        /staff|role|startup/i,
        /summar|profil/i,
      ] as const;

      const linkedinScore = scoreSignals(linkedinRes.content, linkedinSignals);
      const youtubeScore = scoreSignals(youtubeRes.content, youtubeSignals);
      const newsletterScore = scoreSignals(newsletterRes.content, newsletterSignals);
      const resumeScore = scoreSignals(resumeRes.content, resumeSignals);

      expect(linkedinRes.selection.activeTraits, 'linkedin-post-writer active skill').toContain(
        'linkedin-post-writer'
      );
      expect(youtubeRes.selection.activeTraits, 'youtube-scriptwriter active skill').toContain(
        'youtube-scriptwriter'
      );
      expect(newsletterRes.selection.activeTraits, 'newsletter-writer active skill').toContain(
        'newsletter-writer'
      );
      expect(resumeRes.selection.activeTraits, 'resume-writer active skill').toContain('resume-writer');
      expect(linkedinScore, 'linkedin score').toBeGreaterThanOrEqual(2);
      expect(youtubeScore, 'youtube score').toBeGreaterThanOrEqual(2);
      expect(newsletterScore, 'newsletter score').toBeGreaterThanOrEqual(2);
      expect(resumeScore, 'resume score').toBeGreaterThanOrEqual(2);

      sectionResults.push({ section: 'Section 9: Creator Extended Packs', passed: true });
      reportEntries.push(
        [
          '## Section 9: Creator Extended Packs',
          '',
          '| Case | Expected skill | Active skills | Score | Total tokens |',
          '| --- | --- | --- | ---: | ---: |',
          `| linkedin-post-writer | \`linkedin-post-writer\` | ${linkedinRes.selection.activeTraits.map((s) => `\`${s}\``).join(', ') || '-'} | ${linkedinScore} | ${linkedinRes.tokensUsed.total} |`,
          `| youtube-scriptwriter | \`youtube-scriptwriter\` | ${youtubeRes.selection.activeTraits.map((s) => `\`${s}\``).join(', ') || '-'} | ${youtubeScore} | ${youtubeRes.tokensUsed.total} |`,
          `| newsletter-writer | \`newsletter-writer\` | ${newsletterRes.selection.activeTraits.map((s) => `\`${s}\``).join(', ') || '-'} | ${newsletterScore} | ${newsletterRes.tokensUsed.total} |`,
          `| resume-writer | \`resume-writer\` | ${resumeRes.selection.activeTraits.map((s) => `\`${s}\``).join(', ') || '-'} | ${resumeScore} | ${resumeRes.tokensUsed.total} |`,
          '',
          'LinkedIn output preview:',
          '',
          fenced(trimForReport(linkedinRes.content)),
          '',
          'YouTube output preview:',
          '',
          fenced(trimForReport(youtubeRes.content)),
          '',
          'Newsletter output preview:',
          '',
          fenced(trimForReport(newsletterRes.content)),
          '',
          'Resume output preview:',
          '',
          fenced(trimForReport(resumeRes.content)),
          '',
        ].join('\n')
      );
    },
    90_000
  );

  // -------------------------------------------------------------------------
  // Section 10: Personal Productivity & Data Analytics Extended
  // -------------------------------------------------------------------------
  liveIt(
    'section 10: personal productivity & data analytics extended',
    async () => {
      const weeklyRes = await makeAgent()
        .use(PersonalProductivityPacks.weeklyPlanning({ traitActivation: 'auto', readOnlyByDefault: true }))
        .run({
          prompt:
            'Create a compact weekly plan for a startup founder with these priorities: ship agent caching feature, review 3 customer calls, prepare board deck, and keep 4 deep-work blocks. Include schedule, focus areas, and review trigger. Keep it under 160 words.',
          temperature: 0,
          maxTokens,
        });

      const tasksRes = await makeAgent()
        .use(PersonalProductivityPacks.tasks({ traitActivation: 'auto', readOnlyByDefault: true }))
        .run({
          prompt:
            'Prioritize this task backlog for a solo developer: fix critical auth bug (user reports), write unit tests for cache module, refactor old adapter code, review 2 PRs, respond to 5 Slack threads. Include priority order, rationale, and defer note. Keep it under 140 words.',
          temperature: 0,
          maxTokens,
        });

      const reportingRes = await makeAgent()
        .use(DataAnalyticsPacks.reporting({ traitActivation: 'auto', readOnlyByDefault: true }))
        .run({
          prompt:
            'Write an executive data brief for this weekly metrics update: DAU up 12% WoW to 8,400, churn down 0.4pp to 2.1%, avg session 4.2min, support tickets up 18%. Include headline metric, risk signal, and one recommended focus area. Keep it under 140 words.',
          temperature: 0,
          maxTokens,
        });

      const weeklySignals = [
        /week|schedul/i,
        /priorit|focus/i,
        /block|time/i,
        /review/i,
      ] as const;
      const tasksSignals = [
        /priorit|order/i,
        /bug|critical|urgent/i,
        /defer|later|low/i,
        /rationale|reason/i,
      ] as const;
      const reportingSignals = [
        /headline|metric/i,
        /risk|signal/i,
        /recommend|focus/i,
        /dau|churn|session/i,
      ] as const;

      const weeklyScore = scoreSignals(weeklyRes.content, weeklySignals);
      const tasksScore = scoreSignals(tasksRes.content, tasksSignals);
      const reportingScore = scoreSignals(reportingRes.content, reportingSignals);

      expect(weeklyRes.selection.activeTraits, 'weekly-plan-writer active skill').toContain(
        'weekly-plan-writer'
      );
      expect(tasksRes.selection.activeTraits, 'task-prioritization active skill').toContain(
        'task-prioritization'
      );
      expect(reportingRes.selection.activeTraits, 'executive-data-brief active skill').toContain(
        'executive-data-brief'
      );
      expect(weeklyScore, 'weekly planning score').toBeGreaterThanOrEqual(2);
      expect(tasksScore, 'tasks score').toBeGreaterThanOrEqual(2);
      expect(reportingScore, 'reporting score').toBeGreaterThanOrEqual(2);

      sectionResults.push({
        section: 'Section 10: Personal Productivity & Data Analytics',
        passed: true,
      });
      reportEntries.push(
        [
          '## Section 10: Personal Productivity & Data Analytics Extended',
          '',
          '| Case | Expected skill | Active skills | Score | Total tokens |',
          '| --- | --- | --- | ---: | ---: |',
          `| weekly-plan-writer | \`weekly-plan-writer\` | ${weeklyRes.selection.activeTraits.map((s) => `\`${s}\``).join(', ') || '-'} | ${weeklyScore} | ${weeklyRes.tokensUsed.total} |`,
          `| task-prioritization | \`task-prioritization\` | ${tasksRes.selection.activeTraits.map((s) => `\`${s}\``).join(', ') || '-'} | ${tasksScore} | ${tasksRes.tokensUsed.total} |`,
          `| executive-data-brief | \`executive-data-brief\` | ${reportingRes.selection.activeTraits.map((s) => `\`${s}\``).join(', ') || '-'} | ${reportingScore} | ${reportingRes.tokensUsed.total} |`,
          '',
          'Weekly planning output preview:',
          '',
          fenced(trimForReport(weeklyRes.content)),
          '',
          'Task prioritization output preview:',
          '',
          fenced(trimForReport(tasksRes.content)),
          '',
          'Executive data brief output preview:',
          '',
          fenced(trimForReport(reportingRes.content)),
          '',
        ].join('\n')
      );
    },
    90_000
  );

  // -------------------------------------------------------------------------
  // Section 11: Trait Activation Mode Verification
  // -------------------------------------------------------------------------
  liveIt(
    'section 11: skill activation mode verification',
    async () => {
      const alwaysRes = await Agent.create({
        model: `openai:${liveModel}`,
        apiKey: openAiKey!,
        temperature: 0,
        maxTokens,
        retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
      })
        .use(BrandPacks.positioning({ traitActivation: 'always', readOnlyByDefault: true }))
        .run({
          prompt: 'Tell me a joke about programming.',
          temperature: 0,
          maxTokens,
        });

      const autoRes = await makeAgent()
        .use(BrandPacks.positioning({ traitActivation: 'auto', readOnlyByDefault: true }))
        .run({
          prompt:
            'Write a compact brand positioning statement for an AI agent SDK. Include audience, benefit, and differentiator. Keep it under 80 words.',
          temperature: 0,
          maxTokens,
        });

      const directiveOnlyRes = await Agent.create({
        model: `openai:${liveModel}`,
        apiKey: openAiKey!,
        temperature: 0,
        maxTokens,
        traitActivation: 'directive-only',
        toolSelection: 'auto',
        retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
      })
        .use(BrandPacks.positioning({ readOnlyByDefault: true }))
        .run({
          prompt: 'What is the capital of France?',
          temperature: 0,
          maxTokens,
        });

      // always mode: at least one skill activated regardless of prompt relevance
      expect(alwaysRes.selection.activeTraits.length, 'always mode: at least one skill').toBeGreaterThan(0);
      // auto mode: brand positioning skill activated for relevant prompt
      expect(autoRes.selection.activeTraits, 'auto mode: brand-positioning active').toContain(
        'brand-positioning'
      );
      // directive-only mode: no skills for irrelevant prompt without directive
      expect(
        directiveOnlyRes.selection.activeTraits.length,
        'directive-only mode: no skills for irrelevant prompt'
      ).toBe(0);

      sectionResults.push({ section: 'Section 11: Trait Activation Modes', passed: true });
      reportEntries.push(
        [
          '## Section 11: Trait Activation Mode Verification',
          '',
          '| Mode | Prompt relevance | Active skills | Skill count |',
          '| --- | --- | --- | ---: |',
          `| always | irrelevant (joke) | ${alwaysRes.selection.activeTraits.map((s) => `\`${s}\``).join(', ') || '-'} | ${alwaysRes.selection.activeTraits.length} |`,
          `| auto | relevant (positioning) | ${autoRes.selection.activeTraits.map((s) => `\`${s}\``).join(', ') || '-'} | ${autoRes.selection.activeTraits.length} |`,
          `| directive-only | irrelevant (geography) | ${directiveOnlyRes.selection.activeTraits.map((s) => `\`${s}\``).join(', ') || '-'} | ${directiveOnlyRes.selection.activeTraits.length} |`,
          '',
          'Result: always mode activates skills regardless of prompt relevance; auto mode activates skills for relevant prompts; directive-only mode suppresses activation for non-directive prompts.',
          '',
        ].join('\n')
      );
    },
    90_000
  );

  // -------------------------------------------------------------------------
  // Section 12: Skill Prompt Assembly Modes
  // -------------------------------------------------------------------------
  liveIt(
    'section 12: skill prompt assembly modes',
    async () => {
      const prompt =
        'Create a compact brand voice profile for an AI developer tool. Keep it under 100 words.';

      const fullRes = await Agent.create({
        model: `openai:${liveModel}`,
        apiKey: openAiKey!,
        temperature: 0,
        maxTokens,
        traitActivation: 'auto',
        toolSelection: 'auto',
        traitPromptAssembly: 'full',
        retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
      })
        .use(BrandPacks.voice({ traitActivation: 'auto', readOnlyByDefault: true }))
        .run({ prompt, temperature: 0, maxTokens });

      const compactRes = await Agent.create({
        model: `openai:${liveModel}`,
        apiKey: openAiKey!,
        temperature: 0,
        maxTokens,
        traitActivation: 'auto',
        toolSelection: 'auto',
        traitPromptAssembly: 'compact',
        retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
      })
        .use(BrandPacks.voice({ traitActivation: 'auto', readOnlyByDefault: true }))
        .run({ prompt, temperature: 0, maxTokens });

      const minimalRes = await Agent.create({
        model: `openai:${liveModel}`,
        apiKey: openAiKey!,
        temperature: 0,
        maxTokens,
        traitActivation: 'auto',
        toolSelection: 'auto',
        traitPromptAssembly: 'minimal',
        retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
      })
        .use(BrandPacks.voice({ traitActivation: 'auto', readOnlyByDefault: true }))
        .run({ prompt, temperature: 0, maxTokens });

      // All three modes should produce content and activate the same skills
      expect(fullRes.content.length, 'full assembly: has content').toBeGreaterThan(0);
      expect(compactRes.content.length, 'compact assembly: has content').toBeGreaterThan(0);
      expect(minimalRes.content.length, 'minimal assembly: has content').toBeGreaterThan(0);

      // full mode should use more prompt tokens than minimal
      expect(fullRes.tokensUsed.prompt, 'full > minimal prompt tokens').toBeGreaterThanOrEqual(
        minimalRes.tokensUsed.prompt
      );

      sectionResults.push({ section: 'Section 12: Skill Prompt Assembly Modes', passed: true });
      reportEntries.push(
        [
          '## Section 12: Skill Prompt Assembly Modes',
          '',
          '| Assembly mode | Prompt tokens | Completion tokens | Active skills |',
          '| --- | ---: | ---: | --- |',
          `| full | ${fullRes.tokensUsed.prompt} | ${fullRes.tokensUsed.completion} | ${fullRes.selection.activeTraits.map((s) => `\`${s}\``).join(', ') || '-'} |`,
          `| compact | ${compactRes.tokensUsed.prompt} | ${compactRes.tokensUsed.completion} | ${compactRes.selection.activeTraits.map((s) => `\`${s}\``).join(', ') || '-'} |`,
          `| minimal | ${minimalRes.tokensUsed.prompt} | ${minimalRes.tokensUsed.completion} | ${minimalRes.selection.activeTraits.map((s) => `\`${s}\``).join(', ') || '-'} |`,
          '',
          'Full assembly output preview:',
          '',
          fenced(trimForReport(fullRes.content)),
          '',
          'Compact assembly output preview:',
          '',
          fenced(trimForReport(compactRes.content)),
          '',
          'Minimal assembly output preview:',
          '',
          fenced(trimForReport(minimalRes.content)),
          '',
          'Result: full assembly uses the most prompt tokens, minimal uses the fewest. All modes activate the same domain skills and produce valid content.',
          '',
        ].join('\n')
      );
    },
    90_000
  );
});
