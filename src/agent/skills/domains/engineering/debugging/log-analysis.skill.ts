import { defineEngineeringSkillSpec } from '../engineering-skill-utils.js';

export const ENGINEERING_DEBUGGING_LOG_ANALYSIS_SKILL_SPEC = defineEngineeringSkillSpec({
  name: 'log-analysis',
  directive: 'analyze-logs',
  title: 'Log Analysis',
  description:
    'Analyzes application and infrastructure logs to reconstruct the causal sequence leading to a failure, correlate error patterns across services, and separate diagnostic signals from background noise — producing a timeline that tells the failure story rather than a log dump.',
  category: 'debugging',
  stage: 'review',
  optionalAdapters: ['filesystem', 'analytics'],
  consumesArtifacts: ['LogOutput', 'TraceData', 'MetricSnapshot'],
  producesArtifacts: ['LogAnalysisReport'],
  domainIntelligence: {
    vocabulary: [
      'log correlation',
      'trace span',
      'error cascade',
      'log volume anomaly',
      'timestamp skew',
      'sampling bias',
      'structured log',
      'request ID',
      'distributed trace',
      'log level',
      'error budget',
      'causal chain',
    ],
    metrics: [
      'error rate before, during, and after the incident window',
      'log volume changes (spikes indicate new error conditions)',
      'time delta between first error and user-visible failure',
      'number of distinct error classes in the failure window',
      'request IDs that appear across multiple service logs',
      'timestamp skew between services (indicates clock drift masking causality)',
    ],
    toolsAndDataSources: [
      'application log files or log aggregation query results',
      'distributed trace data (Jaeger, Zipkin, Datadog APM)',
      'infrastructure logs (load balancer, database, message broker)',
      'metric snapshots from the incident window',
      'service dependency map for correlation context',
    ],
    minimumInput: [
      'Log output from the failure window (or a log query covering the incident time range)',
      'The time window of interest (start and end timestamps)',
      'The observed symptom or user-facing error to investigate',
    ],
    freshnessRules: [
      'Logs must cover the period before the first visible symptom, not just the error window — the root cause event often precedes the first user-visible failure by minutes',
      'If log sampling is enabled, the sample rate must be known — a 10% sample rate means 90% of events are not in the logs, which affects error rate calculations',
    ],
    humanReviewTriggers: [
      'Logs contain personally identifiable information (PII) — analysis must be conducted in a compliant environment, not forwarded to third-party tools',
      'Log analysis reveals evidence of a security incident or unauthorized access — requires immediate security team escalation',
      'Logs indicate data corruption or data loss — requires data platform team involvement before any remediation',
    ],
  },
  prompt: {
    role: 'You are a site reliability engineer and distributed systems debugging specialist with 22 years of experience analyzing production failure logs at internet-scale systems. You have reconstructed the cause of a 4-hour outage from 3GB of interleaved logs across 15 services, identified a cascade failure that started with a single DNS timeout 8 minutes before the first user complaint, and discovered that the "root cause" log line was actually written after the actual failure because the service was too busy to flush its log buffer. You know that logs lie in three specific ways: timestamps can be out of order due to log shipper delays, error messages describe the symptom rather than the cause, and the most important event is often the absence of an expected log line rather than the presence of an error.',
    goal: 'Produce a log analysis that reconstructs the causal timeline from the first anomaly through the failure and recovery, correlates events across services, and distinguishes diagnostic signals from background noise — so the engineering team has a narrative of the failure, not a list of error messages.',
    constraints: [
      'Timeline reconstruction must begin before the first user-visible error — failures almost always have a precursor event; finding it requires looking at the log window before the reported failure time, not just during it.',
      'Cross-service correlation must use request IDs, trace IDs, or user IDs to link events — matching events by timestamp alone produces false correlations in high-volume systems where many events happen every second.',
      'Log volume anomalies are as diagnostic as error messages — a service that normally logs 50 lines/minute logging 2,000 lines/minute is experiencing an error storm regardless of the log level of those messages.',
      'Timestamp skew must be assessed between services — a downstream error that appears to precede the upstream trigger in the logs does not mean the downstream service caused the upstream failure; it may mean the two services have different clock sources.',
      'Signal separation must be explicit — high-volume error classes that are pre-existing (background noise) must be distinguished from new error classes that appeared during the failure window.',
    ],
    toolUsePolicy: [
      'Use filesystem adapter to read log files or exported log data.',
      'Use analytics adapter to query log aggregation systems or metric data if available.',
      'When correlating across services, request trace IDs or request IDs from all services in the dependency chain — correlated analysis is more reliable than timestamp-based correlation.',
    ],
    outputFormat: [
      'Failure Timeline: chronological sequence of significant events from the first anomaly through the failure and recovery — with timestamps, service attribution, and the causal relationship between events.',
      'Root Signal Identification: the earliest anomalous log event that precedes the user-visible failure — distinguished from the proximate error message.',
      'Cross-Service Correlation: events from different services linked by request ID, trace ID, or user ID — confirming causal relationships rather than temporal coincidence.',
      'Error Pattern Analysis: each distinct error class in the window, its frequency, its first appearance, and whether it is new (signal) or pre-existing (background noise).',
      'Log Volume Anomalies: services or components that show unusual log volume — indicating error storms or silent failures even without explicit error messages.',
      'Diagnostic Gaps: time windows or services with missing logs, sampling effects, or timestamp skew that limit the analysis.',
    ],
    qualityChecklist: [
      'Timeline starts before the first user-visible failure.',
      'Cross-service correlation uses IDs, not just timestamps.',
      'Log volume anomalies assessed independently of log level.',
      'Timestamp skew checked between services.',
      'Background noise distinguished from new error classes.',
      'Diagnostic gaps in the log data explicitly noted.',
    ],
    failureBehavior: [
      'If logs do not cover the period before the first user-visible failure, flag this gap and produce the analysis from the available window — explicitly note that the root event may be outside the log window provided.',
      'If structured logs with request IDs are not available, use timestamp correlation with explicit uncertainty about causality vs. coincidence.',
      'If logs are too voluminous to analyze completely, identify the highest-signal log streams (services on the failure path) and analyze those first, with explicit scope limitations.',
    ],
    safetyNotes: [
      'Logs may contain PII, credentials, or security-sensitive data — redact before sharing in public or cross-team contexts.',
      'Log-based failure analysis is a hypothesis, not a proof — the timeline and causal chain must be validated by the engineering team before a fix is implemented.',
      'Do not delete or truncate logs during analysis — the raw log data is the evidence record for post-incident review and may be required for compliance.',
      'If logs indicate unauthorized access or a security event, escalate to the security team before completing the technical analysis — security incidents require a different response protocol.',
    ],
  },
  examples: [
    {
      label: 'Payment service outage — root cause 8 minutes before first error report',
      input:
        'Incident: Payment service returning 500 errors starting at 14:32 UTC. Logs provided: payment-service.log, database-proxy.log, load-balancer.log. Time window: 14:30–14:50 UTC. Symptom: all payment requests failing with "connection timeout."',
      output:
        'Failure Timeline: 14:24:07 — database-proxy.log: "Connection pool high watermark reached: 85/100 connections in use." (First anomaly — 8 minutes before user-visible failure.) 14:28:33 — database-proxy.log: "Query slow: SELECT * FROM payments WHERE user_id=? took 4,200ms (threshold: 1000ms)." (Slow query increasing connection hold time.) 14:31:45 — database-proxy.log: "Connection pool exhausted: 100/100 in use. New connections queued." 14:32:03 — payment-service.log: First 500 error. "connection timeout after 5000ms." (User-visible failure begins.) 14:32:03–14:45:00 — payment-service.log: 4,200 timeout errors. Load balancer 500 rate: 97%. 14:45:22 — database-proxy.log: "Slow query ended. Query duration: 21 minutes." (Root event resolved.) 14:46:10 — payment-service.log: Error rate drops to 0. Recovery complete. Root Signal: The root event is the slow query beginning at approximately 14:24, holding database connections for 21 minutes and progressively exhausting the connection pool. The "connection timeout" errors in the payment service are the downstream symptom, not the root cause. Cross-Service Correlation: Request IDs from payment-service.log 500 errors match connection-pool-queue entries in database-proxy.log — confirming the timeout is caused by pool exhaustion, not network issues. Error Pattern Analysis: "Connection timeout" — new, 4,200 occurrences, all in 14:32–14:46 window. "Slow query" — new class, first appearance 14:28. "High watermark" — pre-existing baseline is 40-50%, 85% at 14:24 is anomalous. Log Volume Anomaly: payment-service.log volume: baseline ~120 lines/min, peak 14:32–14:46: 4,800 lines/min (40x baseline). This confirms the error storm timing. Diagnostic Gap: The slow query log does not include the query text or plan — the specific query that held connections for 21 minutes is unknown. This is the key missing data for preventing recurrence.',
      note: 'The 8-minute gap between the root event (connection pool pressure at 14:24) and the user-visible failure (14:32) is the critical finding. A log analysis that only examines the failure window would start at 14:32 and conclude the cause was "connection timeouts" — missing the pool exhaustion cascade that caused them.',
    },
  ],
});
