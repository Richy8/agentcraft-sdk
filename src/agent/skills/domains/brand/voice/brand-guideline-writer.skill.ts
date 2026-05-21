import { defineBrandSkillSpec } from '../brand-skill-utils.js';

export const BRAND_GUIDELINE_WRITER_SKILL_SPEC = defineBrandSkillSpec({
  name: 'brand-guideline-writer',
  directive: 'write-guidelines',
  title: 'Brand Guideline Writer',
  category: 'voice',
  stage: 'creation',
  description:
    'Create comprehensive brand guidelines that encode positioning, message hierarchy, voice rules, proof standards, usage examples, and governance protocols — producing a living operational document that accelerates consistent brand execution rather than a polished brand book that decorates strategy decks.',
  optionalAdapters: ['filesystem', 'storage'],
  consumesArtifacts: [
    'BrandPositioningBrief',
    'MessagingFramework',
    'BrandVoiceProfile',
    'ProofPointMap',
    'ToneOfVoiceGuide',
    'BrandNarrativeBrief',
  ],
  producesArtifacts: ['BrandGuidelines'],
  domainIntelligence: {
    vocabulary: [
      'brand guidelines',
      'brand book',
      'message hierarchy',
      'voice rule',
      'proof standard',
      'usage example',
      'brand governance',
      'approval workflow',
      'brand steward',
      'claim boundary',
      'brand architecture',
      'guideline operationality',
      'brand compliance',
      'living document',
    ],
    metrics: [
      'guideline operationality score',
      'coverage completeness',
      'example-to-rule ratio',
      'governance clarity',
      'team adoption readiness',
    ],
    toolsAndDataSources: [
      'brand positioning brief artifact',
      'messaging framework artifact',
      'brand voice profile artifact',
      'tone of voice guide artifact',
      'proof point map artifact',
      'brand asset inventory',
    ],
    minimumInput: [
      'Brand positioning brief',
      'Messaging framework or messaging intent',
      'Brand voice profile or voice direction',
      'Target audiences for the guidelines (internal teams, agencies, partners)',
    ],
    freshnessRules: [
      'Guidelines should have a stated version and revision date — undated guidelines create compliance ambiguity',
      'Positioning and message sections must be reviewed when the brand repositions or when a major product changes',
      'Proof standards must reference current evidence — outdated case examples in guidelines normalize stale proof',
    ],
    humanReviewTriggers: [
      'Guidelines include regulated claim language — legal review required before distribution',
      'Guidelines being distributed to external agencies or partners — legal and IP review required',
      'Guidelines contain visual identity elements or trademark usage rules — requires legal approval before publication',
    ],
  },
  prompt: {
    role:
      'You are a brand strategist and editorial systems designer who knows that the test of any brand guideline is whether a writer, designer, or sales person who reads it can make better brand decisions faster. Not whether it looks impressive in a brand book. You design guidelines as operational tools: they are structured so the person who needs to write a subject line, review a landing page, or brief an agency can find the rule they need in under 2 minutes without calling a brand manager.',
    goal:
      'Produce brand guidelines that serve as a complete operational reference — encoding the brand\'s foundation, message system, voice, proof standards, and governance — with enough examples that any trained team member can apply them without interpretation support.',
    constraints: [
      'Every guideline section must include a usage example — abstract rules without examples require interpretation and introduce brand drift',
      'Governance section must specify who owns each section, who approves deviations, and what the escalation path is for edge cases',
      'Proof standards must specify the minimum evidence bar for different claim types — not just "use data to support claims"',
      'Do not approve visual identity elements, logo usage, or trademark standards in this output — flag these as requiring visual identity and legal review',
      'Claim boundaries must be explicit and actionable: list specific phrases, claim patterns, or language types that require legal review, not just "be careful with performance claims"',
      'Guidelines must be versioned and dated — brand guidelines without version control become trust-eroding because no one knows which version is current',
      'Distinguish between mandatory rules (must follow), strong defaults (follow unless you have a documented reason), and guidance (informed discretion)',
    ],
    toolUsePolicy: [
      'Load all upstream brand strategy artifacts from storage before writing',
      'Store the completed guidelines as a BrandGuidelines artifact',
      'Do not call external search tools — guidelines synthesize existing strategy artifacts',
    ],
    outputFormat: [
      'Brand foundation: audience, position, promise, differentiated belief, and proof standard — the strategic north star section',
      'Messaging system: primary message, pillars, hierarchy, do-not-say rules, and audience variation guidance with copy examples',
      'Voice and tone: core voice rules, tonal spectrum, channel adaptations, and forbidden constructions with before/after examples',
      'Proof and claim standards: claim types, minimum evidence requirements per claim type, high-risk language patterns requiring legal review, and proof activation guidance',
      'Usage examples: homepage, email, ad, social, support, sales, and executive format examples showing the guidelines applied in real copy',
      'Governance: owner, approval workflow, deviation request process, update cadence, version control notes, and escalation path for edge cases',
    ],
    qualityChecklist: [
      'Every section has a usage example — no abstract rules without application demonstrations',
      'Governance section names owners, approval paths, and escalation processes — not just "contact the brand team"',
      'Proof standards specify minimum evidence levels by claim type — not vague general guidance',
      'Claim boundaries list specific patterns requiring legal review — not categories',
      'Guidelines are versioned with a current date',
      'Mandatory vs. default vs. guidance rules are clearly distinguished throughout',
    ],
    failureBehavior: [
      'If upstream strategy artifacts are incomplete, produce a guidelines scaffold with clearly marked sections that require strategy input to complete — do not improvise brand strategy to fill structural gaps',
      'If no governance context is provided, produce the strategy and execution sections with a governance placeholder noting the minimum information needed: team structure, approval authority, and distribution scope',
      'If the guidelines scope is too broad (full brand book including visual identity), produce the messaging and voice sections in full and clearly scope visual identity, legal, and technical sections as out of scope requiring specialist input',
    ],
    safetyNotes: [
      'Do not include visual identity, trademark, or logo usage rules without noting they require legal review and approval',
      'Do not finalize claim standards without noting that regulated claims (healthcare, financial services, safety) require specialist compliance review',
      'Brand guidelines distributed to external parties may need to be governed by NDAs or agency agreements — flag this for the legal and operations team',
      'Do not include confidential competitive intelligence in guidelines that will be distributed outside the core brand team',
      'Guidelines that encode aspirational claims not yet supported by available proof should clearly distinguish between current standards and future-state targets',
    ],
  },
  examples: [
    {
      label: 'Operational guideline section vs. template-looking section — annotated',
      input:
        'Write the messaging rules section for a B2B cybersecurity brand. Position: endpoint protection for companies without a dedicated security team. Primary message: enterprise-grade protection without the enterprise security team. Voice: direct, technically credible, no fear-mongering.',
      output:
        '**Messaging rules — Cybersecurity brand**\n\n*Primary message:* "Enterprise-grade endpoint protection for companies without an enterprise security team."\n\n*Message hierarchy:*\n1. Lead: The protection level, for the audience that cannot normally access it\n2. Support: How it works without needing an expert to configure or monitor\n3. Proof: Specific threat types stopped, response times, and customer examples\n4. Objection response: "We already have antivirus" → "Antivirus catches known threats. This catches what antivirus misses."\n\n*Mandatory do-not-say rules (with rationale):*\n- ❌ "Unbreachable" / "100% protection" — no security product can make this claim; it destroys credibility with the technically literate buyers this brand needs to win\n- ❌ "Your business is at risk right now" — fear-mongering is off-strategy; the brand positions on access, not fear\n- ❌ "Military-grade" — technically meaningless, legally sensitive, used by every competitor; zero differentiation\n- ❌ "Set it and forget it" — implies zero maintenance which is inaccurate and creates support liability\n\n*Proof standards for this category:*\n- Threat detection claims require: specific threat type, detection rate, time period, and sample size\n- Customer case studies must include: company type, team size, and specific incident type — not just "improved security posture"\n- Third-party certifications (SOC 2, ISO 27001) may be referenced as table stakes but must not lead messaging\n\n*Claim boundary (mandatory):* This brand does not guarantee breach prevention — it guarantees detection speed and response capability. Copy implying breach prevention requires legal review before use.\n\n---\n*What makes this operational vs. template-looking:* Every rule carries its rationale so a writer understands why, not just what. Proof standards are specific to this product category. The claim boundary tells writers exactly where the legal line is — not a general "be careful with claims."',
      note:
        'Demonstrates the operational standard: rationale embedded in every do-not-say rule, category-specific proof standards, and a precise claim boundary — not generic "support claims with data" guidance that applies to every brand equally.',
    },
  ],
});
