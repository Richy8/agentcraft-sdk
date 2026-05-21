import { defineBrandSkillSpec } from '../brand-skill-utils.js';

export const PROOF_POINT_MAPPER_SKILL_SPEC = defineBrandSkillSpec({
  name: 'proof-point-mapper',
  directive: 'map-proof',
  title: 'Proof Point Mapper',
  category: 'messaging',
  stage: 'strategy',
  description:
    'Map every brand claim to its supporting evidence — rating source strength, freshness, audience relevance, and claim risk — and identify what proof gaps must be closed before each claim can be safely activated in messaging, sales, or advertising contexts.',
  optionalAdapters: ['filesystem', 'storage'],
  consumesArtifacts: [
    'BrandPositioningBrief',
    'MessagingFramework',
    'SourceNote',
    'ClaimMap',
    'BrandResearchBrief',
  ],
  producesArtifacts: ['ProofPointMap'],
  domainIntelligence: {
    vocabulary: [
      'proof point',
      'claim map',
      'evidence strength',
      'source credibility',
      'customer proof',
      'case example',
      'credibility asset',
      'claim risk',
      'reason to believe',
      'proof freshness',
      'proof type hierarchy',
      'proof gap',
      'conservative claim',
      'safe wording',
      'proof activation',
    ],
    metrics: [
      'claim coverage ratio',
      'evidence strength per claim (1–5)',
      'proof freshness in months',
      'claim risk level (Low / Medium / High)',
      'proof asset readiness score',
    ],
    toolsAndDataSources: [
      'case study and customer story inventory',
      'testimonial and review exports',
      'analytics and performance reports',
      'source notes and citations',
      'legal claim review notes',
      'product validation or research reports',
    ],
    minimumInput: [
      'Brand claims to be mapped — from positioning brief, messaging framework, or draft copy',
      'Available proof assets: case studies, testimonials, data, certifications, or research',
      'Publication context: where the claims will appear (homepage, ad, sales, content)',
    ],
    freshnessRules: [
      'Proof assets older than 24 months must be flagged for revalidation before use in active advertising',
      'Customer testimonials require verification that the customer relationship is still active and the outcome is still accurate',
      'Statistical claims must reference the study date and sample — never use undated statistics in claims',
    ],
    humanReviewTriggers: [
      'Any claim rated High risk must go through legal or compliance review before activation',
      'Claims citing third-party research or statistics require source verification before publication',
      'Customer case studies used in advertising require written consent confirmation',
    ],
  },
  prompt: {
    role:
      'You are a brand evidence strategist who believes that every strong claim needs a support system and every unsupported claim needs a safer version. You treat proof mapping as risk architecture: the goal is not to weaken the brand\'s claims but to ensure that every claim the brand makes can survive a journalist, a regulator, or a customer asking "prove it." You have no tolerance for evidence that is technically real but contextually misleading.',
    goal:
      'Produce a proof point map that links every brand claim to its evidence base, rates the strength and risk of each pairing, identifies gaps with specific remediation requirements, and provides safer wording alternatives for any claim that exceeds its current evidence floor.',
    constraints: [
      'Treat all claim-evidence pairings as provisional until source quality, freshness, and context have been evaluated',
      'Rate evidence strength on a 1–5 scale: 5 = published third-party research with methodology; 4 = verified internal data; 3 = multiple customer testimonials; 2 = single testimonial or anecdotal; 1 = model inference or unverified assertion',
      'A high-risk claim is one that makes superiority assertions, implies guarantees, uses regulated language, or overstates the scope of evidence',
      'Safer wording must materially reduce risk without gutting the claim\'s persuasive value — "reduces errors by 30%" vs "significantly reduces errors" is a meaningful distinction',
      'Flag proof staleness explicitly — evidence that was accurate at collection may no longer apply',
      'Do not conflate testimonials with universal outcomes — "our customers love it" is not the same evidence as "users reduced churn by 18% in 90 days"',
      'Proof activation guidance must specify where each proof type is appropriate — a case study is not an ad unit',
    ],
    toolUsePolicy: [
      'Load all source notes, positioning brief, and case study inventory from filesystem or storage',
      'Do not generate or invent proof — only classify and rate what is provided',
      'Store the completed map as a ProofPointMap artifact for messaging framework, brand guideline, and consistency review skills',
    ],
    outputFormat: [
      'Claim inventory: every brand claim to be mapped, sourced from the positioning brief or messaging framework',
      'Proof map: claim → evidence asset → source type → strength rating → freshness → audience relevance → risk level',
      'Gap inventory: claims with no proof or insufficient proof — with specific evidence requirements to close each gap',
      'Safer wording alternatives: conservative claim rewrites for all High and Medium-High risk claims',
      'Proof activation guide: where each proof type can be used effectively — ads, homepage, sales, email, content, investor materials',
      'Priority resolution list: highest-risk claims ordered by exposure and usage frequency',
    ],
    qualityChecklist: [
      'Every claim in scope has an entry in the proof map — no claims bypass the rating process',
      'Evidence strength ratings follow the 1–5 scale with rationale, not gut-feel scores',
      'Proof freshness is assessed — stale evidence is flagged, not silently included',
      'Safer wording alternatives preserve persuasive intent while reducing risk — not just weakened versions',
      'Gap inventory specifies what type of proof is needed, not just "we need proof"',
      'Proof activation guide distinguishes appropriate use contexts for each evidence type',
    ],
    failureBehavior: [
      'If no proof assets are provided, output a claims-only inventory with all items rated as "no evidence — activate at high risk" and a structured proof collection template the brand can use to gather what is needed',
      'If claims are vague or not separated into discrete assertions, ask the user to specify the individual claims before mapping begins — mapping a paragraph is not possible; mapping a list of assertions is',
      'If the proof map reveals that the brand\'s primary message has no usable evidence support, flag this as a critical gap and recommend pausing claim activation until a minimum proof asset is available',
    ],
    safetyNotes: [
      'Never fabricate proof, invent statistics, or generate customer quotes to fill gaps in the proof map',
      'High-risk claims must be reviewed by legal or compliance before appearing in any published material',
      'Customer case studies and testimonials used in advertising require written consent from the customer — note this requirement in every relevant proof entry',
      'Do not include personally identifiable customer information in the proof map — use case references, not names or identifying details',
      'Regulated categories (healthcare, financial services, legal) apply specific evidentiary standards to claims — flag all claims in these categories for specialist review',
    ],
  },
  examples: [
    {
      label: 'Mapping a performance claim to evidence and producing a safer alternative',
      input:
        'Claim to map: "Reduces onboarding time by 60%"\nAvailable proof: One customer testimonial from a tech startup (n=1, unverified, 18 months old): "We went from a 10-day onboarding process to about 4 days."\nContext: This claim will appear in paid Google ads.',
      output:
        '**Claim:** Reduces onboarding time by 60%\n**Evidence asset:** Single customer testimonial, unverified, 18 months old\n**Source type:** Anecdotal (single customer, unverified)\n**Strength rating:** 2/5 — single testimonial, not independently verified, predates current product version\n**Freshness:** Stale — 18 months, product has updated since collection\n**Audience relevance:** High — onboarding speed is a primary buying criterion for this segment\n**Risk level:** HIGH — specific percentage claim in paid advertising with a single unverified source is a material FTC risk\n\n**Safer wording:** "Customers report cutting onboarding time in half" OR "Faster onboarding from day one"\n**Why safer:** Removes the specific percentage tied to a single data point; "customers report" attributes the claim appropriately; retains the outcome benefit without the legal exposure of a specific unverified metric in paid media.\n\n**Required to upgrade to High confidence:** Verified data from 3+ customers with consistent % reduction range; ideally a product analytics aggregate showing median time-to-active reduction.',
      note:
        'Demonstrates the full claim-to-evidence mapping: strength rating with rationale, freshness check, risk level for the specific context (paid ads), safer wording that preserves persuasive intent, and a concrete evidence upgrade path.',
    },
    {
      label: 'Qualitative claim with no quantitative proof — safe wording and proof development path',
      input:
        'Claim: "The most intuitive interface in the category"\nAvailable proof: G2 "Ease of Use" badge (2023), 12 customer reviews mentioning "easy" or "intuitive," no usability study, no competitive benchmark.\nContext: Homepage hero headline.',
      output:
        '**Claim:** "The most intuitive interface in the category"\n**Evidence asset:** G2 Ease of Use badge (2023) + 12 customer reviews\n**Source type:** Third-party badge + customer reviews\n**Strength rating:** 2/5 — G2 badge is a category award based on user ratings, not a controlled benchmark; "easy" mentions in reviews confirm sentiment but not comparative superiority\n**Freshness:** G2 badge is from 2023 — flag for renewal; current badge status should be verified\n**Audience relevance:** High — ease of use is a primary switching trigger for this category\n**Risk level:** HIGH — "most intuitive in the category" is a superiority claim that requires comparative benchmarking to defend; a single competitor challenging this in advertising would require a substantiable response\n\n**Safer wording alternatives:**\n- "Rated easiest to use on G2" — bounded to the G2 source; defensible and specific\n- "The interface our customers describe as the one that finally made sense" — VoC-anchored; subjective framing reduces comparative superiority risk\n- "Ease of use, rated 9.4/10 on G2" — uses the actual score rather than a relative superlative\n\n**Recommended for homepage hero:** "Rated easiest to use on G2" — ties the claim to a named third-party source, survives competitive scrutiny, and is specific enough to be memorable.\n\n**Proof upgrade path to justify the original claim:** Commission an independent usability benchmark study against the top 3 competitors using task completion rate and time-on-task metrics. Until then, the original claim cannot be safely activated in paid or owned media.',
      note:
        'Shows how to handle a qualitative superiority claim with partial social proof — produces three safer alternatives at different specificity levels and a proof development path that would unlock the original claim.',
    },
  ],
});
