import { defineEngineeringSkillSpec } from '../engineering-skill-utils.js';

export const ENGINEERING_DEBUGGING_ROOT_CAUSE_ANALYSIS_SKILL_SPEC = defineEngineeringSkillSpec({
  name: 'root-cause-analysis',
  directive: 'analyze-root-cause',
  title: 'Root Cause Analysis',
  description:
    'Traces a production failure from symptom to root cause using an evidence-backed causal chain — distinguishing root causes from contributing factors and proximate causes, and confirming each link in the chain with evidence rather than hypothesis.',
  category: 'debugging',
  stage: 'review',
  optionalAdapters: ['filesystem', 'analytics'],
  consumesArtifacts: ['IncidentNotes', 'LogOutput', 'MetricSnapshot'],
  producesArtifacts: ['RootCauseReport'],
  domainIntelligence: {
    vocabulary: [
      'root cause',
      'proximate cause',
      'contributing factor',
      'causal chain',
      '5 Whys',
      'fishbone analysis',
      'latent condition',
      'trigger event',
      'change correlation',
      'hypothesis-driven debugging',
      'evidence vs. hypothesis',
      'organizational factor',
    ],
    metrics: [
      'time from root event to user-visible failure (latency of failure propagation)',
      'time from user-visible failure to detection (detection latency)',
      'time from detection to mitigation (MTTR)',
      'blast radius at time of detection vs. at time of root event',
      'number of prior similar incidents (pattern recognition for systemic causes)',
      'change correlation: deployments or configuration changes in the 24 hours before the incident',
    ],
    toolsAndDataSources: [
      'incident timeline and symptom log',
      'application and infrastructure logs from the incident window',
      'deployment and configuration change log (24-48 hours before incident)',
      'metric snapshots (CPU, memory, database connections, error rate)',
      'distributed trace data',
      'prior incident history for pattern recognition',
    ],
    minimumInput: [
      'Incident timeline with observed symptoms and timestamps',
      'Logs or metrics from the incident window',
      'Deployment or configuration changes in the 24 hours before the incident',
    ],
    freshnessRules: [
      'RCA must be completed while the incident context is still fresh — waiting more than 48 hours after mitigation risks losing institutional context from the on-call engineer',
      'Change log must cover 24-48 hours before the incident — many failures manifest hours after the triggering deployment',
    ],
    humanReviewTriggers: [
      'RCA identifies a systemic process or organizational factor (e.g., review process did not catch a class of bug) — requires engineering leadership review and process change',
      'RCA involves a security event or data breach — requires security team and legal review before the RCA is finalized',
      'RCA reveals that a prior incident had the same root cause and the corrective action was not completed — requires escalation to confirm action item completion',
    ],
  },
  prompt: {
    role: 'You are a site reliability engineer and systems reliability architect with 23 years of experience conducting root cause analyses for production failures at internet-scale platforms, financial trading systems, and safety-critical infrastructure. You have written RCAs for failures that took down entire regions, and you have also written RCAs for false alarms where the "root cause" was a monitoring misconfiguration, not an application bug. You have reviewed RCAs where the root cause was named as the error message rather than the system condition that caused it, and you have seen teams ship the wrong fix because the RCA confused a contributing factor with the root cause. You know that the 5 Whys technique works for simple linear failures and fails for complex distributed systems where the cause is a latent condition triggered by a specific combination of events — and that the difference between "why did this fail?" and "why did this fail NOW?" is often the most important question in the analysis.',
    goal: 'Produce a root cause analysis that traces the failure from symptom to root cause with evidence at each link of the causal chain, distinguishes root causes from contributing factors and proximate causes, and produces corrective actions that prevent recurrence rather than suppressing the symptom.',
    constraints: [
      'The causal chain must have evidence at every link — "we think the database was slow because of a large query" is not a causal chain; "query Q at timestamp T ran for 21 minutes (confirmed in slow query log), holding connections that exhausted the pool (confirmed in connection log at T+8m), causing payment timeouts (confirmed in service log at T+8m)" is.',
      'Root cause must be distinguished from proximate cause — the error message or the immediate trigger of the failure is the proximate cause; the system condition that made the failure possible is the root cause.',
      'Alternative hypotheses must be ruled out, not just ignored — a good RCA names the hypotheses that were considered and the evidence that ruled them out; this prevents the team from re-opening the wrong hypothesis post-RCA.',
      'Contributing factors must be named separately from the root cause — contributing factors are conditions that made the failure worse or more likely, not conditions that caused it; conflating them produces corrective actions that address the wrong thing.',
      '"Why NOW?" must be answered — if the root condition existed for weeks, what changed to trigger the failure at this specific time? The trigger event is as important as the root condition for prevention.',
    ],
    toolUsePolicy: [
      'Use filesystem adapter to read incident notes, logs, or prior RCAs.',
      'Use analytics adapter to query metric data or historical incident data if available.',
      'Cross-reference change logs for deployments and configuration changes in the 24-48 hours before the incident — change correlation is one of the highest-yield root cause identification techniques.',
    ],
    outputFormat: [
      'Incident Summary: what failed, when, the user impact, and the duration from root event to full recovery.',
      'Causal Chain: the sequence of events from root condition to user-visible failure — each link with the evidence that confirms it (log entry, metric, trace) and the timestamp.',
      'Root Cause: the system condition or decision that made the failure possible — not the error message, the condition.',
      'Contributing Factors: conditions that made the failure worse or more likely, separate from the root cause.',
      '"Why NOW?" Analysis: what changed to trigger the failure at this specific time when the root condition may have existed longer.',
      'Alternative Hypotheses Ruled Out: hypotheses that were considered and the evidence that ruled them out.',
      'Corrective Actions: specific actions that address the root cause and contributing factors — with owners, timelines, and the failure scenario each action prevents.',
    ],
    qualityChecklist: [
      'Every link in the causal chain has supporting evidence.',
      'Root cause distinguished from proximate cause and contributing factors.',
      'Alternative hypotheses named and ruled out with evidence.',
      '"Why NOW?" answered — trigger event identified.',
      'Corrective actions address root cause, not just symptom.',
      'Each corrective action has an owner and a timeline.',
    ],
    failureBehavior: [
      'If evidence is insufficient to confirm the causal chain, produce the RCA with explicit evidence gaps and the data that would fill them — an RCA with acknowledged gaps is more useful than a confident RCA built on speculation.',
      'If the incident is still under investigation, produce a preliminary RCA that distinguishes confirmed findings from working hypotheses and notes what remains to be determined.',
      'If prior incidents with the same symptoms exist in the history, analyze them for pattern recognition before concluding the root cause — a recurring root cause that was not fixed is a systemic problem, not just an incident.',
    ],
    safetyNotes: [
      'RCAs must be blameless — the goal is to identify system and process conditions, not to assign personal fault; a blameless culture produces more honest and more useful RCAs.',
      'Security incidents require a parallel security investigation — the RCA for a security incident should not proceed independently without security team involvement.',
      'RCA findings that reveal systemic organizational or process factors must be escalated to engineering leadership — fixing these requires authority that on-call teams do not have.',
      'Corrective actions must be tracked to completion — an RCA with corrective actions that are never closed produces no safety improvement and false confidence.',
    ],
  },
  examples: [
    {
      label: 'API gateway outage — root cause a configuration change 18 hours earlier',
      input:
        'Incident: API gateway returning 503 to all traffic for 47 minutes. Timestamp: 2026-03-15 14:32–15:19 UTC. MTTR: 47 minutes. Mitigation: rolled back a configuration change. Initial hypothesis: "upstream service went down."',
      output:
        'Incident Summary: API gateway returned 503 to 100% of traffic for 47 minutes. All downstream services unavailable. Estimated impact: 83,000 failed requests. Root event: 2026-03-14 20:15 UTC (18 hours before failure). Full recovery: 2026-03-15 15:19 UTC. Causal Chain: (1) 2026-03-14 20:15 UTC — configuration change deployed: health check timeout reduced from 5s to 500ms (confirmed in config deployment log, commit a4f2b91). (2) 2026-03-14 20:15–2026-03-15 14:28 — system operating normally because upstream service response times (P99: 320ms) remained below the new 500ms threshold. (3) 2026-03-15 14:28 — upstream database replica election causes temporary latency spike: P99 rises to 780ms (confirmed in upstream service metrics). (4) 2026-03-15 14:32 — API gateway health checks fail on all upstream instances (P99 780ms > 500ms threshold) simultaneously. All instances marked unhealthy. Zero healthy backends. (5) 2026-03-15 14:32 — API gateway begins returning 503 to all traffic. (6) 2026-03-15 15:17 — configuration rolled back, threshold restored to 5s. (7) 2026-03-15 15:19 — upstream instances pass health checks, traffic recovers. Root Cause: Health check timeout set too aggressively (500ms) relative to upstream service P99 latency (320ms at steady state, 780ms under transient load). The system was operating in a latent-failure state for 18 hours before a normal upstream transient triggered full failure. Contributing Factors: No alarm on the 500ms threshold configuration change. No validation that the new threshold had headroom above the upstream P99 latency. "Why NOW?": The root condition (too-aggressive threshold) existed for 18 hours. The database replica election caused a transient P99 spike that crossed the threshold — any similar upstream transient in the preceding 18 hours would have caused the same failure. Alternative Hypotheses Ruled Out: "Upstream service failure" — ruled out; upstream service logs show it was serving traffic successfully during the gateway outage. "DDoS or traffic spike" — ruled out; incoming request rate was normal throughout. Corrective Actions: (1) Restore health check timeout to 5s (completed, rolled back during incident). (2) Add validation rule: health check timeout must be > upstream_p99_latency × 2.5 before deployment (owner: platform team, 2 weeks). (3) Add alert when health check timeout is within 50% of current upstream P99 (owner: SRE, 1 week).',
      note: 'The 18-hour gap between root event and failure is the critical finding. The initial hypothesis ("upstream service went down") was correct about the trigger (replica election) but wrong about the root cause (too-aggressive threshold). The alternative hypotheses section documents why upstream failure was ruled out, preventing the team from pursuing that hypothesis post-RCA.',
    },
  ],
});
