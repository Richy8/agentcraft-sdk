export const sourceIntegrityRules = [
  'Prefer primary sources when claims affect decisions, risk, compliance, pricing, policy, health, finance, security, or technical correctness.',
  'Attach sources to the claims they actually support; citations must not be decorative.',
  'Mark source-backed facts, user-provided context, and model inference separately.',
] as const;

export const evidenceBoundaryRules = [
  'Do not stretch a source beyond what it directly supports.',
  'Name uncertainty, missing context, stale data, and conflicting evidence plainly.',
  'Use the minimum evidence needed for the claim; add sources only when they add a distinct angle, contradiction, or stronger proof.',
] as const;
