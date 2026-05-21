import type { SkillSpec } from '../registries/index.js';
import { SKILL_QUALITY_RUBRICS } from './rubrics.js';
import type { SkillQualityScore } from './types.js';

export function scoreSkillSpecQuality(spec: SkillSpec): SkillQualityScore {
  const promptText = [
    spec.prompt?.role,
    spec.prompt?.goal,
    ...(spec.prompt?.constraints ?? []),
    ...(spec.prompt?.toolUsePolicy ?? []),
    ...(spec.prompt?.outputFormat ?? []),
    ...(spec.prompt?.qualityChecklist ?? []),
    ...(spec.prompt?.failureBehavior ?? []),
    ...(spec.prompt?.safetyNotes ?? []),
    JSON.stringify(spec.domainIntelligence ?? {}),
  ]
    .filter(Boolean)
    .join('\n');

  const missingSignals: string[] = [];
  let score = 0;
  let maxScore = 0;

  for (const rubric of SKILL_QUALITY_RUBRICS) {
    maxScore += rubric.maxScore;
    const hits = rubric.requiredSignals.filter((signal) => promptContainsSignal(promptText, signal));
    if (hits.length === rubric.requiredSignals.length) {
      score += rubric.maxScore;
    } else {
      score += Math.round((hits.length / rubric.requiredSignals.length) * rubric.maxScore);
      missingSignals.push(...rubric.requiredSignals.filter((signal) => !hits.includes(signal)));
    }
  }

  const baselineThreshold = Math.ceil(maxScore * 0.85);
  const productionThreshold = Math.ceil(maxScore * 0.95);
  const passed = score >= baselineThreshold;
  const productionPassed = score >= productionThreshold;

  return {
    skill: spec.name,
    score,
    maxScore,
    baselineThreshold,
    productionThreshold,
    passed,
    productionPassed,
    tier: productionPassed ? 'production' : passed ? 'baseline' : 'review',
    missingSignals,
  };
}

function promptContainsSignal(promptText: string, signal: string): boolean {
  if (promptText.toLowerCase().includes(signal.toLowerCase())) return true;

  switch (signal) {
    case 'vocabulary':
      return /vocabulary|terminology|terms|domain language|jargon|lexicon/i.test(promptText);
    case 'artifacts':
      return /artifact|deliverable|brief|report|memo|scorecard|checklist|map|plan|table|matrix/i.test(promptText);
    case 'metricsAndSignals':
      return /metric|signal|kpi|conversion|retention|revenue|risk score|confidence|threshold|baseline/i.test(promptText);
    case 'toolsAndDataSources':
      return /tool|data source|adapter|source|database|crm|analytics|search|crawl|fetch|transcript|repository/i.test(
        promptText,
      );
    case 'riskBoundaries':
      return /risk boundar|risk|guardrail|approval|side effect|compliance|safety|harm|blast radius|exposure/i.test(
        promptText,
      );
    case 'antiStuffingNotes':
      return /anti[- ]?stuffing|stuffing|do not force|do not pad|avoid decorative|jargon|keyword stuffing|vocabulary stuffing/i.test(
        promptText,
      );
    case 'stuffing':
      return /\b(stuff|stuffing|jargon|vocabulary|terms|terminology)\b/i.test(promptText);
    case 'Failure mode to avoid':
      return /Failure mode to avoid|failure mode|failure behavior|if .*?(no|not provided|not specified|missing|unavailable|insufficient|conflicting|too|only)|do not .*?(generic|fabricate|invent)|fallback|recovery/i.test(
        promptText,
      );
    case 'Do not':
      return /\b(do not|never|must not|cannot|without|no-go|no go)\b/i.test(promptText);
    case 'Do not invent':
      return /Do not (invent|fabricate|manufacture|assume|improvise|extrapolate)|not be invented|without inventing|no fake|Do not .*?(evidence|general knowledge|without .*?data|unsupported|unverified|confidential|MNPI)|not evidence|not assumed|must be confirmed|requires? .*?(validation|verification|review)|cannot be completed without|cannot be verified|flag .*?(gap|unavailable|unknown)|do not assume/i.test(
        promptText,
      );
    case 'assumption':
      return /assumption|assume|assumed|inference|hypothesis|confidence|uncertainty|unverified|management-asserted|preliminary|not assumed|confirmed|validation|required|not provided|data not provided|current information|subject to change|opinion|proposed/i.test(
        promptText,
      );
    case 'evidence':
      return /evidence|source|proof|verified|corroborat/i.test(promptText);
    case 'specific':
      return /specific|exact|concrete|useful|named|role|achievement|metric/i.test(promptText);
    default:
      return false;
  }
}
