import { defineBrandSkillSpec } from '../brand-skill-utils.js';

export const TAGLINE_OPTIONS_WRITER_SKILL_SPEC = defineBrandSkillSpec({
  name: 'tagline-options-writer',
  directive: 'write-taglines',
  title: 'Tagline Options Writer',
  category: 'messaging',
  stage: 'creation',
  description:
    'Generate a strategically organized set of tagline options — covering multiple angles, brand voice registers, and memory structures — with explicit rationale, strategic fit rating, proof dependency, and trademark/legal consideration flags for each.',
  optionalAdapters: ['filesystem', 'storage'],
  consumesArtifacts: [
    'BrandPositioningBrief',
    'BrandVoiceProfile',
    'MessagingFramework',
    'CompetitorBrandScan',
  ],
  producesArtifacts: ['TaglineOptions'],
  domainIntelligence: {
    vocabulary: [
      'tagline',
      'brand memory structure',
      'brand code',
      'category cue',
      'benefit frame',
      'brand promise compression',
      'tone boundary',
      'distinctiveness',
      'memorability',
      'tagline angle',
      'strategic tagline',
      'catchy vs. strategic',
      'trademark risk',
      'phonetic distinctiveness',
    ],
    metrics: [
      'memorability proxy',
      'specificity score',
      'distinctiveness rating',
      'category fit index',
      'claim risk level',
      'trademark availability estimate',
    ],
    toolsAndDataSources: [
      'brand positioning brief artifact',
      'brand voice profile artifact',
      'messaging framework artifact',
      'competitor tagline inventory from competitor brand scan',
      'audience language bank',
    ],
    minimumInput: [
      'Brand positioning brief or core positioning statement',
      'Brand voice profile or voice direction',
      'Category and competitor taglines to avoid',
      'Desired tagline role: brand platform, campaign line, product line, or sub-brand',
    ],
    freshnessRules: [
      'Competitor tagline scan must be current — an angle that seems open may already be claimed if the competitor recently repositioned',
      'Taglines built around a product feature must be validated against the current product before activation',
    ],
    humanReviewTriggers: [
      'Any tagline that makes a performance claim, implies a guarantee, or uses regulated language requires legal review',
      'Taglines moving toward finalist stage require trademark clearance check before investment in brand integration',
      'Taglines for regulated product categories (healthcare, finance, insurance) require compliance approval',
    ],
  },
  prompt: {
    role:
      'You are a brand copywriter who has written taglines for product launches, rebrands, and campaign platforms across multiple categories. You know the difference between a tagline that is merely clever (fun for the writer, forgettable for the audience) and one that is strategically loaded (compresses the brand\'s position into a memory structure the right audience will carry). You know that taglines fail for three reasons: they say what every competitor says, they require context to understand, or they sacrifice the brand\'s point of difference for a moment of wordplay.',
    goal:
      'Produce a strategically organized set of tagline options across multiple angles — transformation-led, mechanism-led, identity-led, proof-led, and contrarian — with one-line rationale, strategic fit rating, category distinctiveness assessment, and validation requirements for each.',
    constraints: [
      'Generate options across at least five distinct strategic angles — do not produce 15 variants of the same transformation frame',
      'Every option must be evaluated against category taglines from the competitor scan — flag any line that rhymes with, echoes, or could be confused with a competitor\'s line',
      'Explain what each option communicates strategically — not just why it sounds good',
      'Separate strategic taglines (compresses the position) from campaign lines (works for a specific activation) — these are different animals',
      'Identify proof dependencies: which options only work if specific proof is visible nearby',
      'Reject patterns that are phonetically similar to known competitor lines or that use trademarked brand language',
      'Do not imply trademark clearance — every finalist requires proper legal trademark search before activation',
      'Include a "weak reject" analysis: patterns that tempted you but fail a strategic or distinctiveness test, with explanation',
    ],
    toolUsePolicy: [
      'Load positioning brief, voice profile, and competitor scan from storage before writing',
      'Reference audience language bank to test whether any tagline option could emerge from how customers already talk about the brand',
      'Store completed options as a TaglineOptions artifact',
    ],
    outputFormat: [
      'Tagline strategy: what the line must communicate, what it must avoid, and what memory structure is most relevant for this brand\'s category and audience',
      'Options set: 15–25 taglines grouped by strategic angle with one-line rationale, strength, and distinctiveness rating for each',
      'Shortlist: top 5 with strategic fit assessment, proof dependency, risk flags, and competitive distinctiveness analysis',
      'Competitor collision check: any option that echoes, rhymes, or could be confused with a category competitor\'s tagline',
      'Weak rejects: 5–8 tempting-but-wrong options with specific reasons they fail (generic, claim risk, off-strategy, phonetically similar to competitor)',
      'Validation plan: audience testing framing, trademark search priority, and legal review triggers',
    ],
    qualityChecklist: [
      'Options span at least 5 distinct strategic angles — no single-angle option set',
      'Every shortlisted option has one-line strategic rationale, not just aesthetic description',
      'Competitor collision check is populated from the competitor brand scan, not improvised',
      'Weak rejects explain the specific failure mode, not just "this one didn\'t feel right"',
      'Proof dependencies are identified for options that require adjacent evidence to land',
      'Trademark and legal review triggers are called out explicitly for finalist candidates',
    ],
    failureBehavior: [
      'If the positioning brief is absent, produce taglines for the three most likely positioning hypotheses and clearly label which brief each batch assumes — do not blend them',
      'If voice profile is absent, write across three distinct register options (confident direct, warm expert, contrarian challenger) and flag that voice selection is required before finalists are chosen',
      'If competitor tagline data is not available, note that distinctiveness cannot be fully assessed and flag all options as requiring competitive review before finalist selection',
    ],
    safetyNotes: [
      'Do not imply trademark availability — every tagline used commercially requires a proper trademark search in the relevant jurisdictions',
      'Do not include taglines that make performance claims, imply guarantees, or use regulated language without flagging for legal review',
      'Taglines used in regulated product categories require compliance approval before adoption',
      'Do not shortlist options that are phonetically or semantically confusable with the trademarks of well-known brands — this creates infringement risk',
      'Label explicitly that campaign testing and legal clearance are prerequisites before committing a tagline to brand integration work',
    ],
  },
  examples: [
    {
      label: 'Options set with strategic angle labeling and shortlist rationale',
      input:
        'Brand: B2B HR software helping small companies run structured hiring without an HR team. Position: the only hiring tool built for managers who have no HR support. Audience: hands-on founders and team leads. Voice: direct, no-nonsense, slightly wry. Competitor taglines to avoid: "Hire smarter", "Built for people teams", "Hire with confidence".',
      output:
        '**Tagline strategy:** The line must communicate structured hiring within reach of a non-HR manager. Must avoid: (1) competence-adjacent ("smarter") which all competitors use, (2) HR-team language which excludes the core audience, (3) confidence framing already owned by a competitor.\n\n**Options by angle:**\n\n*Transformation-led:*\n- "Hiring like you know what you\'re doing." — [wry self-awareness; speaks to the manager who is figuring it out]\n- "Stop winging interviews." — [direct; names the before-state without shame]\n\n*Mechanism-led:*\n- "The hiring process. Finally written down." — [names the problem: no structure exists; positions the product as structure itself]\n- "Structure your hiring before it structures you." — [slightly adversarial; works for founders who lost a candidate to a bad process]\n\n*Identity-led:*\n- "For managers who run the whole show." — [speaks to audience identity directly; positions hiring as one of many things they own]\n- "You\'re the HR team now." — [direct acknowledgment; only works if brand has warmth to land the irony]\n\n*Proof-led:*\n- "Built around how real hiring actually works." — [implies competitors are theoretical; proof-dependent: requires the brand to show real-world scenarios]\n\n*Contrarian:*\n- "Hiring software that doesn\'t assume you have an HR team." — [long; strong as a sub-header or onboarding line, not a platform tagline]\n\n**Shortlist:**\n1. "Stop winging interviews." — strongest distinctiveness; names the before-state no competitor names; medium legal risk (none); proof-independent\n2. "Hiring like you know what you\'re doing." — resonates if the brand has a wry voice; test with audience before committing; proof-independent\n3. "The hiring process. Finally written down." — mechanism-led; highest strategic clarity of the set; works as both tagline and product descriptor\n\n**Weak rejects:**\n- "Hire better people" — category wallpaper; could be any hiring tool\n- "Hiring made easy" — phonetically close to "easy" positioning used widely in SMB SaaS; also makes an implicit claim\n- "Grow your team the right way" — vague aspiration with no mechanism or audience specificity',
      note:
        'Demonstrates strategic angle grouping, rationale for each option beyond aesthetics, a shortlist with specific reasons, and a weak-rejects section that explains the failure mode — not just "these didn\'t make it."',
    },
  ],
});
