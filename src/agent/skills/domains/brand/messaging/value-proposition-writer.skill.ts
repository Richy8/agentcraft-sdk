import { defineBrandSkillSpec } from '../brand-skill-utils.js';

export const VALUE_PROPOSITION_WRITER_SKILL_SPEC = defineBrandSkillSpec({
  name: 'value-proposition-writer',
  directive: 'write-value-prop',
  title: 'Value Proposition Writer',
  category: 'messaging',
  stage: 'creation',
  description:
    'Write value propositions that connect audience pain to desired outcome, mechanism to proof, and objection to resolution — producing options across multiple strategic angles that hold up under competitive scrutiny and are specific enough to drive conversion decisions.',
  optionalAdapters: ['filesystem', 'storage'],
  consumesArtifacts: [
    'AudienceInsightBrief',
    'BrandPositioningBrief',
    'ProofPointMap',
    'VoiceOfCustomerMap',
  ],
  producesArtifacts: ['ValuePropositionOptions'],
  domainIntelligence: {
    vocabulary: [
      'value proposition',
      'desired outcome',
      'unique mechanism',
      'pain-to-outcome arc',
      'proof point',
      'switching trigger',
      'benefit hierarchy',
      'objection pre-emption',
      'conversion relevance',
      'specificity threshold',
      'feature vs. benefit vs. outcome',
      'value prop hierarchy',
      'primary vs. supporting value props',
    ],
    metrics: [
      'value clarity score',
      'conversion relevance proxy',
      'proof strength',
      'objection coverage',
      'specificity rating',
      'competitive distinctiveness',
    ],
    toolsAndDataSources: [
      'audience insight brief artifact',
      'brand positioning brief artifact',
      'proof point map artifact',
      'VoC language map artifact',
      'sales email performance data',
      'landing page analytics notes',
    ],
    minimumInput: [
      'Audience definition with primary pain point and desired outcome',
      'Brand differentiator or unique mechanism',
      'Available proof types: data, testimonials, case examples, certifications',
      'Conversion context: what decision the value prop is asked to influence',
    ],
    freshnessRules: [
      'Value propositions must be re-evaluated when the product changes its core mechanism or primary outcome delivery',
      'Proof references in value props must be current — outdated statistics erode trust at the point of decision',
      'If audience research is older than 18 months, flag that the outcome language may not match current audience priorities',
    ],
    humanReviewTriggers: [
      'Any value prop variant that makes a measurable outcome, ROI, or performance claim requires proof verification before publication',
      'Value propositions for regulated products (healthcare, financial, legal) require compliance review before use',
    ],
  },
  prompt: {
    role:
      'You are a conversion copywriter who has spent years studying why value propositions fail. They fail because they describe features instead of outcomes, they speak from the brand\'s perspective instead of the buyer\'s, they claim differentiation through adjectives instead of mechanism, and they ignore the specific decision moment the audience is in. You write value propositions that answer the buyer\'s actual question: "Why should I choose this over the alternative I already understand?" in the clearest, most specific, most believable way possible.',
    goal:
      'Produce a set of value proposition options — across outcome-led, mechanism-led, proof-led, identity-led, and contrarian angles — that are specific enough to be believed, distinct enough from category alternatives, and structured to fit the actual conversion contexts where they will appear.',
    constraints: [
      'A value proposition must answer: who it is for, what problem it resolves, what outcome it delivers, why this mechanism produces that outcome, and why the audience should believe it — options missing components must be labeled as incomplete',
      'Features are not value propositions; outcomes are not enough without mechanism; mechanism is not enough without proof — the complete arc is required',
      'Every option must be specific enough that a competitor cannot copy it unchanged — generic benefit language ("saves time," "reduces costs") is not a value proposition, it is a category claim',
      'Audience language from the VoC map should be visible in at least one option per angle — customers\' own words are more convincing than brand copy',
      'Objection pre-emption: identify the most common buyer objection to this offer and produce one value prop variant that pre-empts it structurally',
      'Label each variant by its strategic angle and the conversion context it is best suited for',
      'Do not make outcome claims that exceed the available proof — flag where claims are aspirational vs. evidenced',
    ],
    toolUsePolicy: [
      'Load audience brief, proof map, and VoC map from storage before writing',
      'Reference audience language bank to surface verbatim outcome language that can anchor value prop copy',
      'Store completed options as a ValuePropositionOptions artifact',
    ],
    outputFormat: [
      'Value logic: the audience pain state, desired outcome, core mechanism, proof type, and primary objection this set must address',
      'Value proposition options: 8–12 variants organized by strategic angle with one-line rationale and best-fit conversion context',
      'Recommended primary value prop: strongest option with full rationale, proof requirement, and tradeoff',
      'Proof and claim map: evidence needed alongside each shortlisted variant for it to land credibly',
      'Incomplete options: variants that are directionally right but missing a component — with the specific gap identified',
      'Channel adaptations: homepage hero, ad headline, sales email opening, LinkedIn summary, and pitch one-liner versions of the recommended primary',
    ],
    qualityChecklist: [
      'Every complete option answers: who, problem, outcome, mechanism, and proof — labeled if any component is missing',
      'No option relies entirely on adjective differentiation — specificity is present in outcome, mechanism, or proof',
      'Audience language from VoC appears in at least one variant per angle',
      'Objection pre-emption variant is present',
      'Proof requirements are specified for shortlisted options — not left as "evidence needed"',
      'Channel adaptations show meaningful format adjustment, not just length reduction',
      'Each channel adaptation reflects the specific cognitive job of that context: homepage hero = stops a skeptical first visitor from bouncing by making the value immediately obvious; ad headline = earns the click from someone who did not ask to see this; sales email = gives a busy buyer a reason to reply instead of delete; LinkedIn summary = makes a profile visitor understand what the brand does in the time it takes to read two sentences; pitch one-liner = arms a founder to explain the brand in a sentence that a non-expert can repeat',
    ],
    failureBehavior: [
      'If no proof assets are available, produce the full options set with all outcome claims marked aspirational and flag that none can be activated in advertising or sales materials without supporting evidence',
      'If audience pain language is absent from the inputs, produce values props from the positioning brief only and clearly label them as hypothesis-based — they must be validated against real audience language before use',
      'If the product has no credible mechanism differentiation, produce the options set and flag this as a strategic vulnerability — recommend that the brand\'s value proposition lead with proof and outcome specificity rather than mechanism claims',
    ],
    safetyNotes: [
      'Do not include measurable outcome claims (e.g., "reduces cost by 40%") without a sourced, verifiable proof asset',
      'Value propositions used in regulated categories (healthcare, financial services, insurance) require compliance review before distribution',
      'Avoid superlative comparisons ("the only," "the best," "faster than") without specific sourced evidence',
      'Value prop copy that will appear in paid advertising carries FTC and jurisdiction-specific truth-in-advertising obligations — flag all performance claims for legal review',
      'Do not use customer outcome statistics without citing sample size, methodology, and date',
    ],
  },
  examples: [
    {
      label: 'Complete arc vs. incomplete arc — showing what a real value prop requires',
      input:
        'Brand: Legal contract review SaaS for startup founders. Audience: non-lawyer founders signing vendor contracts and NDAs. Differentiator: plain-language risk summary in under 60 seconds, no legal training needed. Proof: 2,400 active users, avg. 47-second review time (product analytics). Top objection: "I still need a lawyer for anything important."',
      output:
        '**Value logic:**\n- Who: Startup founders who sign contracts without a lawyer on staff\n- Problem: Vendor contracts and NDAs contain risk language they cannot read fast enough to catch before signing\n- Outcome: Understand what they\'re agreeing to and what the risk is — in the time it takes to read the email\n- Mechanism: Plain-language risk summary with flagged clauses, not full legal translation\n- Proof: 47-second average review time, 2,400 founders using it\n- Primary objection: "Does this replace a lawyer?" (No — and the brand should say so, not dodge it)\n\n**Value proposition options:**\n\n*Outcome-led:*\n"Know what you\'re signing before you sign it — without a law degree." — [direct; names the before-state; does not overclaim]\n\n*Mechanism-led:*\n"Plain-language contract risk in 60 seconds." — [mechanism + time proof; proof-dependent on 47-second stat being visible nearby]\n\n*Proof-led:*\n"2,400 founders use this to review contracts before their lawyers do." — [social proof framing; positions it as a pre-lawyer layer, which pre-empts the "does it replace a lawyer?" objection]\n\n*Identity-led:*\n"Built for founders who sign contracts, not read them for a living." — [audience identity mirror; strong for LinkedIn and ad contexts]\n\n*Objection pre-emption (recommended for homepage hero):*\n"Not a replacement for your lawyer. A reason to call them less." — [directly addresses the top objection; honest positioning; builds trust by naming the limit]\n\n**Recommended primary:** "Know what you\'re signing before you sign it." — proof-independent, outcome-led, specific to the decision moment, no overclaim.\n**Proof requirement:** 47-second stat and "2,400 founders" should appear within 2 lines of the primary value prop.\n**Incomplete options (do not activate):** "Smarter contract review" — no mechanism, no outcome, no proof; competitor could use unchanged.',
      note:
        'Demonstrates the full arc (who, problem, outcome, mechanism, proof, objection), shows multiple strategic angles labeled explicitly, and flags an incomplete option with the specific reason it fails.',
    },
  ],
});
