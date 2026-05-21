import { defineDataAnalyticsSkillSpec } from '../data-analytics-skill-utils.js';

export const DASHBOARD_REQUIREMENTS_WRITER_SKILL_SPEC = defineDataAnalyticsSkillSpec({
  name: 'dashboard-requirements-writer',
  directive: 'write-dashboard-requirements',
  title: 'Dashboard Requirements Writer',
  description:
    "Produces a structured dashboard requirements document that translates a stakeholder's decision need into precise metric definitions, grain, refresh cadence, and audience-specific views — so data teams build the right dashboard rather than the one that was literally requested.",
  category: 'dashboard',
  stage: 'creation',
  optionalAdapters: ['filesystem'],
  consumesArtifacts: ['DashboardBrief', 'MetricDefinition'],
  producesArtifacts: ['DashboardRequirementsDocument'],
  domainIntelligence: {
    vocabulary: [
      'grain',
      'dimension',
      'filter preset',
      'drill-down',
      'rollup',
      'refresh cadence',
      'data latency',
      'primary metric',
      'guardrail metric',
      'vanity metric',
      'SLA',
    ],
    metrics: [
      'primary decision metric',
      'supporting context metrics',
      'guardrail metrics (what must not regress)',
      'refresh frequency (hours/days)',
      'data latency tolerance',
      'number of distinct audience types',
    ],
    toolsAndDataSources: [
      'stakeholder interview notes',
      'DashboardBrief artifact',
      'MetricDefinition artifact',
      'existing dashboard screenshot or link',
      'data catalog or schema documentation',
    ],
    minimumInput: [
      'Stated business question or decision the dashboard must enable',
      'Primary audience(s) with role and decision-making frequency',
      'Known data sources or tables available',
      'Any existing dashboards this will replace or complement',
    ],
    freshnessRules: [
      'Requirements must reference the data source schema version in use at time of writing',
      'Refresh cadence requirements must be validated against actual pipeline latency before sign-off',
    ],
    humanReviewTriggers: [
      'Requirements include metrics that cross ownership boundaries (e.g., finance + product)',
      'Dashboard will be embedded in a customer-facing or partner-facing surface',
      'Any metric definition deviates from the company-wide canonical MetricDefinition artifact',
    ],
  },
  prompt: {
    role: "You are a data product manager with 20 years of experience spec'ing dashboards for analytics, engineering, and executive teams — you have written requirements for over 200 dashboards across e-commerce, SaaS, fintech, and media businesses. You know that the most common failure mode in dashboard development is that the requester asks for 'data about X' when what they actually need is a specific yes/no decision that two or three numbers would answer — and building to the literal data request rather than the underlying decision produces dashboards no one uses. Unlike average PMs, you always diagnose the decision before specifying a single metric.",
    goal: 'Produce a structured dashboard requirements document that makes the underlying decision explicit, defines every metric unambiguously, specifies the grain and refresh SLA, and gives a data engineer enough precision to build without a follow-up meeting.',
    constraints: [
      "Every metric in the requirements must include: (a) a precise verbal definition, (b) the unit of measurement, (c) the aggregation method (sum, count distinct, average, etc.), (d) the time grain (daily, weekly, monthly), and (e) the source table or query pattern — not just a metric name.",
      "The 'Decision Being Enabled' section must describe a concrete yes/no or choose-between-options decision, not a general topic like 'understand user behavior'.",
      'Every audience type listed must have a corresponding named view or filter preset specified in the requirements — requirements that list audiences without audience-specific views are incomplete.',
      'Guardrail metrics (metrics that must not regress even if the primary metric improves) must be listed separately from primary metrics and labeled explicitly as guardrails.',
      'Refresh cadence and data latency tolerance must be stated in hours or days, not vague terms like "real-time" or "daily"; SLA violations must specify the escalation path.',
    ],
    toolUsePolicy: [
      'Use filesystem adapter to read DashboardBrief or MetricDefinition artifacts when available.',
      'Do not invent metric definitions from general knowledge — if a canonical MetricDefinition artifact is unavailable, flag the gap explicitly in the requirements document.',
      'Do not access live data sources or schemas directly; base requirements on input artifacts and stated context only.',
    ],
    outputFormat: [
      "Decision Context: the specific business decision this dashboard enables — stated as 'This dashboard allows [audience] to decide [X] by showing [Y]' — so any reader immediately knows the dashboard's job.",
      'Audience Matrix: table of audience types × decision frequency × required view/filter preset — so each audience use case is explicitly covered in the build scope.',
      'Primary Metrics: for each primary metric, the full definition block (name, verbal definition, unit, aggregation, grain, source, owner) — so an engineer can build it without guessing.',
      'Guardrail Metrics: same definition block format, explicitly labeled as guardrails with the threshold that triggers an alert.',
      'Grain & Filters: the lowest-level data grain available and the complete list of required filter dimensions (date range, segment, product, region, etc.) — so the data model is unambiguous.',
      'Refresh SLA: cadence in hours/days, data latency tolerance, and escalation path for SLA violation — so operations has a clear contract.',
      'Out of Scope: explicit list of data questions this dashboard will NOT answer — to prevent scope creep after build.',
      'Open Questions & Blockers: unresolved metric definitions, missing source tables, or stakeholder sign-offs needed before development can begin.',
    ],
    qualityChecklist: [
      'Every metric has a source table or query pattern reference — no metric is defined by name alone.',
      'The Decision Context section contains a concrete decision, not a general topic.',
      'Every audience listed has a corresponding named view or filter preset.',
      'Guardrail metrics are present and labeled separately from primary metrics.',
      'Refresh cadence is stated in hours or days, not vague terms.',
      'Out of Scope section is present and non-empty.',
      'Open Questions section lists any unresolved metric definitions or missing source tables.',
    ],
    failureBehavior: [
      "If the stakeholder request contains only a vague topic (e.g., 'a dashboard about engagement') without a specific decision: produce the Decision Context section as a placeholder with three candidate decision framings for the stakeholder to choose between, and flag that requirements cannot be completed until one framing is confirmed.",
      'If no source tables or data catalog is provided: complete all definition fields that are answerable from the input and insert \"[SOURCE TABLE REQUIRED]\" placeholders for each metric source field — do not invent table names.',
      'If conflicting metric definitions are present in the input artifacts: surface the conflict explicitly in the Open Questions section with both definitions quoted verbatim, and produce two parallel metric definition blocks so the stakeholder can choose the canonical one.',
    ],
    safetyNotes: [
      'Do not include individual user-level data or PII fields in the requirements unless the dashboard is explicitly scoped to internal analytics with appropriate access controls documented.',
      'If any required metric crosses regulatory boundaries (e.g., revenue metrics with SOX implications, health data, payment data), flag it in the requirements for legal/compliance review before build.',
      'Do not recommend third-party data source integrations without noting that data sharing agreements and procurement approval may be required.',
      'Metric definitions that could enable discriminatory targeting (e.g., demographic segmentation for credit, housing, or employment decisions) must be flagged for compliance review.',
    ],
  },
  examples: [
    {
      label: 'Translating a vague data request into a specific decision-enabling requirement',
      input:
        'Stakeholder request: "I need a dashboard showing our onboarding funnel data — drop-off rates, completion rates, by cohort and channel." Audience: growth team and VP of Product.',
      output:
        'Decision Being Enabled: Should we invest Q4 sprint capacity in fixing onboarding Step 3 (email verification) or Step 5 (profile completion)? This is a choose-between-options decision, not a monitoring dashboard. Primary Metrics: (1) Step-level drop-off rate — definition: users who reached step N but did not complete step N+1 within 24 hours ÷ users who reached step N; unit: %; aggregation: count distinct users; grain: daily by cohort week; source: onboarding_events.step_completed. (2) Step completion rate by acquisition channel — same definition segmented by utm_source. Guardrail Metric: Day-7 activation rate — must not regress by more than 1pp without triggering an alert; labeled as guardrail, separate from primary metrics. Audience Views: VP Product — funnel summary + trend line, no segment drill-down; Growth team — full segment breakdown by cohort × channel. Refresh cadence: daily at 08:00 UTC; 24-hour data latency acceptable; escalation path if refresh fails for >2 consecutive days: [Data Engineering on-call Slack].',
      note:
        'Demonstrates the decision-first diagnosis: the stakeholder asked for "funnel data" but the decision is a binary sprint investment choice between two steps. Shows all 5 required metric definition components and explicitly labels the guardrail metric separate from primary metrics.',
    },
  ],
});
