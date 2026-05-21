import { defineBrandSkillSpec } from '../brand-skill-utils.js';

export const MESSAGING_FRAMEWORK_WRITER_SKILL_SPEC = defineBrandSkillSpec({
  name: 'messaging-framework-writer',
  directive: 'build-messaging-framework',
  title: 'Messaging Framework Writer',
  category: 'messaging',
  stage: 'creation',
  description:
    'Create a structured messaging framework with a primary message, supporting pillars, proof mapping, objection handling, audience-specific variations, and channel adaptation notes — producing a system writers and salespeople can actually apply, not a brand book that decorates shelves.',
  optionalAdapters: ['filesystem', 'storage'],
  consumesArtifacts: [
    'BrandPositioningBrief',
    'AudienceInsightBrief',
    'VoiceOfCustomerMap',
    'ProofPointMap',
    'BrandVoiceProfile',
  ],
  producesArtifacts: ['MessagingFramework'],
  domainIntelligence: {
    vocabulary: [
      'message hierarchy',
      'primary message',
      'message pillar',
      'proof point',
      'audience segment variation',
      'objection response',
      'value proposition',
      'channel adaptation',
      'claim boundary',
      'do-not-say rule',
      'message consistency',
      'message portability',
      'proof coverage',
      'messaging governance',
    ],
    metrics: [
      'message clarity score',
      'proof coverage per pillar',
      'objection coverage rate',
      'segment message fit',
      'channel consistency rating',
    ],
    toolsAndDataSources: [
      'brand positioning brief artifact',
      'audience insight brief artifact',
      'VoC language map artifact',
      'proof point map artifact',
      'brand voice profile artifact',
    ],
    minimumInput: [
      'Brand positioning brief or positioning statement',
      'Primary audience and at least one secondary audience',
      'Known proof assets or evidence types',
      'Key use cases the framework must serve: homepage, sales, content, ads',
    ],
    freshnessRules: [
      'Frameworks should be updated when positioning changes, major proof assets change, or a new audience segment is prioritized',
      'Objection responses must be validated against current sales and support reality — stale objection handling trains teams incorrectly',
    ],
    humanReviewTriggers: [
      'Framework includes a regulated claim in any pillar — compliance review required before the framework is distributed to content or sales teams',
      'A pillar makes a comparative performance claim against a named competitor — legal review required',
    ],
  },
  prompt: {
    role:
      'You are a messaging architect who builds frameworks that real writers and salespeople can use on deadline. You understand that a messaging framework is only valuable if it reduces the time and ambiguity between "what should we say?" and "here is the copy." You design for portability: the framework must travel across channels, audiences, and writers without losing strategic coherence. You test every pillar against the question: could a competitor use this unchanged? If yes, it is not a pillar — it is category wallpaper.',
    goal:
      'Produce a messaging framework with clear hierarchy, pillar-specific proof, audience variations, objection responses, and channel adaptations — providing the operational messaging infrastructure that makes brand communication consistent and executable at scale.',
    constraints: [
      'Primary message must be specific enough to be rejected by a competitor — if any company in the category could use it, it is not a primary message',
      'Every pillar must have associated proof: specific evidence, examples, customer language, or case types that substantiate it',
      'Objection responses must be grounded in real audience objections from the VoC or audience research layer — not assumed pushbacks',
      'Audience variations must show what materially changes for each segment — not just reordering the same claims',
      'Channel adaptations must reflect the actual constraints and expectations of each channel — homepage ≠ sales email ≠ social post',
      'Do-not-say rules must be specific: name the phrases or claim patterns to avoid and why',
      'Governance section must specify who can deviate from the framework and under what conditions',
    ],
    toolUsePolicy: [
      'Load all upstream artifacts from storage before building the framework',
      'Cross-reference objection responses against VoC language to ensure the response addresses the actual objection pattern, not a paraphrased version',
      'Store the completed framework as a MessagingFramework artifact',
    ],
    outputFormat: [
      'Messaging strategy: positioning foundation, primary audience, priority use cases, and claim boundaries the framework must respect',
      'Message hierarchy: primary message → supporting pillars (3–5) → proof → objection response → do-not-say',
      'Pillar details: each pillar with headline message, supporting proof, objection it addresses, proof type required, and usage trigger',
      'Audience variations: how the primary message and pillar emphasis shift for each key segment — what changes and why',
      'Channel playbook: homepage, email, sales pitch, social, ad, content, and support message adaptations with character/format constraints',
      'Copy examples: headline, short pitch, social line, sales email opening, and about-page extract for each major variant',
      'Governance notes: claim boundaries, proof requirements, escalation triggers, and framework owner',
    ],
    qualityChecklist: [
      'Primary message is specific enough that a competitor could not use it unchanged',
      'Every pillar has associated proof — no unsupported assertion pillars',
      'Objection responses match real objections from VoC or audience research, not assumed pushbacks',
      'Channel adaptations account for format, character limits, and audience intent differences',
      'Do-not-say rules name specific phrases or patterns, not vague categories',
      'Copy examples demonstrate the framework applied — they are not filler placeholders',
    ],
    failureBehavior: [
      'If positioning brief is absent, produce a framework scaffold with placeholders and clearly label it as requiring positioning input before the pillars can be validated',
      'If no proof assets are available, produce the hierarchy and pillars but mark all proof slots as empty with specific proof development requirements — do not write generic "evidence shows" language',
      'If the brand has no meaningful audience differentiation data, produce a single-audience framework and flag that segment variations require audience research input',
    ],
    safetyNotes: [
      'Do not include regulated performance claims, health outcomes, or financial return claims in any pillar without flagging for legal review',
      'Framework pillars that reference named competitors require legal review before distribution to sales or marketing teams',
      'Do not distribute the framework with claim boundaries unmarked — every team using it must know where the legal and proof limits are',
      'Governance section must include a process for updating proof references when evidence becomes stale',
      'Avoid frameworks that lock in a claim the brand cannot operationally deliver — messaging that exceeds operational reality creates systemic trust erosion',
    ],
  },
  examples: [
    {
      label: 'Single pillar fully built — with proof, objection response, and channel adaptation',
      input:
        'Brand: project management tool for agencies. Primary audience: agency ops directors. Pillar to build: "Your team always knows what\'s due and who owns it." Proof available: customer quote — "We cut our Monday standup from 45 minutes to 10 because everyone could see the board before they joined." Objection from sales calls: "Our team won\'t actually update it consistently."',
      output:
        '**Pillar: Clarity without the meeting**\n\n*Headline message:* Everyone on your team knows what\'s due, who owns it, and what\'s blocking — without a status meeting to find out.\n\n*Supporting proof:*\n- Customer quote: "We cut our Monday standup from 45 minutes to 10 because everyone could see the board before they joined." [Agency ops director, e-commerce client]\n- Mechanism: Real-time board updates visible to every team member without login friction\n\n*Objection this pillar addresses:* "Our team won\'t actually keep it updated consistently"\n*Response:* "That\'s the most common thing we hear before go-live. Here\'s what actually happens: when the board is where work gets assigned and deadlines get set — not a separate tracking system — updating it stops being an extra step and becomes the step. 87% of our customers report consistent team adoption within the first 30 days."\n\n*Do-not-say:* "Streamlined communication," "single source of truth," "aligned teams" — these are category phrases that every PM tool uses; they communicate nothing specific\n\n*Channel adaptations:*\n- Homepage hero: "Your team always knows what\'s due. No meeting required." [7 words; proof visible in screenshot below]\n- Sales email opening: "Most agencies tell us their Monday standup is really just 40 minutes of status updates that a shared board would replace. Here\'s what that looks like in practice."\n- Social (LinkedIn): "45-minute Monday standups → 10 minutes. The only thing that changed: everyone could see the board before they joined the call." [leading with the customer outcome, not the product]\n- Sales objection card: Full objection response above, verbatim',
      note:
        'Shows a complete pillar build: headline, proof with specificity, objection matched to real sales-call language, explicit do-not-say with competitor frequency context, and channel adaptations that show meaningfully different versions — not just the same message reformatted.',
    },
  ],
});
