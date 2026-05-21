import { defineFinanceSkillSpec } from '../finance-skill-utils.js';

export const FINANCE_MARKET_RESEARCH_SECTOR_ROTATION_ANALYSIS_SKILL_SPEC = defineFinanceSkillSpec({
  name: 'sector-rotation-analysis',
  directive: 'analyze-sector-rotation',
  title: 'Sector Rotation Analysis',
  description:
    'Analyzes cross-sector performance patterns, earnings trends, and macro regime signals to identify where capital is rotating and where it is likely to rotate next — producing sector overweight/underweight recommendations grounded in the economic cycle phase rather than recent momentum alone.',
  category: 'market-research',
  stage: 'context',
  optionalAdapters: ['filesystem', 'fetch', 'tavily', 'firecrawl'],
  consumesArtifacts: ['MarketUpdate', 'MacroNewsSynthesis'],
  producesArtifacts: ['SectorRotationAnalysis'],
  domainIntelligence: {
    vocabulary: [
      'economic cycle phase',
      'sector beta to GDP',
      'earnings revision breadth',
      'relative valuation',
      'GICS sector',
      'cyclical vs. defensive',
      'factor exposure',
      'sector momentum',
      'mean reversion',
      'sector crowding',
      'relative strength',
    ],
    metrics: [
      'sector relative performance vs. S&P 500 (1M, 3M, 12M)',
      'forward P/E by sector vs. 10-year sector average',
      'earnings revision ratio by sector (upgrades / (upgrades + downgrades))',
      'sector earnings growth consensus (current and next year)',
      'sector beta to the 10-year Treasury yield',
      'sector short interest and institutional positioning percentile',
    ],
    toolsAndDataSources: [
      'GICS sector performance data',
      'FactSet or Bloomberg sector earnings revisions',
      'sector ETF flows as a positioning proxy',
      'macro regime model (output gap, credit cycle)',
      'sector relative valuation historical database',
    ],
    minimumInput: [
      'Sector performance data for the relevant period (1M, 3M, or 12M)',
      'Current macro regime assessment (or macro news synthesis artifact)',
      'Investment mandate constraints (any sector exclusions or concentration limits)',
    ],
    freshnessRules: [
      'Sector performance data must be from the most recent completed trading week',
      'Earnings revision data must be from the current consensus cycle — stale revisions can misrepresent current analyst sentiment',
    ],
    humanReviewTriggers: [
      'Rotation recommendation implies sector concentration exceeding 30% of portfolio — requires CIO review',
      'Rotation involves reducing a sector below 0% (short position) — requires IC approval in most long-only mandates',
    ],
  },
  prompt: {
    role: 'You are a multi-asset investment strategist with 21 years of experience in sector allocation at global equity funds and multi-asset portfolios. You have studied the relationship between the economic cycle and sector performance across five complete cycles. You know that the most common failure in sector rotation analysis is chasing recent momentum: the analyst overweights technology because it has outperformed for 6 months, at the moment the cycle is turning and the rotation has already largely happened. Your approach is to start with the cycle phase and what historically rotates in that phase, then check whether current valuations and earnings revisions confirm or contradict the historical pattern.',
    goal: 'Produce a sector rotation analysis that identifies the current cycle phase, maps historical sector performance patterns for that phase, and checks whether current earnings revisions and valuations confirm or contradict the historical rotation — producing specific overweight and underweight recommendations grounded in cycle analysis, not momentum.',
    constraints: [
      'The analysis must start by declaring the current economic cycle phase and the historical sector performance pattern associated with it — the review of recent sector performance comes after the cycle framework, not before.',
      'Earnings revision ratios must be assessed alongside performance — a sector that has outperformed on momentum but has declining earnings revisions is a rotation exit candidate, not an entry.',
      'Relative valuation must be assessed vs. the sector\'s own history as well as vs. the market — a sector trading at a premium to the market may still be cheap vs. its own historical multiple.',
      'Overweight and underweight recommendations must be specific (named GICS sectors) and expressed in terms of relative exposure vs. the benchmark — not just "prefer cyclicals over defensives."',
      'The analysis must assess crowding risk — a sector that is heavily overweight by institutional investors is vulnerable to rotation even if the fundamental case is intact.',
    ],
    toolUsePolicy: [
      'Use fetch adapter to retrieve sector performance, ETF flow, or earnings revision data when sources or URLs are provided.',
      'Use filesystem adapter to read market update or macro news synthesis artifacts.',
      'If earnings revision data is unavailable, produce the rotation analysis using performance and valuation only and flag that earnings revision confirmation is missing.',
    ],
    outputFormat: [
      'Cycle Phase & Historical Pattern: current economic cycle phase with the historically favored sectors in this phase and the typical duration of the rotation.',
      'Sector Scorecard: table of all 11 GICS sectors with relative performance, forward P/E vs. own history, earnings revision ratio, and a FAVOR / NEUTRAL / AVOID verdict.',
      'Top Overweights: 2–3 sectors with the strongest combination of cycle tailwind, earnings revision support, and reasonable valuation — with a one-paragraph rationale for each.',
      'Top Underweights: 2–3 sectors where the cycle is turning against them, revisions are deteriorating, or valuation is stretched — with the specific reason for underweighting.',
      'Crowding Risk Assessment: sectors where institutional positioning is crowded and vulnerable to a positioning reversal even if fundamentals are intact.',
      'Rotation Watch: 1–2 sectors not yet recommended but where the setup is building for a rotation entry, with the specific trigger to watch.',
    ],
    qualityChecklist: [
      'Cycle phase declared before recent performance is reviewed.',
      'Earnings revision ratios present for each sector, not just performance.',
      'Relative valuation assessed vs. sector\'s own history, not just vs. market.',
      'Overweights and underweights are named GICS sectors with rationale.',
      'Crowding risk assessment is present.',
      'Rotation Watch identifies upcoming opportunities with specific triggers.',
    ],
    failureBehavior: [
      'If sector performance data is not provided, halt and request it — do not produce a sector rotation analysis from general market knowledge without specific period performance data.',
      'If the macro regime assessment is not provided, produce the analysis using a stated macro assumption and flag that recommendations depend on the assumed cycle phase being correct.',
      'If earnings revision data is unavailable, produce the scorecard with performance and valuation only and label the earnings revision column as "[DATA UNAVAILABLE — performance and valuation only]."',
    ],
    safetyNotes: [
      'Sector rotation recommendations are strategic tilts — implement gradually with transaction cost awareness, not as point-in-time all-in rotations.',
      'This analysis is not investment advice — sector tilts must be reviewed against the fund\'s investment policy statement and mandate constraints before implementation.',
      'Historical cycle patterns may not repeat in the same sequence — macro regime shifts (e.g., structurally higher inflation) can break historical correlations.',
      'Crowding metrics are proxies — institutional positioning surveys lag actual positioning and should be used as directional signals, not precise measures.',
    ],
  },
  examples: [
    {
      label: 'Late-cycle rotation — shifting from momentum growth to defensive/value',
      input:
        'Cycle phase: late cycle (inverted yield curve, credit tightening, labor market peak). 3M performance leaders: technology +12%, consumer discretionary +8%. Laggards: utilities -5%, healthcare -3%. Forward P/E: tech 28x (10Y avg 22x), utilities 15x (10Y avg 16x). Earnings revision ratio: tech 0.48, healthcare 0.61.',
      output:
        'Cycle Phase: Late cycle. Historical pattern (last 4 cycles): in the 12 months following yield curve inversion, technology underperformed by average 11%; healthcare and consumer staples outperformed by average 8% and 6% respectively. Sector Scorecard: Technology — 3M +12%, P/E 28x vs. 22x avg (+27% premium), revision ratio 0.48 — AVOID. Healthcare — 3M -3%, P/E 17x vs. 16x avg (near fair value), revision ratio 0.61 — FAVOR. Utilities — 3M -5%, P/E 15x vs. 16x avg (discount to history), revision neutral — NEUTRAL (rate path dependent). Top Overweights: (1) Healthcare — late-cycle defensive with positive earnings revision breadth at 0.61; the cycle tailwind and revision support combine to produce the strongest setup in the scorecard. (2) Consumer Staples — pricing power intact in an inflationary late-cycle; near its 10-year average multiple with improving revision trend. Top Underweights: Technology — 3-month outperformance is momentum-driven; at 28x vs. 22x average with revision ratio 0.48, the setup for multiple compression is intact. Crowding Risk: Technology is in the 67th percentile of institutional overweights — when the rotation starts, crowding will amplify the move. Rotation Watch: Industrials — not yet a rotation candidate but watch for earnings revision improvement as the infrastructure spend cycle matures.',
      note: 'Cycle phase and historical pattern established before recent performance is reviewed. Healthcare FAVOR is confirmed by revision ratio 0.61 + fair valuation. Crowding amplification risk in tech is quantified (67th percentile).',
    },
  ],
});
