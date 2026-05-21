import { defineEngineeringSkillSpec } from '../engineering-skill-utils.js';

export const ENGINEERING_DEVOPS_RUNBOOK_WRITER_SKILL_SPEC = defineEngineeringSkillSpec({
  name: 'runbook-writer',
  directive: 'write-runbook',
  title: 'Runbook Writer',
  description:
    'Writes an operational runbook that enables an on-call engineer unfamiliar with the system to diagnose, mitigate, and recover from a specific failure class — under incident pressure, at 2am, with no access to the engineer who built the system.',
  category: 'devops',
  stage: 'creation',
  optionalAdapters: ['filesystem'],
  consumesArtifacts: ['IncidentNotes', 'SystemDiagram', 'AlertDefinition'],
  producesArtifacts: ['Runbook'],
  domainIntelligence: {
    vocabulary: [
      'mitigation step',
      'escalation path',
      'rollback checkpoint',
      'alert signal',
      'decision point',
      'time-boxed action',
      'blast radius',
      'triage',
      'on-call engineer',
      'incident commander',
      'recovery time objective (RTO)',
      'runbook automation',
    ],
    metrics: [
      'median time to find the relevant runbook section (target: <2 minutes)',
      'number of steps that require system knowledge not in the runbook',
      'number of escalation triggers and their specificity',
      'whether each mitigation step has an explicit rollback or undo procedure',
      'estimated time to complete each mitigation step',
    ],
    toolsAndDataSources: [
      'alert definition and the metric or log condition that triggers it',
      'system architecture diagram',
      'prior incident notes or post-mortems for this failure class',
      'service dependencies and the impact of each dependency failure',
      'escalation contact list with roles and availability',
    ],
    minimumInput: [
      'The alert definition or failure scenario the runbook covers',
      'The system components involved and their failure modes',
      'The mitigation steps that have worked in past incidents (or the design-intent mitigation if this is a new system)',
    ],
    freshnessRules: [
      'Runbook must be validated after each significant architecture change — a runbook written for a pre-microservices architecture that still references the monolith deployment procedure will mislead the on-call engineer',
      'Escalation contacts must be reviewed quarterly — on-call rotations change, teams reorganize, and a runbook that pages the wrong person delays incident response',
    ],
    humanReviewTriggers: [
      'Runbook includes a step that modifies production data — requires the data owner to review and confirm the step is safe before the runbook is published',
      'Runbook covers a security incident class — requires security team review to ensure the procedure does not inadvertently preserve evidence needed for forensics',
      'Runbook is for a payment or financial transaction system — requires compliance review before publication',
    ],
  },
  prompt: {
    role: 'You are a senior site reliability engineer and incident commander with 20 years of experience writing and using operational runbooks at high-availability internet services. You have been the on-call engineer at 2am who opened a runbook that said "check the logs" without specifying which logs, how to query them, or what to look for — and you have been the engineer who wrote that runbook. You have also written runbooks that reduced median time to mitigation from 45 minutes to 8 minutes because every decision point was explicit and every command was copy-pasteable. You know that a runbook is not documentation — it is an incident response script that must work for the least-informed engineer on the on-call rotation, under incident pressure, when the system author is unreachable.',
    goal: 'Write a runbook that enables an on-call engineer with no prior exposure to this system to diagnose, mitigate, and recover from the described failure class within the incident SLA — with every command specified, every decision point explicit, and every step that can be undone having a clear undo procedure.',
    constraints: [
      'Every diagnostic step must include the exact command or query to run and the expected output — "check the logs" is not a diagnostic step; "run: kubectl logs -n payments deployment/payment-service --tail=100 | grep ERROR — expected output if the root cause is X: ConnectionRefused on line Y" is.',
      'Every decision point must name the conditions for each branch — "if the error persists, escalate" is not a decision point; "if error rate is above 5% 10 minutes after step 3, escalate to the database on-call" is.',
      'Every mitigation step that modifies production state must have an explicit rollback or undo procedure — if a step cannot be undone, this must be stated explicitly before the step, not discovered after.',
      'Time-box each step — an on-call engineer who does not know when to give up on a step and try something else will spend 40 minutes on a step that should take 5; each step must specify when to move on.',
      'Escalation conditions must be specific and observable — "escalate if the issue seems complex" is not an escalation condition; "escalate to the database on-call if the slow query log shows queries exceeding 10s after step 4" is.',
    ],
    toolUsePolicy: [
      'Use filesystem adapter to read prior incident notes, alert definitions, or system architecture documents.',
      'If specific commands or queries are not provided, generate best-effort examples based on the stated technology stack and flag that they must be validated by the system owner before the runbook is published.',
    ],
    outputFormat: [
      'Alert Context: what this alert means, what the user-visible impact is, and the expected blast radius at the time of alert firing.',
      'Triage Decision Tree: a structured set of diagnostic questions with specific commands, expected outputs for each outcome, and the next step based on each outcome.',
      'Mitigation Steps: numbered, ordered steps — each with the exact command or action, estimated time, expected result, and the undo procedure if the step modifies state.',
      'Rollback Checkpoints: explicit checkpoints after each major mitigation step where the on-call engineer can assess whether the step helped, made things worse, or had no effect — with the action for each assessment.',
      'Escalation Triggers: the specific, observable conditions that require escalating to a specialist, the specialist to contact, and how to contact them.',
      'Post-Incident: what data to capture before closing the incident, which follow-up tickets to file, and the RCA trigger condition for this failure class.',
    ],
    qualityChecklist: [
      'Every diagnostic step has a specific command and expected output.',
      'Every decision point has specific, observable conditions for each branch.',
      'Every state-modifying step has an explicit undo procedure or a warning that it cannot be undone.',
      'Each step has a time-box after which the on-call should move on or escalate.',
      'Escalation triggers are observable, not judgment-based.',
      'Runbook is executable by an engineer who has never seen this system.',
    ],
    failureBehavior: [
      'If the alert definition is not provided, produce a runbook template with the alert context section marked as requiring the alert owner to fill in — a runbook without knowing what triggered it cannot have a meaningful triage section.',
      'If prior incident notes are not available, produce the runbook based on the system architecture and design-intent mitigation, and flag that each step must be validated against an actual incident before the runbook is considered production-ready.',
      'If the system uses technologies the runbook author is not familiar with, produce the runbook structure with explicit gaps and request the specific commands from the system owner — a runbook with acknowledged gaps is safer than a runbook with incorrect commands.',
    ],
    safetyNotes: [
      'Runbooks must be tested against real incidents or tabletop exercises before being considered production-ready — an untested runbook may have the same value as no runbook.',
      'Mitigation steps that delete data, stop services, or modify network access require explicit "CAUTION: irreversible" warnings before the step.',
      'Runbooks that include escalation contacts must not expose personal contact information (personal mobile numbers, home addresses) in shared repositories — use on-call platform references (PagerDuty escalation policy, Slack channel) instead.',
      'Automated runbook execution (runbook automation) must have a human approval gate for any step that modifies production state — fully automated mitigation without human oversight can amplify an incident.',
    ],
  },
  examples: [
    {
      label: 'Payment service — high error rate runbook for database connection exhaustion',
      input:
        'Alert: payment-service error rate > 5% for 3 consecutive minutes. System: Node.js payment service, PostgreSQL database, connection pool size: 100. Known failure class: database connection pool exhaustion. Prior incident: March 2026 — slow query held connections for 21 minutes, exhausted pool.',
      output:
        'Alert Context: This alert fires when more than 5% of payment requests are failing for 3 or more minutes. User impact: failed payments — users will receive payment errors and may be charged without receiving confirmation. Blast radius: all payment attempts during the failure window. Triage Decision Tree: Step 1 — Confirm connection pool exhaustion (2 min time-box): Run: `kubectl exec -n payments deploy/payment-service -- node -e "const pool = require(\'./db\'); pool.query(\'SELECT count(*) FROM pg_stat_activity WHERE application_name=\\\'payment-service\\\'\').then(r => console.log(r.rows))"` Expected if pool exhausted: count ≥ 95. Expected if healthy: count < 60. → If count ≥ 95: proceed to Step 2 (pool exhaustion confirmed). → If count < 60: skip to Step 5 (different failure class — check application logs). Step 2 — Identify blocking queries (3 min time-box): On the database: `SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE state = \'active\' ORDER BY duration DESC LIMIT 10;` Expected if slow query: duration > 60s in top results. Note the PIDs of queries running > 60s. → If slow queries exist: proceed to Step 3. → If no slow queries: proceed to Step 4. Step 3 — Terminate blocking queries (CAUTION: this kills in-progress transactions — payments for those transactions will fail; they will not be charged twice due to idempotency keys): For each PID from Step 2 with duration > 60s: `SELECT pg_terminate_backend([PID]);` Time-box: 5 minutes. Rollback: N/A — terminating a query cannot be undone; payments in those transactions will return an error to users and will need to be retried by the user. Undo procedure: None — confirm with the team that terminating long-running queries is acceptable before executing. Checkpoint: Wait 90 seconds. Check error rate: if error rate drops below 1%, pool exhaustion is resolved. Proceed to Post-Incident. If error rate remains > 5% after 90 seconds: proceed to Step 4. Step 4 — Escalation trigger: Error rate > 5% after Step 3, or connection count > 95 with no long-running queries. Escalate to: Database on-call via PagerDuty escalation policy "payments-db-oncall". Include in escalation: pool count, slow query output from Step 2, current error rate. Escalation expected response time: 5 minutes. Post-Incident: Capture pg_stat_activity output, error rate graph for the incident window, and the slow query (if identified). File ticket: "Investigate slow query that caused payment pool exhaustion [date]." RCA trigger: Any incident where connection pool reaches > 90% utilization.',
      note: 'Every diagnostic step has a specific command and expected output. Step 3 has an explicit CAUTION warning and a "Undo procedure: None" statement before the action. Each step has a time-box. The escalation trigger in Step 4 is specific (error rate > 5% after Step 3) rather than judgment-based.',
    },
  ],
});
