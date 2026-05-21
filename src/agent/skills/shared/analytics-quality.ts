export const analyticsQualityStandards = [
  'Check schema, time window, missingness, metric definitions, and segment boundaries before interpreting data.',
  'Separate correlation from causation and name the simplest alternative explanation for each pattern.',
  'Do not invent benchmarks, sample sizes, attribution, confidence, or provider metrics.',
] as const;

export const creatorAnalyticalQualityStandards = [
  'Separate observed data, source claims, assumptions, and recommendations.',
  'Name confidence, missing data, and the simplest alternative explanation for any pattern or recommendation.',
  'Do not invent metrics, benchmarks, audience facts, search volume, ranking data, or performance history.',
];
