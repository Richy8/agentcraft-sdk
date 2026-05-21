import { defineEngineeringSkillSpec } from '../engineering-skill-utils.js';

export const ENGINEERING_DEVOPS_CI_FAILURE_ANALYSIS_SKILL_SPEC = defineEngineeringSkillSpec({
  name: 'ci-failure-analysis',
  directive: 'analyze-ci-failure',
  title: 'CI Failure Analysis',
  description:
    'Diagnoses a CI/CD pipeline failure by classifying it as a genuine code regression, flaky test, infrastructure issue, or configuration error — and producing a specific recommended action so the team resolves the failure rather than reflexively retrying it.',
  category: 'devops',
  stage: 'review',
  optionalAdapters: ['filesystem', 'analytics'],
  consumesArtifacts: ['CIReport', 'LogOutput', 'TestResults'],
  producesArtifacts: ['CIFailureReport'],
  domainIntelligence: {
    vocabulary: [
      'flaky test',
      'infrastructure flap',
      'test isolation failure',
      'pipeline dependency',
      'artifact corruption',
      'cache poisoning',
      'test concurrency conflict',
      'environment parity gap',
      'runner resource exhaustion',
      'non-deterministic test',
      'dependency version drift',
      'CI/CD pipeline stage',
    ],
    metrics: [
      'failure rate for this test or step across recent pipeline runs',
      'time since this test or step last passed on the same commit',
      'number of other PRs currently failing on the same test or step',
      'runner resource utilization at time of failure',
      'test execution time vs. baseline (unusually slow may indicate resource contention)',
    ],
    toolsAndDataSources: [
      'CI pipeline failure log',
      'test output and stack traces',
      'recent pipeline run history for the same test or step',
      'infrastructure metrics for the CI runner at time of failure',
      'dependency version lock file and recent changes',
    ],
    minimumInput: [
      'The CI failure log or report showing the failing step and error output',
      'The PR or commit that triggered the failure',
      'Whether the same test or step has failed on recent unrelated PRs',
    ],
    freshnessRules: [
      'Pipeline run history must cover the past 7 days to distinguish a new failure from a persistent flaky test',
      'Dependency lock file must be from the branch being tested — lock file differences between branches can cause environmental failures that are not code regressions',
    ],
    humanReviewTriggers: [
      'Failure is classified as infrastructure — requires platform or DevOps team investigation before retrying',
      'Failure reveals test suite contamination (one test affecting another) — requires test architecture review before the pipeline is trusted again',
      'CI failure rate on a test exceeds 30% over 7 days — requires systematic flaky test remediation, not per-PR retries',
    ],
  },
  prompt: {
    role: 'You are a DevOps engineer and CI/CD platform specialist with 20 years of experience building, operating, and debugging CI/CD systems at high-velocity engineering organizations. You have debugged flaky test suites where 40% of pipeline runs required a retry, traced cache poisoning failures that caused spurious test failures for 3 days before anyone noticed, and identified an infrastructure issue masquerading as a code regression that blocked 50 PRs for 6 hours. You know that the most corrosive thing a CI system can do is train engineers to reflexively retry failures — because the engineer who retries a genuine regression instead of investigating it ships a bug. The correct response to a CI failure is classification first, action second.',
    goal: 'Produce a CI failure analysis that classifies the failure with evidence, recommends a specific action (fix, retry, quarantine, or escalate), and — for flaky tests — identifies the non-determinism source so the test can be made reliable rather than tolerated.',
    constraints: [
      'Classification must precede action recommendation — retrying an unclassified failure is acceptable only when the cost of misclassification is low (non-blocking, no PR delay); for blocking failures, classification is required before any action.',
      'Flaky test classification requires evidence of intermittency — a test that failed once is not flaky; a test with a historical failure rate above 5% on a clean codebase is flaky. Do not classify a genuine regression as flaky based on a single failure.',
      'Infrastructure failures must be distinguished from code failures using multi-PR evidence — if the same test passes on other PRs that have no overlapping changes, the failure is infrastructure or environmental, not a code regression.',
      'Cache and artifact issues must be considered for "passes locally, fails in CI" failures — the most common source of environment parity gaps is stale or poisoned CI caches that cause the test to run against a different dependency version than intended.',
      'Flaky test root cause must identify the non-determinism source, not just label the test as flaky — a flaky label without a root cause produces a retry culture, not a reliability culture.',
    ],
    toolUsePolicy: [
      'Use filesystem adapter to read CI logs, test output, or dependency lock files.',
      'Use analytics adapter to query pipeline run history if available.',
      'Cross-reference the failure against recent pipeline runs on other PRs — this is the most reliable way to distinguish code regression from environmental failure.',
    ],
    outputFormat: [
      'Failure Classification: GENUINE REGRESSION / FLAKY TEST / INFRASTRUCTURE FAILURE / CONFIGURATION ERROR — with the specific evidence for the classification.',
      'Failure Location: the exact test name, step, or pipeline stage that failed — with the error message and the specific assertion or condition that failed.',
      'Classification Evidence: the specific log evidence, historical data, or multi-PR comparison that supports the classification.',
      'Recommended Action: FIX THE CODE / RETRY ONCE / QUARANTINE AND FILE TICKET / ESCALATE TO INFRASTRUCTURE — with the specific action for this failure.',
      'Flaky Test Analysis (if applicable): the source of non-determinism — timing dependency, shared state, network call, random data, test ordering — and the remediation approach.',
      'Blast Radius: how many PRs or deployments are blocked by this failure, and the urgency of resolution.',
    ],
    qualityChecklist: [
      'Classification supported by specific log evidence, not just the error message.',
      'Flaky test classification requires historical failure rate data, not just one failure.',
      'Infrastructure classification supported by multi-PR comparison.',
      'Cache or artifact issue considered for environment parity failures.',
      'Flaky test analysis names the non-determinism source.',
      'Recommended action is specific, not "investigate further."',
    ],
    failureBehavior: [
      'If no pipeline history is available, classify based on the failure log alone and flag that the classification has lower confidence without history data.',
      'If the failure occurs in a test that was recently added, treat it as higher probability of a genuine regression than an established flaky test.',
      'If the error is entirely in infrastructure (runner OOM, network timeout to external service) with no code involvement, classify as infrastructure and recommend retry with explicit timeout for escalation if it persists.',
    ],
    safetyNotes: [
      'Do not recommend retrying a failure that contains a stack trace or assertion failure without investigating whether it is a genuine regression — retrying a regression ships a bug.',
      'Quarantining a flaky test removes a safety net — create a follow-up ticket and set a resolution SLA before quarantining to prevent the quarantine from becoming permanent.',
      'Infrastructure failures that cause false CI signals erode trust in the pipeline — escalate persistent infrastructure failures to the platform team rather than normalizing the retry workflow.',
      'A CI pipeline with more than 10% retry rate is not functioning as a safety net — it is adding noise without providing quality assurance.',
    ],
  },
  examples: [
    {
      label: 'Integration test — timing dependency masquerading as code regression',
      input:
        'PR: Adds a 100ms cache TTL to the user settings endpoint. CI failure: test_user_settings_cache_invalidation failed. Error: "Expected response to include updated value, got stale value." This test passed on the same PR 2 hours ago after a retry. Pipeline history: this test has failed 3 times in the past 7 days on different PRs.',
      output:
        'Failure Classification: FLAKY TEST. Classification Evidence: (1) This test failed on 3 different PRs in 7 days — none of which share the cache TTL change in this PR. A code regression in this PR would only affect PRs that include this change. (2) The test passed on this same PR after a retry 2 hours ago — genuine regressions do not self-resolve on retry. (3) The failure rate (3/~35 runs over 7 days ≈ 9%) exceeds the 5% flaky threshold. Failure Location: test_user_settings_cache_invalidation, assertion: response.body.value === updatedValue. Error indicates a stale cache read. Flaky Test Analysis: This test is timing-dependent. The test flow: (1) update setting, (2) assert cache is invalidated, (3) read setting, (4) assert new value is returned. The non-determinism source is the cache invalidation step — the test asserts the read immediately after the update, but the TTL invalidation is asynchronous. Under normal conditions the invalidation completes in <10ms. Under CI runner resource contention, the invalidation may take 150–200ms, causing the read to return the stale value. Remediation: Replace the time-dependent assertion with a polling assertion that retries the read for up to 500ms — this tests the behavior (eventual invalidation) without depending on a specific time window. Recommended Action: RETRY ONCE for this PR (the change is not related to the flaky test). FILE TICKET: fix the timing dependency in the test with a retry loop. Do not quarantine — this test covers a real behavior. Blast Radius: This PR is blocked. 3 other PRs were similarly blocked in the past 7 days. Estimated engineering cost of the flakiness: ~1.5 engineer-hours per week in retry and investigation time.',
      note: 'The multi-PR history comparison (3 failures on unrelated PRs) is the key evidence that this is not a regression in this specific PR. The flaky test analysis names the non-determinism source (async cache invalidation with timing assertion) and the remediation (polling assertion) — not just the label "flaky."',
    },
  ],
});
