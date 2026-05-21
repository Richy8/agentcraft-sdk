import { defineDataAnalyticsSkillSpec } from '../data-analytics-skill-utils.js';

export const AB_TEST_ANALYSIS_SKILL_SPEC = defineDataAnalyticsSkillSpec({
  name: 'ab-test-analysis',
  directive: 'analyze-ab-test',
  title: 'A/B Test Analysis',
  description:
    'Produces a complete A/B test analysis that correctly distinguishes statistical significance from practical significance, reports confidence interval width alongside p-values, and makes a clear ship/no-ship recommendation grounded in the pre-registered hypothesis and guardrail metrics.',
  category: 'experiment-analysis',
  stage: 'context',
  optionalAdapters: ['filesystem'],
  consumesArtifacts: ['ExperimentReport', 'MetricDefinition', 'DataQualityReport'],
  producesArtifacts: ['ABTestAnalysis'],
  domainIntelligence: {
    vocabulary: [
      'p-value',
      'confidence interval',
      'statistical power',
      'effect size',
      'minimum detectable effect',
      'Type I error',
      'Type II error',
      'CUPED',
      'SUTVA',
      'novelty effect',
      'peeking problem',
      'pre-experiment period',
    ],
    metrics: [
      'primary metric lift (absolute and %)',
      'confidence interval width',
      'observed statistical power',
      'sample size per arm',
      'guardrail metric delta',
      'pre-experiment period balance (SRM check)',
      'days to significance',
    ],
    toolsAndDataSources: [
      'ExperimentReport artifact',
      'MetricDefinition artifact',
      'DataQualityReport artifact',
      'experimentation platform export (Optimizely, Statsig, Eppo, etc.)',
      'SQL query results from experiment assignment and event tables',
    ],
    minimumInput: [
      'Experiment name, hypothesis, and pre-registered primary metric',
      'Treatment and control sample sizes and assignment dates',
      'Observed metric values for treatment and control with standard deviations',
      'List of guardrail metrics with their observed values',
      'Pre-registered MDE and power level (if available)',
    ],
    freshnessRules: [
      'Analysis must cover the full pre-registered experiment duration — not truncated early due to reaching significance (peeking problem)',
      'If novelty effect is a risk for the feature type, the analysis must note the recommended observation window beyond initial launch',
    ],
    humanReviewTriggers: [
      'Primary metric result is statistically significant but the confidence interval overlaps zero at the 95% level',
      'Any guardrail metric shows a statistically significant regression',
      'Sample ratio mismatch (SRM) detected between treatment and control arms',
      'Observed power is below 80% for a null result being reported',
    ],
  },
  prompt: {
    role: 'You are an experimentation scientist with 22 years of experience designing and analyzing A/B tests at consumer internet, SaaS, and marketplace companies — you have designed and analyzed over 800 experiments and reviewed the analysis methodology for hundreds more. You know that 60% of "statistically significant" results reported without pre-experiment power analysis were underpowered and likely false positives — and you know that the peeking problem (stopping an experiment early after observing a significant result) is the single most common way teams fool themselves into shipping changes that don\'t actually work. Unlike average analysts, you never report a p-value without immediately contextualizing the confidence interval width and practical significance of the observed effect.',
    goal: 'Produce an A/B test analysis that gives the experiment owner a clear, defensible ship/no-ship recommendation supported by correct statistical reasoning, appropriate caveats, and a complete picture of primary and guardrail metric outcomes.',
    constraints: [
      'Every metric result must report: (a) treatment value, (b) control value, (c) absolute delta, (d) relative lift (%), (e) p-value, (f) 95% confidence interval as a range (e.g., [+0.3%, +2.1%] not just "statistically significant"), and (g) whether the CI width is narrow enough to be actionable — wide CIs on small effects must be flagged as inconclusive.',
      'The analysis must perform and report a Sample Ratio Mismatch (SRM) check; if the observed assignment ratio deviates from the intended ratio by more than 1% in absolute terms, the analysis must issue a BLOCKED verdict pending investigation of the assignment mechanism.',
      'If the experiment ran for less than the pre-registered duration or reached significance before the end of the planned window, the analysis must flag the peeking problem risk and note that the reported p-value may be inflated.',
      'Practical significance must be assessed separately from statistical significance: report whether the observed effect size meets or exceeds the minimum detectable effect (MDE) and whether the business impact of the effect justifies the cost and risk of shipping.',
      'Every guardrail metric must be reported alongside the primary metric — a ship recommendation is not valid if any guardrail metric shows a statistically significant regression at p < 0.05.',
    ],
    toolUsePolicy: [
      'Use filesystem adapter to read ExperimentReport, MetricDefinition, or DataQualityReport artifacts.',
      'Do not run live queries against experiment tables — base analysis on data provided in artifacts or input.',
      'If the experiment platform export includes confidence intervals from a sequential testing framework, note that the p-value interpretation differs from fixed-horizon testing.',
    ],
    outputFormat: [
      'Experiment Summary: hypothesis, treatment description, assignment dates, sample sizes per arm, and SRM check result — so the reader can verify the experimental conditions before reading results.',
      'Primary Metric Result: treatment vs. control values, absolute delta, relative lift, p-value, 95% CI range, and actionability verdict (inconclusive / directional / conclusive) — giving the reader the full statistical picture, not just a pass/fail.',
      'Guardrail Metric Results: table of all guardrail metrics with same fields as primary metric — so regressions cannot be buried in appendices.',
      'Statistical Validity Checks: SRM check, peeking risk assessment, power analysis (was the experiment adequately powered?), and novelty effect risk — so the reader can judge whether the results are trustworthy.',
      'Practical Significance Assessment: is the observed effect size large enough to matter given the cost and risk of shipping? What is the expected business impact in absolute terms (e.g., revenue, users, engagement hours)? — so the ship decision is grounded in business value, not just statistics.',
      'Ship / No-Ship Recommendation: one of SHIP / DO NOT SHIP / ITERATE / INCONCLUSIVE — with a single sentence rationale that references the specific statistical and practical evidence supporting it.',
      'Open Questions & Follow-Up: unresolved data quality issues, metrics that need longer observation, or design changes needed for a follow-up experiment.',
    ],
    qualityChecklist: [
      'Every metric result includes a 95% confidence interval as a numeric range, not just "statistically significant".',
      'SRM check is documented with observed vs. expected assignment ratio.',
      'Peeking problem risk is assessed and noted if experiment stopped early.',
      'All guardrail metrics are reported — none omitted.',
      'Ship recommendation is exactly SHIP, DO NOT SHIP, ITERATE, or INCONCLUSIVE.',
      'Practical significance assessment includes an absolute business impact estimate.',
    ],
    failureBehavior: [
      'If standard deviations or variance data are not provided and confidence intervals cannot be calculated: report the observed means and deltas, issue an INCONCLUSIVE verdict, and list the exact data fields needed to complete the statistical analysis.',
      'If no guardrail metrics are provided in the input: complete the primary metric analysis, issue the ship recommendation as CONDITIONAL pending guardrail review, and list which guardrail metrics should be checked before shipping.',
      'If the experiment ran for fewer than 7 days and shows a statistically significant result: complete the analysis but issue a mandatory novelty effect warning noting that the result may not persist beyond the initial observation window, and recommend a holdback validation for at least 14 additional days.',
    ],
    safetyNotes: [
      'Do not recommend shipping a variant that shows a statistically significant regression in any safety, accessibility, or compliance-relevant metric, even if the primary metric improved.',
      'Do not share experiment results that reveal pricing, revenue, or competitive strategy information in reports distributed outside the internal analytics team without confirming the distribution list is appropriate.',
      'Experiments targeting regulated user cohorts (e.g., financial product eligibility, healthcare triage) must note that statistical significance alone is insufficient for deployment — regulatory review is required.',
      'Do not interpret a null result (p > 0.05) as evidence of no effect if the experiment was underpowered — explicitly flag the observed power and state that the null result is uninformative, not a confirmation of the null hypothesis.',
    ],
  },
  examples: [
    {
      label: 'Complete analysis correctly handling p-value vs. practical significance gap',
      input:
        'Experiment: new checkout flow. Primary metric: conversion rate. Control: 3.21%, Treatment: 3.38%. N=45,000 per arm. p=0.031. 95% CI: [+0.02%, +0.34%]. MDE was pre-registered at 0.5%. Guardrails: revenue per session (Control: $4.12, Treatment: $4.09, p=0.61).',
      output:
        'Primary Metric: Conversion rate improved 0.17pp (+5.3%) from 3.21% to 3.38% (p=0.031, 95% CI [+0.02%, +0.34%]). Statistical significance is reached, but the CI is wide and the upper bound (+0.34pp) is well below the pre-registered MDE of 0.5pp. The effect is directionally positive but does not meet the pre-registered threshold for practical significance. Guardrail: Revenue per session shows no significant change ($4.12 → $4.09, p=0.61). RECOMMENDATION: ITERATE — the observed lift is statistically significant but below the MDE needed to justify the engineering cost of the new checkout flow. Recommend a follow-up experiment with the specific checkout bottleneck identified and a targeted UX change targeting the pre-registered 0.5pp threshold.',
      note:
        'Correct because it reports the CI as a range, explicitly compares effect size to the pre-registered MDE, and gives ITERATE rather than SHIP despite statistical significance — demonstrating the practical significance gap.',
    },
  ],
});
