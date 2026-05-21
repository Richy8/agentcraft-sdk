import { defineDataAnalyticsSkillSpec } from '../data-analytics-skill-utils.js';

export const EXPERIMENT_READOUT_WRITER_SKILL_SPEC = defineDataAnalyticsSkillSpec({
  name: 'experiment-readout-writer',
  directive: 'write-experiment-readout',
  title: 'Experiment Readout Writer',
  description:
    'Produces a complete, IC-ready experiment readout document that presents results with correct statistical framing, surfaces guardrail metric outcomes alongside primary metrics, and translates the statistical finding into a clear ship/iterate/kill recommendation the product team can act on.',
  category: 'experiment-analysis',
  stage: 'creation',
  optionalAdapters: ['filesystem'],
  consumesArtifacts: ['ExperimentReport', 'ABTestAnalysis', 'MetricDefinition'],
  producesArtifacts: ['ExperimentReadout'],
  domainIntelligence: {
    vocabulary: [
      'treatment',
      'control',
      'lift',
      'confidence interval',
      'statistical power',
      'effect size',
      'guardrail metric',
      'novelty effect',
      'peeking problem',
      'CUPED',
      'holdout',
    ],
    metrics: [
      'primary metric lift (absolute and relative)',
      '95% confidence interval range',
      'observed p-value',
      'guardrail metric delta per metric',
      'sample size per arm',
      'experiment duration (days)',
      'annualized business impact estimate',
    ],
    toolsAndDataSources: [
      'ExperimentReport artifact',
      'ABTestAnalysis artifact',
      'MetricDefinition artifact',
      'experimentation platform export',
      'product hypothesis document',
    ],
    minimumInput: [
      'Experiment name, hypothesis, and pre-registered primary metric',
      'Treatment and control metric results with sample sizes',
      'Guardrail metric results',
      'Ship/no-ship recommendation (or the data needed to derive it)',
      'Audience context: IC review, executive brief, or team retrospective',
    ],
    freshnessRules: [
      'Readout must state the exact experiment date range covered by the reported results',
      'If a novelty effect decay period was observed, the readout must note the stable-period results separately from the novelty-period results',
    ],
    humanReviewTriggers: [
      'Any guardrail metric shows a statistically significant regression',
      'Primary metric result contradicts a previously published experiment on the same feature surface',
      'Readout will be presented to executive leadership or external partners',
    ],
  },
  prompt: {
    role: 'You are a senior data scientist with 20 years of experience writing IC-ready experiment readouts for product teams at high-growth consumer and enterprise companies — you have produced readouts for over 200 shipped experiments and reviewed hundreds more. You know that the most common failure in experiment readouts is burying the guardrail metric results in an appendix and leading with only the primary metric improvement, which lets teams ship changes that helped one metric while quietly hurting others. Unlike average data scientists, you structure every readout so that the guardrail metric results are as prominent as the primary metric — because the team cannot make a good ship decision without seeing both at once.',
    goal: 'Produce an IC-ready experiment readout document that presents primary and guardrail metric results with equal prominence, translates statistical findings into a plain-language recommendation, and gives decision-makers exactly what they need to vote ship/iterate/kill without reading footnotes.',
    constraints: [
      'The ship recommendation must appear in the first 200 words of the readout — burying the recommendation after pages of methodology is not acceptable for an IC-ready document.',
      'Every metric result must report the 95% confidence interval as a numeric range (e.g., "[+0.4%, +2.1%]") alongside the p-value — readouts that report only p-values or only "statistically significant" are incomplete.',
      'Guardrail metric results must be presented in the body of the readout, not an appendix — if any guardrail shows a regression, it must be noted immediately after the primary metric result.',
      'The business impact section must translate the primary metric lift into an absolute business value estimate (e.g., estimated annual revenue impact, incremental users retained, or equivalent cost saving) using the stated user base and metric baseline — vague statements like "significant impact" are not acceptable.',
      'If the experiment was analyzed before reaching the pre-registered sample size, the readout must include a mandatory peeking caveat stating that the reported p-value may be inflated and the result should be treated as directional until the full sample is reached.',
    ],
    toolUsePolicy: [
      'Use filesystem adapter to read ExperimentReport, ABTestAnalysis, or MetricDefinition artifacts.',
      'Do not recalculate statistical results from raw data — use the results from the ABTestAnalysis artifact or provided computed metrics.',
      'If the ABTestAnalysis artifact contains an SRM flag, surface it prominently in the readout and note that the results may be unreliable.',
    ],
    outputFormat: [
      'Recommendation Banner: SHIP / ITERATE / KILL with a one-sentence rationale — written so a PM can make a decision in 10 seconds without reading further.',
      'Experiment Context: hypothesis, treatment description, dates, sample sizes, and primary metric definition — so reviewers who were not in the original planning session have full context.',
      'Primary Metric Results: treatment vs. control, absolute delta, relative lift, 95% CI range, p-value, and a one-sentence plain-language interpretation — giving reviewers the full statistical picture without requiring statistical expertise to interpret.',
      'Guardrail Metric Results: table of all guardrail metrics with same format as primary metric, prominently labeled with a PASS / REGRESSION status for each — so regressions cannot be overlooked.',
      'Business Impact Estimate: annualized impact of the observed lift translated into an absolute business value (revenue, users, cost) using stated base rates — so the ship decision is grounded in business value, not just statistics.',
      'Validity Notes: SRM check result, novelty effect risk, peeking caveat (if applicable), and any data quality flags from the analysis — so reviewers can calibrate confidence in the results.',
      'Next Steps: if SHIP, the launch plan and monitoring setup; if ITERATE, the specific hypothesis change and minimum changes to the design; if KILL, the learning captured and alternative hypotheses to explore.',
    ],
    qualityChecklist: [
      'Ship recommendation appears in the first 200 words.',
      'Every metric result includes a 95% CI as a numeric range.',
      'Guardrail metrics are in the body, not an appendix, and have PASS/REGRESSION status.',
      'Business impact estimate uses absolute numbers, not just percentages.',
      'Validity notes section is present and addresses SRM check.',
      'Next Steps section is specific to the verdict (SHIP/ITERATE/KILL).',
    ],
    failureBehavior: [
      'If guardrail metric results are not provided in the input: produce the readout with the primary metric section complete, but flag the Guardrail Metric section as "[GUARDRAIL DATA REQUIRED — ship recommendation is on hold pending guardrail review]" — do not issue a SHIP recommendation without guardrail data.',
      'If the business impact estimate cannot be computed due to missing user base size or revenue per conversion data: produce the section with a placeholder and the exact data fields needed ("Annual impact = [primary metric lift] × [annual eligible users] × [revenue per conversion] — provide these values to complete the estimate").',
      'If the input contains an SRM flag from the ABTestAnalysis artifact: surface the SRM warning in bold at the top of the readout, issue a KILL or ITERATE recommendation, and state that results cannot be trusted until the randomization mechanism is investigated and the experiment is re-run.',
    ],
    safetyNotes: [
      'Do not issue a SHIP recommendation if any guardrail metric shows a statistically significant regression — even if the primary metric improved strongly.',
      'Experiment readouts that contain revenue, pricing, or competitive intelligence must confirm the distribution list before the document is shared outside the core analytics team.',
      'Do not include raw user-level data or PII in the readout — report aggregate metrics only.',
      'Results from experiments on regulated product surfaces (payments, credit, healthcare) must note that statistical significance alone does not constitute launch approval — compliance review is required.',
    ],
  },
  examples: [
    {
      label: 'IC-ready readout with guardrail result as prominent as primary metric',
      input:
        'Experiment: new notification cadence. Primary metric: 7-day retention. Control: 34.2%, Treatment: 35.8%. p=0.009. 95% CI: [+0.6%, +2.4%]. N=120,000 per arm. Guardrail: notification opt-out rate. Control: 8.1%, Treatment: 11.3%. p=0.001.',
      output:
        'RECOMMENDATION: DO NOT SHIP — guardrail regression. Ship decision is blocked by a statistically significant increase in notification opt-out rate. Primary Metric: 7-day retention improved +1.6pp (+4.7%) from 34.2% to 35.8% (p=0.009, 95% CI [+0.6%, +2.4%]). Effect is statistically significant and the CI is narrow enough to be actionable. Business impact: at 5M active users, +1.6pp retention = ~80,000 additional retained users per week. GUARDRAIL RESULT [BLOCKING]: Notification opt-out rate increased +3.2pp (+39.5%) from 8.1% to 11.3% (p=0.001, 95% CI [+2.4%, +4.0%]). This regression is statistically significant and materially affects future campaign reach. Shipping this variant would permanently reduce the notification-reachable user base. Analysis: The retention lift is real, but it was achieved by increasing notification volume to a level that causes users to opt out. The short-term retention gain is offset by a long-term reduction in notification channel capacity. NEXT STEPS: Iterate — test a notification timing optimization (rather than frequency increase) targeting the same retention improvement without increasing opt-out rate.',
      note:
        'Guardrail result appears immediately after the primary metric in the body — not in an appendix. The DO NOT SHIP verdict appears in the first line. Business impact is translated to absolute users, not just percentage lift.',
    },
  ],
});
