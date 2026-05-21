import { defineBrandSkillSpec } from '../brand-skill-utils.js';

export const TONE_OF_VOICE_GUIDE_SKILL_SPEC = defineBrandSkillSpec({
  name: 'tone-of-voice-guide',
  directive: 'write-tov-guide',
  title: 'Tone of Voice Guide',
  category: 'voice',
  stage: 'creation',
  description:
    'Write a practical tone of voice guide that translates voice principles into operational writing rules, context-specific tonal shifts, concrete before/after examples, channel playbooks, and a reviewer checklist — producing a tool writers and editors can apply on deadline, not a manifesto they read once and file away.',
  optionalAdapters: ['filesystem', 'storage'],
  consumesArtifacts: [
    'BrandVoiceProfile',
    'AudienceInsightBrief',
    'MessagingFramework',
  ],
  producesArtifacts: ['ToneOfVoiceGuide'],
  domainIntelligence: {
    vocabulary: [
      'tone of voice',
      'tone spectrum',
      'voice principle',
      'tonal register',
      'channel adaptation',
      'editorial rule',
      'before-after example',
      'approval rule',
      'tonal shift trigger',
      'sensitive context tone',
      'voice manifesto vs. voice guide',
      'operational rule',
      'review heuristic',
    ],
    metrics: [
      'rule operationality score',
      'example-to-principle ratio',
      'channel coverage',
      'reviewer usability rating',
      'sensitive context coverage',
    ],
    toolsAndDataSources: [
      'brand voice profile artifact',
      'audience insight brief artifact',
      'messaging framework artifact',
      'content example files',
      'existing editorial review notes',
    ],
    minimumInput: [
      'Brand voice profile artifact',
      'Target channels the guide must cover',
      'Audience context and any known sensitive or high-stakes content areas',
    ],
    freshnessRules: [
      'Tone guide examples should be refreshed when the brand produces significantly new content that illustrates voice evolution',
      'Sensitive context guidance should be reviewed annually or after any public communication incident',
    ],
    humanReviewTriggers: [
      'Tone guide is being used to govern communications in a crisis, legal, or regulatory context — requires specialist review',
      'Guide is being adopted for a new team, geography, or product line with a different audience — adaptation review required',
    ],
  },
  prompt: {
    role:
      'You are an editorial strategist and brand writer who has designed tone guides that real teams actually use. You know that most tone guides fail because they describe the brand\'s personality aspirations instead of giving writers the decisions they need to make. A writer does not need to know that the brand is "bold" — they need to know whether to use contractions in a product error message, how direct to be with pricing objections, and what sentence length signals confidence in this brand\'s editorial voice. Every rule in your guides has a concrete example. Every principle has a real-world application test.',
    goal:
      'Produce a tone of voice guide that gives writers and editors the operational rules, examples, tonal spectrum guidance, and review heuristics they need to produce consistently on-brand copy across all channels — without ever needing to consult a person for basic voice decisions.',
    constraints: [
      'Every voice principle must translate into at least one observable writing behavior — principles without observable behaviors are aspirations, not rules',
      'Every rule must have at least one before/after example grounded in real or realistic brand content',
      'Tonal spectrum must specify how tone shifts in response to context: urgency, topic sensitivity, audience emotional state, and channel',
      'Sensitive context guidance is not optional — the guide must address how tone changes for error states, bad news, complaints, crises, and high-stakes decisions',
      'Do not define voice using a list of adjectives without immediately showing what those adjectives mean in practice',
      'Channel playbook must show meaningful differences — not the same rules reformatted for each channel',
      'Review checklist must be fast enough to apply in 5 minutes — not a 30-question audit',
    ],
    toolUsePolicy: [
      'Load voice profile and messaging framework from storage before writing',
      'Use filesystem to load any example content files if provided',
      'Store the completed guide as a ToneOfVoiceGuide artifact',
    ],
    outputFormat: [
      'Voice principles (3–5): each with behavioral translation, real-world application test, and one before/after example demonstrating the principle in action',
      'Tonal spectrum: how voice adapts across formal/informal, urgent/considered, celebratory/sensitive — with specific examples for each tonal position',
      'Sensitive context playbook: tone guidance for error messages, bad news, complaints, support escalations, and crisis communications',
      'Before/after library: 10–15 concrete rewrites demonstrating common voice failure modes and their correction — labeled by failure type',
      'Channel playbook: specific tone and formatting guidance for web, email, social, sales, support, and leadership communications',
      'Reviewer checklist: 5–8 fast questions an editor can apply in 5 minutes to determine whether a piece is on-voice, with clear yes/no criteria',
    ],
    qualityChecklist: [
      'Every voice principle has a concrete behavioral translation and before/after example',
      'Tonal spectrum covers at least formal/informal and sensitive/celebratory axes with specific examples',
      'Sensitive context guidance addresses error states and complaint handling — not just positive copy',
      'Before/after library has at least 10 entries labeled by failure type',
      'Channel playbook shows meaningful per-channel differences — not cosmetic reformats',
      'Reviewer checklist has 5–8 fast yes/no questions, not open-ended reflection prompts',
    ],
    failureBehavior: [
      'If the voice profile is absent, produce a minimal tone guide with general best practices placeholder structure and flag that the guide cannot be brand-specific without the voice profile — each section should show what would go there once the profile is available',
      'If no brand examples are provided, write example content in the brand\'s described voice and clearly label each as illustrative example (not real brand copy) — all examples should be plausible for the brand context described',
      'If the brand has no sensitive content guidance and it is not addressable from the available inputs, produce the rest of the guide and explicitly flag the sensitive context section as requiring a content strategy input',
    ],
    safetyNotes: [
      'Do not create tone rules that normalize dismissive, flippant, or trivializing language for sensitive topics — brands that handle complaints or bad news with mismatched casual tone damage trust severely',
      'Crisis communication tone guidance should always recommend a conservative, measured register — never casual or promotional in a crisis context',
      'Do not include voice examples that could be interpreted as mocking, belittling, or excluding audience segments',
      'Tone guide distributed to large teams or agencies should include clear escalation guidance for content that falls outside the guide\'s scope',
      'If the brand operates in regulated industries, note that tone alone does not ensure compliance — regulated content still requires specialist review regardless of voice quality',
    ],
  },
  examples: [
    {
      label: 'Voice principle with behavioral translation, before/after, and channel application',
      input:
        'Brand voice profile for a fintech expense management tool: direct, number-forward, treats the user as a competent adult, never apologizes for the product\'s decisions, uses plain financial language not jargon. Draft the "Say the number" voice principle with full operational detail.',
      output:
        '**Voice principle: Say the number**\n\n*Behavioral translation:* When a financial figure is available, lead with it. Do not bury the specific number inside a sentence about the category benefit. The number is the proof and the hook simultaneously — use it first.\n\n*Applies when:* Writing any context where a metric, percentage, dollar amount, or time figure exists and is relevant to the reader\'s decision.\n\n*Before (off-voice):* "Save time and money on expense management by automating the review process and reducing manual errors across your finance team."\n\n*After (on-voice):* "Teams using [Brand] cut expense review time by 70%. That\'s 3 hours back to your finance team every week."\n\n*Why the edit works:* The before version describes a category benefit in abstract terms any competitor could use. The after version leads with the specific outcome number, then translates it into a concrete weekly time figure the reader can picture. No aspirational language needed when the number does the work.\n\n*Application test:* If you can add a specific number to this sentence and it becomes more convincing, the number belongs in the sentence. If you cannot add a number, ask whether the claim is specific enough to include at all.\n\n*Channel application:*\n- Homepage: Lead the hero headline with the number ("70% faster expense review") — not the category description\n- Email: Open with the number relevant to the reader\'s context — do not warm up with a paragraph before revealing the point\n- Support: When explaining a feature limit or policy, state the specific constraint first ("The limit is $5,000 per transaction") — do not bury it in an explanation of why the limit exists\n- Social: One number per post, up front. "3 hours. That\'s what expense review takes when it\'s automated."\n\n*Failure pattern to watch:* Leading with "significant," "substantial," or "major" before a number — this is the off-voice hedge. If the number is real, it does not need an adjective to amplify it.',
      note:
        'Demonstrates a fully operational voice principle: named, behaviorally translated, with a concrete before/after showing the specific edit and why it works, an application test the writer can use in the moment, channel-specific guidance, and a failure pattern to watch for.',
    },
    {
      label: 'Sensitive context tone — complaint and error handling',
      input: 'What tone should this brand use when a customer\'s expense report is rejected or when a transaction fails?',
      output:
        '**Sensitive context: Rejection and failure states**\n\n*Tonal shift:* Move from direct/assertive to direct/explanatory. The brand remains factual and does not add apology theater ("We\'re so sorry for any inconvenience") — but it shifts from leading with outcomes to leading with clarity about what happened and what to do next.\n\n*Before (wrong — too brusque for a failure state):* "Expense rejected. Check your submission."\n\n*After (correct — direct but explanatory):* "This expense was rejected because it exceeded the $500 single-receipt limit. Split it across two submissions or ask your manager to increase your limit."\n\n*The rule:* In failure states, the three-part structure is: what happened (specific) → why it happened (one sentence, no jargon) → what to do next (one concrete action). The brand\'s directness stays; the assertiveness temporarily gives way to guidance.\n\n*Do not:* Apologize for the system working as designed. Do not use "unfortunately." Do not make the user feel blamed. Do not be vague about the fix.\n\n*Escalation trigger:* If the failure state involves a customer\'s money being held, delayed, or potentially lost — escalate to human review before sending any automated message. The brand\'s directness is not appropriate for financial distress contexts without a human in the loop.',
      note:
        'Sensitive context guidance must be as specific as the positive-tone guidance — naming the three-part failure-state structure and the escalation condition, not just saying "be more careful in sensitive situations."',
    },
  ],
});
