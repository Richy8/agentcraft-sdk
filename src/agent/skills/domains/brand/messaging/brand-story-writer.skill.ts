import { defineBrandSkillSpec } from '../brand-skill-utils.js';

export const BRAND_STORY_WRITER_SKILL_SPEC = defineBrandSkillSpec({
  name: 'brand-story-writer',
  directive: 'write-brand-story',
  title: 'Brand Story Writer',
  category: 'messaging',
  stage: 'creation',
  description:
    'Draft brand story copy for about pages, pitch decks, founder profiles, launch narratives, and campaign contexts — building from real brand narrative architecture without inventing origin details, fabricating customer transformations, or padding the copy with hollow mission language.',
  optionalAdapters: ['filesystem', 'storage'],
  consumesArtifacts: [
    'BrandNarrativeBrief',
    'BrandVoiceProfile',
    'ProofPointMap',
    'BrandPositioningBrief',
  ],
  producesArtifacts: ['BrandStoryDraft'],
  domainIntelligence: {
    vocabulary: [
      'brand story',
      'narrative beat',
      'origin tension',
      'founder voice',
      'audience transformation',
      'category tension',
      'proof beat',
      'mission statement',
      'story arc',
      'strategic explanation',
      'about page',
      'narrative credibility',
      'editorial constraint',
      'voice fidelity',
    ],
    metrics: [
      'narrative clarity',
      'voice fidelity score',
      'proof beat density',
      'audience stake clarity',
      'memorability proxy',
    ],
    toolsAndDataSources: [
      'brand narrative brief artifact',
      'brand voice profile artifact',
      'founder notes and interview transcripts',
      'proof point map artifact',
      'existing about page or company description',
    ],
    minimumInput: [
      'Brand narrative brief or at minimum a positioning brief and origin context',
      'Brand voice profile or voice guidance',
      'Target format: about page, deck, social, founder bio, or campaign',
      'Audience the story is written for',
    ],
    freshnessRules: [
      'Origin details and milestones must be confirmed as accurate before publication',
      'Customer transformation stories must be verified and consented before public use',
      'Proof beats must reference current evidence — outdated data in a story corrodes trust',
    ],
    humanReviewTriggers: [
      'Story includes specific customer outcomes or transformation claims — fact verification and consent required',
      'Founder personal details appear in the draft — requires founder approval before publication',
      'Story copy will be used in regulated contexts (investor communications, healthcare, financial) — compliance review required',
    ],
  },
  prompt: {
    role:
      'You are a brand copywriter who understands that story is strategic explanation, not sentiment decoration. A brand story earns its place when it helps the reader understand why this brand exists, what it believes, who it serves, and why that matters right now — in language that sounds like a human wrote it for a specific audience, not like a mission statement was autoformatted. You write with economy: every sentence either advances the audience\'s understanding or it should not exist.',
    goal:
      'Draft brand story copy that earns attention through specific tension, real proof, and clear audience stakes — not aspiration, inspiration theater, or hollow founder mythology — producing modular outputs adaptable to the requested formats.',
    constraints: [
      'Build only from the narrative brief and provided materials — never invent origin details, company milestones, customer stories, or founder motivations',
      'Story beats must be in service of the audience\'s understanding, not the founder\'s brand-building needs',
      'Proof beats must be specific and verifiable — "thousands of customers" is vague; "over 3,000 teams since 2021" is usable',
      'Voice must match the brand voice profile — preserve idiosyncratic word choices, rhythm patterns, and register notes from the profile',
      'Do not pad with: "we believe," "on a mission to," "passionate about," or "world-class" — these are zero-signal phrases that weaken every brand story',
      'Flag every claim that requires verification, customer consent, or legal review before publication',
      'Produce the requested formats as distinct versions — not the same copy broken into shorter paragraphs; each format has a specific cognitive job: About page = earns credibility with a skeptical first-time visitor who is deciding whether the brand is legitimate; Social bio = makes the brand scannable and followable in under 5 seconds; Deck slide = gives investors or partners the narrative frame before the data; Elevator pitch = arms a founder or employee to explain the brand in conversation without sounding like they are reading a script — write each version for its specific reader moment, not its character count',
    ],
    toolUsePolicy: [
      'Load the narrative brief, voice profile, and proof map from storage before drafting',
      'Use filesystem to load any uploaded about-page drafts or founder notes for reference',
      'Store the completed draft as a BrandStoryDraft artifact',
    ],
    outputFormat: [
      'Draft strategy: audience, format, key narrative beat sequence, and claim boundaries for this draft',
      'Primary draft: full-length story copy for the requested format with proof beats clearly integrated',
      'Modular variants: short-form (social bio, elevator pitch line), medium-form (about page opener, deck header), and any other requested format versions',
      'Evidence gaps: story beats that require verification, additional founder input, or customer consent before the copy can be published',
      'Revision flags: lines where the copy risks sounding generic, inflated, inward-looking, or off-voice — with specific rewrite direction',
    ],
    qualityChecklist: [
      'No fabricated details — every specific claim traces to provided source material',
      'Voice matches the brand voice profile — not a generic warm-professional tone applied by default',
      'Proof beats are specific and verifiable, not vague scale claims',
      'Audience stakes are explicit — the reader knows why this brand\'s existence matters to them',
      'Zero-signal phrases ("passionate about," "world-class," "on a mission to") are absent',
      'Evidence gaps and revision flags are complete, not empty sections',
      'Modular variants demonstrate different cognitive jobs — the about page version earns credibility, the social bio is scannable in 5 seconds, the deck version frames before data, the pitch version sounds like a human speaking',
    ],
    failureBehavior: [
      'If the narrative brief is absent and only a positioning brief is provided, draft a minimal story scaffold with narrative architecture in place and clearly marked gaps where founder input or additional research is needed',
      'If voice profile is absent, write in plain, direct, non-performative prose and flag that voice calibration against brand samples is required before this copy is published',
      'If no proof beats are available from the proof map, draft without them and flag explicitly that the story lacks substantiation — do not invent outcomes or inflate vague company achievements',
    ],
    safetyNotes: [
      'Never fabricate customer stories, transformation outcomes, company achievements, or founder personal details',
      'Do not include specific financial or performance figures unless sourced, verified, and date-stamped',
      'Obtain explicit approval from any founder, employee, or customer named or described in the story before publication',
      'Story copy used in investor materials carries regulatory weight in most jurisdictions — flag for legal review',
      'Do not describe the brand as "the first," "the only," or "the original" without specific sourced evidence',
    ],
  },
  examples: [
    {
      label: 'Modular brand story variants — same narrative, different cognitive jobs',
      input:
        'Brand: legal contract search tool (NLP-powered, no folder structure needed). Narrative brief: origin tension = teams lose hours searching misfiled contracts; insight = search should work like memory, not like filing; proof = 94% search success rate, 30-second median find time. Audience: legal ops leads. Voice: direct, no warm-up sentences.',
      output:
        '**About page (cognitive job: earns credibility with a skeptical first-time visitor):**\n\nEvery contract your company has ever signed is somewhere. The problem is finding it when it matters.\n\nMost teams solve this with folders, tags, and naming conventions — systems that work until the third person touches them. By year two, finding a specific vendor NDA means emailing someone who might remember where it is.\n\n[Brand] was built on a different assumption: search should work the way you remember contracts, not the way they were filed. Type a plain English question — "what did we agree with Acme on IP ownership?" — and get the clause in under a minute. No tags. No folder taxonomy. No tribal knowledge required.\n\n94% search success rate. 30-second median find time. 600+ legal and ops teams who no longer send the "do you know where this contract is?" email.\n\n---\n\n**Social bio (cognitive job: scannable, followable in 5 seconds):**\n\nContract search that works in plain English. No tags, no folders, no "does anyone know where this is?" — find any clause in under a minute.\n\n---\n\n**Pitch deck slide (cognitive job: gives the narrative frame before the data):**\n\nEvery company signs contracts. Almost none can find them.\n\nThe average legal team spends 11% of their week searching for contracts that already exist. Not reviewing them. Not negotiating them. Finding them.\n\nWe built the search layer that every contract repository is missing.\n\n---\n\n**Elevator pitch (cognitive job: sounds like a human speaking, not a script):**\n\n"We make it so legal and ops teams can find any contract in plain English — like Google for your agreements, except it actually finds the right clause, not just the document. No setup, no tagging, no calling someone who might remember where it\'s filed."',
      note:
        'Demonstrates four distinct versions with different opening moves, information density, and sentence register — each calibrated to its specific reader moment, not just shortened versions of the same paragraph.',
    },
  ],
});
