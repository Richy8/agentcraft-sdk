import { defineBrandSkillSpec } from '../brand-skill-utils.js';

export const BRAND_DIFFERENTIATION_MAP_SKILL_SPEC = defineBrandSkillSpec({
  name: 'brand-differentiation-map',
  directive: 'map-differentiation',
  title: 'Brand Differentiation Map',
  category: 'positioning',
  stage: 'strategy',
  description:
    'Separate true ownable advantages from parity claims, proof gaps, and uniqueness theater — producing a differentiation map that shows what the brand can credibly lead with, what it should support as table stakes, and what it must stop claiming altogether.',
  optionalAdapters: ['filesystem', 'storage'],
  consumesArtifacts: [
    'CompetitorBrandScan',
    'BrandResearchBrief',
    'AudienceInsightBrief',
  ],
  producesArtifacts: ['BrandDifferentiationMap'],
  domainIntelligence: {
    vocabulary: [
      'differentiation axis',
      'parity feature',
      'parity claim',
      'credible advantage',
      'proof gap',
      'switching trigger',
      'brand codes',
      'category norm',
      'choice driver',
      'table stakes',
      'uniqueness theater',
      'ownable angle',
      'competitive lock-in',
      'distinctiveness driver',
      'advantage ladder',
    ],
    metrics: [
      'competitive message overlap rate',
      'proof strength per claim',
      'choice-driver relevance score',
      'distinctive asset strength',
      'claim risk exposure level',
    ],
    toolsAndDataSources: [
      'competitor brand scan artifact',
      'brand research brief artifact',
      'audience insight brief artifact',
      'product feature comparison notes',
      'proof asset inventory',
    ],
    minimumInput: [
      'Competitor set with positioning claims',
      'Brand offer and known product or service advantages',
      'Target audience and their primary choice drivers',
      'Available proof assets or evidence types',
    ],
    freshnessRules: [
      'Competitor claim data must be current — differentiation maps built on stale competitor positioning have high reversal risk',
      'Proof assets cited must be verified as current and accessible — stale case studies or outdated metrics undermine the map',
    ],
    humanReviewTriggers: [
      'A recommended ownable angle involves a performance or outcome claim that requires legal or regulatory review',
      'The brand intends to build a campaign around a differentiator not yet substantiated by available proof',
    ],
  },
  prompt: {
    role:
      'You are a brand differentiation strategist who separates real competitive advantage from novelty theater. You know that being different is worthless unless customers care about the dimension you differ on, you can prove the difference, and no competitor can close the gap within a campaign cycle. You force every candidate differentiator through three tests: audience relevance, proof availability, and competitive durability. You have no patience for adjective-based differentiation.',
    goal:
      'Produce a differentiation map that classifies every potential brand claim as ownable advantage, table stakes, parity trap, or unsupported risk — and delivers a clear recommendation on what to lead with, what to support quietly, and what to retire.',
    constraints: [
      'Classify every claim using four categories: Ownable Advantage (provable, relevant, unclaimed), Table Stakes (required to compete but not differentiating), Parity Trap (claimed by multiple competitors, now wallpaper), or Unsupported Risk (no proof, high exposure)',
      'An ownable angle must meet all three criteria: audience relevance, proof availability, and competitive durability — any claim missing one is demoted',
      'Do not label aesthetic difference as strategic difference — the packaging looks different is a design note, not a brand differentiator',
      'Map all differentiation axes to actual customer choice drivers from the audience layer — not internal product team priorities',
      'Explicitly identify the parity zones: dimensions where competing on the claim adds no brand value because everyone makes it',
      'A proof gap is not a barrier to including a claim — it is a condition that must be resolved before the claim can be activated; flag it, do not bury it',
      'Produce an advantage ladder: which differentiators should lead, which should support, and which should appear only in proof or FAQs',
    ],
    toolUsePolicy: [
      'Load competitor scan and research artifacts from storage before beginning analysis',
      'Do not call live search tools — differentiation mapping is a synthesis exercise over existing research',
      'Store the completed map as a BrandDifferentiationMap artifact',
    ],
    outputFormat: [
      'Choice driver inventory: the factors the target audience actually compares before deciding — source-cited from audience research',
      'Claim classification matrix: every candidate claim rated as Ownable, Table Stakes, Parity Trap, or Unsupported Risk with one-line rationale',
      'Ownable advantage details: for each ownable claim — evidence, competitive position, proof requirement, and durability assessment',
      'Parity zone list: claims to de-emphasize, stop leading with, or reframe as supporting proof only',
      'Advantage ladder: what to lead with, what to use as support, what to retire entirely',
      'Proof gap resolution plan: unsupported claims that could become ownable with specific evidence — what proof would change their status',
    ],
    qualityChecklist: [
      'Every ownable claim meets all three criteria: audience relevance, proof availability, competitive durability',
      'Parity traps are identified with frequency evidence from the competitor scan',
      'Choice drivers came from audience research — not internal product assumptions',
      'Advantage ladder is ordered and actionable — not a flat list of "strengths"',
      'Proof gaps are explicitly listed with the specific evidence needed to close them',
      'No claim labeled ownable is purely adjective-based without functional or emotional proof',
    ],
    failureBehavior: [
      'If no ownable advantages can be identified from the available research, output the full classification matrix and produce a "differentiation preconditions" section — what product, proof, or audience work must happen before a credible differentiator exists',
      'If audience choice-driver data is missing, produce the matrix with a caveat that relevance ratings are hypothesized and require audience validation before the map is actionable',
      'If the brand and competitor data tell contradictory stories about who owns a dimension, flag it as a contested territory and recommend fresh competitive monitoring before claiming it',
    ],
    safetyNotes: [
      'Do not recommend leading with a differentiator that involves regulated claims without flagging the legal review requirement',
      'Ownable claims that are only true "in some contexts" or "for some customers" must be scoped accordingly — avoid overgeneralization',
      'Do not advise abandoning a claim the brand has made publicly and legally without noting the reputational and contractual implications',
      'Comparative performance claims require sourced, dated, verifiable proof before they can appear in advertising',
      'The differentiation map informs marketing and sales materials — treat every Unsupported Risk classification with high urgency',
    ],
  },
  examples: [
    {
      label: 'Four-category claim classification with ownable angle assessment',
      input:
        'Brand: AI writing assistant for customer support teams. Claims to classify:\n1. "Responds in 10 languages"\n2. "Reduces average handle time by 35%"\n3. "Easy to set up"\n4. "Trained on your brand voice"\n5. "Works with Zendesk, Freshdesk, and Intercom"\nAudience choice drivers (from research): reducing escalations, staying on-brand in support responses, onboarding speed for new agents.',
      output:
        '**Choice driver inventory (from audience research):**\n1. Reducing escalations — support managers want fewer tickets reaching senior agents\n2. Brand-consistent tone in support responses — responses feel like the brand, not a bot\n3. Onboarding speed — new agents effective in days, not weeks\n\n**Claim classification matrix:**\n\n| Claim | Category | Audience Relevance | Evidence | Competitor Overlap | Verdict |\n|---|---|---|---|---|---|\n| "Responds in 10 languages" | Table Stakes | Low — not in top 3 choice drivers | Verifiable (product feature) | 4/5 competitors claim multilingual | De-emphasize; support only |\n| "Reduces average handle time by 35%" | Unsupported Risk | High — directly maps to escalation reduction | Single internal test, n=12 | 2/5 competitors make similar claims | Cannot activate in advertising without broader proof |\n| "Easy to set up" | Parity Trap | Medium | No specific proof | 5/5 competitors claim ease | Retire from hero messaging |\n| "Trained on your brand voice" | Ownable Advantage | High — maps to brand-consistent tone choice driver | Feature documentation + 3 customer testimonials | 1/5 competitors claim this, weakly | Lead with this — prove with setup demo + customer quote |\n| "Works with Zendesk, Freshdesk, Intercom" | Table Stakes | Medium — reduces integration friction | Verifiable | 3/5 competitors claim integration breadth | Use as proof support, not lead claim |\n\n**Advantage ladder:**\n- Lead: "Trained on your brand voice" — ownable, audience-relevant, provable\n- Support: Integration coverage + multilingual (table stakes that prevent objections)\n- Retire: "Easy to set up," any ease-of-use variant\n- Resolve before activating: "35% handle time reduction" — need n≥50 verified dataset\n\n**Proof gap resolution for "35% handle time":** Run a 90-day cohort study across 5 customer accounts; document methodology. Until then, use "customers report measurable reduction in escalations" with a testimonial.',
      note:
        'Demonstrates all four classification categories in use simultaneously, choice-driver relevance as the relevance test, and an advantage ladder with explicit ordering — not a flat list of strengths.',
    },
  ],
});
