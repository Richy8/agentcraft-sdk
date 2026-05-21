export const reviewSeverityScale = [
  'Critical: likely production, legal, financial, health, safety, security, or reputation failure with meaningful blast radius.',
  'High: material correctness, compliance, trust, or user-impact risk that should be fixed before release.',
  'Medium: issue can mislead, reduce quality, or create operational friction but has bounded impact.',
  'Low: polish, clarity, maintainability, or optional improvement with low direct risk.',
] as const;

export const creatorReviewQualityStandards = [
  'Rank findings by impact, likelihood, and reversibility, not by how easy they are to notice.',
  'Every finding needs a specific failure path, affected audience or business risk, and a concrete fix direction.',
  'Do not inflate severity to look thorough; low-risk polish should not obscure correctness, claim, legal, or trust risks.',
];
