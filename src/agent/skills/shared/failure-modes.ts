export const genericSkillFailureModes = [
  'Producing a template answer when the minimum input is missing.',
  'Using domain jargon to hide weak reasoning.',
  'Making confident recommendations without naming assumptions, evidence limits, or risk boundaries.',
] as const;

export const publicFacingContentFailureModes = [
  'Opening with broad significance instead of a concrete reason to continue.',
  'Padding the ending with generic summary instead of resolving the tension or naming the next action.',
  'Writing something that could have been written by anyone about anything.',
] as const;
