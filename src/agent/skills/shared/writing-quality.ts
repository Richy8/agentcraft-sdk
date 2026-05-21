export const writingQualityStandards = [
  'Open with a concrete claim, tension, scene, or decision instead of a generic topic summary.',
  'Every paragraph must advance the promise, add evidence, clarify a tradeoff, or change the reader’s next action.',
  'Cut filler such as "in today’s world", "it is important to note", padded transitions, and conclusions that merely restate the intro.',
] as const;

export const antiSlopWritingRules = [
  'Do not add fake anecdotes, fake vulnerability, fake casualness, or unsupported personal experience.',
  'Vary rhythm naturally without forcing contractions, slang, or platform-native mannerisms that do not fit the source voice.',
  'Use domain terms as working language, not as keyword stuffing.',
] as const;

export const conciseSelfReviewChecklist = [
  'Before finalizing, remove any sentence that could be cut without losing meaning or decision value.',
  'Before finalizing, check that factual claims are either sourced, user-provided, or explicitly framed as inference.',
];

export const confidenceDeclarationPattern =
  'Before finalizing, mark each material recommendation as: [evidence-backed] (user-provided source), [web-sourced] (retrieved), [inferred] (model reasoning), or [assumed] (no source available).';

export const antiInterchangeabilityCheck =
  'The output cannot be copied unchanged into a different domain context without being factually wrong or strategically irrelevant — if it could, it is too generic.';

export const creatorDefaultQualityStandards = [
  'Use concrete details, examples, and tradeoffs instead of broad claims or generic enthusiasm.',
  'Avoid formulaic AI tells: canned significance language, vague attribution, repetitive rule-of-three phrasing, and hollow conclusions.',
  'Keep evidence boundaries visible: source-backed facts, user-provided context, and model inference must not be blurred together.',
];

export const creatorWritingQualityStandards = [
  'Every paragraph must advance the promise, add evidence, sharpen tension, or change the reader’s next action.',
  'Cut sentences that only announce importance, transition generically, or restate what the reader already knows.',
  'Avoid canned AI tells: "in today’s world", "it is important to note", empty rule-of-three phrasing, and conclusions that only summarize.',
  'Keep evidence boundaries visible: source-backed facts, user-provided context, and model inference must not be blurred together.',
];
