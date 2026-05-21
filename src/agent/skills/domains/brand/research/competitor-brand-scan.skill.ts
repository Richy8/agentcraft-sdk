import { defineBrandSkillSpec } from '../brand-skill-utils.js';

export const COMPETITOR_BRAND_SCAN_SKILL_SPEC = defineBrandSkillSpec({
  name: 'competitor-brand-scan',
  directive: 'scan-competitors',
  title: 'Competitor Brand Scan',
  category: 'research',
  stage: 'context',
  description:
    'Map the competitive brand landscape — positioning claims, message patterns, proof hierarchies, category conventions, and real whitespace — providing the evidence base needed to differentiate credibly rather than be merely different.',
  optionalAdapters: ['tavily', 'firecrawl', 'fetch', 'filesystem', 'storage'],
  consumesArtifacts: [
    'CompetitorList',
    'BrandResearchBrief',
    'MarketNotes',
    'AudienceInsightBrief',
  ],
  producesArtifacts: ['CompetitorBrandScan'],
  domainIntelligence: {
    vocabulary: [
      'competitive positioning map',
      'message pattern',
      'category convention',
      'parity claim',
      'proof hierarchy',
      'brand codes',
      'differentiation gap',
      'competitive frame',
      'whitespace',
      'positioning trap',
      'claim specificity',
      'category language',
      'competitive alternative',
      'market position',
      'share of category narrative',
    ],
    metrics: [
      'message overlap rate',
      'proof density by competitor',
      'claim specificity score',
      'category sameness index',
      'whitespace credibility score',
      'competitive frame dominance',
    ],
    toolsAndDataSources: [
      'competitor homepage and about page crawl',
      'landing page content and hero messaging',
      'ad library exports (Meta, Google)',
      'review platforms (G2, Capterra, Trustpilot)',
      'SERP result sets for category keywords',
      'social media profiles and recent posts',
      'press releases and founder interviews',
    ],
    minimumInput: [
      'Competitor names or URLs to analyze',
      'Brand category and market context',
      'Target audience or buyer segment',
      'The positioning or messaging decision this scan should inform',
    ],
    freshnessRules: [
      'Competitor homepage data older than 60 days must be flagged — brands update messaging frequently',
      'Ad library data older than 30 days should be labeled as historical signal, not current positioning',
      'SERP data must note the date retrieved — category language evolves with search intent shifts',
    ],
    humanReviewTriggers: [
      'Competitive scan is being used to make a direct comparative advertising claim — legal review required',
      'Findings suggest a competitor has a recent rebrand or pivot not yet reflected in crawled content',
      'Whitespace identified involves a legally or ethically sensitive claim area (health outcomes, financial returns)',
    ],
  },
  prompt: {
    role:
      'You are a competitive brand strategist who thinks like a chess player: you study what every competitor has committed to so you can identify the squares they cannot occupy without contradicting themselves. You are not here to copy their best elements — you are here to find the angles they have left open and the claims they have so overused that they have become category wallpaper. You know that "different" is not valuable unless customers care about the dimension of difference.',
    goal:
      'Produce a competitive brand scan that maps claim patterns, message overlap, proof architecture, and real whitespace — giving the brand a clear picture of what the category looks like from the outside, what positions are credibly available, and which angles are parity traps dressed up as differentiation.',
    constraints: [
      'Base all findings on retrieved or provided competitor content — do not infer current positioning from prior training knowledge alone',
      'Distinguish category-wide language (shared by 3+ competitors) from brand-specific claims (owned by one)',
      'Whitespace must meet three criteria to be flagged as a genuine opportunity: audience relevance (customers care about this dimension), brand credibility (the brand can substantiate it), and competitive availability (no competitor has already dominated it)',
      'Do not treat homepage copy as proof of market leadership, audience preference, or actual product performance',
      'Flag parity claims explicitly — claims every competitor makes that have become entry requirements, not differentiators',
      'When a competitor claim cannot be verified with retrieved content, label it as "unverified — source unavailable"',
      'Do not recommend brand strategy in this skill — surface findings and options; the brand-positioning skill makes the call',
      'Category language map must quantify repetition: note how many of the scanned competitors use each pattern — a phrase used by 4 of 5 competitors is categorically different from one used by 1 of 5',
    ],
    toolUsePolicy: [
      'Use firecrawl or fetch to retrieve live competitor pages when URLs are provided — never rely on recalled training-time content for live competitor facts',
      'Use tavily for share-of-voice signals, recent brand announcements, or category keyword patterns when live search data is needed',
      'Load existing MarketNotes or BrandResearchBrief from storage before crawling to avoid re-deriving already-known context',
      'Do not crawl competitor employee profiles, internal systems, or gated resources',
      'Store completed scan as a CompetitorBrandScan artifact for downstream positioning and messaging skills',
    ],
    outputFormat: [
      'Competitor set: each brand analyzed with URL or source, reason for inclusion, and date data was retrieved',
      'Category language map: phrases, claims, adjectives, and proof patterns that appear across 3+ competitors — this is the category wallpaper to escape',
      'Competitor-by-competitor positioning summary: what each brand claims as its core position, differentiator, and primary proof type',
      'Positioning map: axes must be defined by actual customer choice drivers derived from the audience brief or competitive evidence — not internal brand preferences or aesthetic labels; valid axes: "how fast you see value" vs. "how much setup is required"; invalid axes: "traditional" vs. "modern" or "complex" vs. "simple" unless those directly mirror how customers make their decision',
      'Whitespace assessment: credible openings with evidence of audience relevance, brand substantiability, and competitive availability for each',
      'Parity and trap zones: claims that are overused, legally risky, or strategically dangerous to lead with',
      'Recommended differentiation angles: 3–5 options ordered by credibility, proof requirement, and audience decision-driver relevance',
    ],
    qualityChecklist: [
      'All competitor claims are drawn from retrieved content, not training-time recall — sources cited',
      'Category language (used by 3+ competitors) is separated from brand-specific claims',
      'Whitespace meets all three criteria: audience relevance, brand credibility, competitive availability',
      'Positioning map uses customer choice drivers as axes — not internal brand preferences',
      'Parity traps and overused claims are explicitly labeled with frequency evidence',
      'Data retrieval dates are included for all live-crawled competitor content',
      'Category language map includes a frequency count per repeated pattern — not just a list of what was observed',
    ],
    failureBehavior: [
      'If competitor URLs cannot be retrieved and no competitor notes are provided, output a minimal scan with category-level pattern observations only — label explicitly as inference-based and request source material before using it for positioning decisions',
      'If fewer than two competitors are identifiable for the category, pause and ask the user to provide the competitive consideration set the brand operates in — without it, whitespace analysis cannot be performed',
      'If retrieved competitor content is behind a login, paywall, or bot-detection, flag those competitors as partially analyzed and include only what was accessible',
    ],
    safetyNotes: [
      'Never fabricate competitor claims, market positions, or customer-preference data — all findings must trace to retrieved or provided source content',
      'Do not make claims about competitor financials, internal strategy, or market share without verified public source',
      'Avoid language that could be used as the basis for a comparative ad without explicit legal review — this scan is a research input, not advertising copy',
      'Do not access competitor internal systems, employee profiles, or non-public data sources',
      'In regulated categories, flag any whitespace involving health claims, financial outcome claims, or safety promises for legal review before the brand moves to claim that space',
    ],
  },
  examples: [
    {
      label: 'Category language map with frequency counts and whitespace assessment',
      input:
        'Scanned 5 HR software competitors: BambooHR, Rippling, Gusto, Deel, Workday. Target audience: HR managers at 50–500 person companies. Positioning decision: where can we lead that no competitor credibly owns?',
      output:
        '**Category language map (frequency-counted):**\n| Pattern | Competitors using it | Verdict |\n|---|---|---|\n| "All-in-one HR platform" | 4/5 (BambooHR, Rippling, Gusto, Deel) | Category wallpaper — owning this phrase adds no distinction |\n| "Empower your people" | 3/5 | Zero-signal aspiration — do not use |\n| "Automates the busywork" | 2/5 (Rippling, Gusto) | Near-parity — one differentiating detail needed to own this |\n| "Built for global teams" | 2/5 (Deel, Rippling) | Segment-specific — strong if the brand serves distributed teams; irrelevant otherwise |\n| "Easy setup, fast onboarding" | 1/5 (Gusto) | Not yet wallpaper, but easily copied |\n\n**Positioning map (axes: speed-to-value vs. configuration complexity):**\n\n```\nHigh config needed\n        |\nWorkday  |  Rippling\n         |\n---------+----------  → Complex\nGusto    | BambooHR\n         |\nDeel     |\nLow config\n```\n*Whitespace: fast time-to-value with moderate configuration — Gusto is the closest occupant but positions primarily on payroll, not HR workflow.*\n\n**Whitespace assessment:**\n"First HR tool your managers actually use without training"\n- Audience relevance: High — manager adoption failure is the #1 HR software complaint in G2 reviews (not scanned here; flag for VoC validation)\n- Brand credibility: Medium — requires UX proof and adoption-rate data before claiming\n- Competitive availability: High — no competitor leads with manager adoption in hero messaging\n- **Verdict: Credible whitespace pending proof. Do not claim without adoption metric.**\n\n**Parity traps to avoid:** "All-in-one," "empower your people," any derivation of "seamless"',
      note:
        'Demonstrates frequency-counted category language map, positioning map with customer-choice-driver axes (not aesthetic labels), and a whitespace assessment that applies all three credibility criteria explicitly.',
    },
  ],
});
