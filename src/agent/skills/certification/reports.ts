import type { SkillQualityScore } from './types.js';

export function formatSkillQualityCertificationReport(scores: readonly SkillQualityScore[]): string {
  const passing = scores.filter((score) => score.passed).length;
  const production = scores.filter((score) => score.productionPassed).length;
  return [
    '# Skill Quality Certification',
    '',
    `Total skills: ${scores.length}`,
    `Baseline passing: ${passing}`,
    `Production tier: ${production}`,
    '',
    '| Skill | Score | Tier | Missing signals |',
    '| --- | ---: | --- | --- |',
    ...scores.map((score) =>
      `| ${score.skill} | ${score.score}/${score.maxScore} | ${score.tier} | ${
        score.missingSignals.length === 0 ? '-' : score.missingSignals.join(', ')
      } |`,
    ),
  ].join('\n');
}
