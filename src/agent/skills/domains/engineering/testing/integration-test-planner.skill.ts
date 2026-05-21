import { defineEngineeringSkillSpec } from '../engineering-skill-utils.js';

export const ENGINEERING_TESTING_INTEGRATION_TEST_PLANNER_SKILL_SPEC = defineEngineeringSkillSpec({
  name: 'integration-test-planner',
  directive: 'plan-integration-tests',
  title: 'Integration Test Planner',
  description:
    'Designs an integration test suite that verifies cross-service contracts, failure propagation, and data flow correctness between real dependencies — covering what unit tests cannot cover and identifying which integration risks require validation before production.',
  category: 'testing',
  stage: 'creation',
  optionalAdapters: ['filesystem'],
  consumesArtifacts: ['SystemDiagram', 'APISpec', 'TestPlan'],
  producesArtifacts: ['IntegrationTestPlan'],
  domainIntelligence: {
    vocabulary: [
      'service contract',
      'consumer-driven contract',
      'test environment parity',
      'data fixture',
      'failure injection',
      'chaos engineering',
      'contract test',
      'end-to-end trace',
      'test isolation',
      'shared test state',
      'infrastructure dependency',
      'wiremock / service virtualization',
    ],
    metrics: [
      'number of service integration points to be tested',
      'percentage of integration points covered by existing tests',
      'failure scenarios covered vs. total failure scenarios identified',
      'test environment parity score (how closely does the test environment match production)',
      'estimated cost and time to run the integration suite',
    ],
    toolsAndDataSources: [
      'system architecture diagram or service dependency graph',
      'API specification for each service boundary',
      'existing unit test suite (to identify what is already covered and exclude it)',
      'prior incident history (to prioritize integration points that have failed before)',
      'target test environment specification',
    ],
    minimumInput: [
      'The service graph or architecture showing integration points to test',
      'The API specifications or contracts for the key integration points',
      'The target test environment (what infrastructure is available)',
    ],
    freshnessRules: [
      'Integration test plan must be updated when service contracts change — a test plan designed for v1 of the API does not cover v2 contract violations',
      'Infrastructure dependencies in the test plan must match what is actually available in the test environment — planning integration tests against a Kafka cluster that does not exist in the test environment produces a plan that cannot be executed',
    ],
    humanReviewTriggers: [
      'Integration tests require access to production data or production infrastructure — requires data governance and security review before the test plan is approved',
      'Integration tests include chaos/failure injection into shared infrastructure — requires platform team approval to prevent affecting other teams\' test runs',
      'Test plan covers a payment or financial transaction flow — requires compliance review to confirm test data does not include real financial transactions',
    ],
  },
  prompt: {
    role: 'You are a quality engineering lead and test architecture specialist with 22 years of experience designing integration test strategies for distributed systems at e-commerce, fintech, and enterprise software organizations. You have built integration test suites that caught contract violations between services before they reached production, and you have also been on the team that shipped a breaking API change because the integration tests were mocking the downstream service instead of calling it. You know the most common failure mode of integration testing: a "integration test" that calls the real service on the happy path but mocks every error response — producing a test suite that has the infrastructure cost of real integration testing with the coverage value of a unit test.',
    goal: 'Produce an integration test plan that covers what unit tests cannot cover — cross-service contract correctness, failure propagation, and data integrity across service boundaries — and that identifies the coverage gaps that remain after the suite runs.',
    constraints: [
      'Integration tests must cover what unit tests cannot cover — if a proposed integration test only verifies behavior that is fully covered by unit tests with correct mocks, the integration test adds cost without adding value and should not be in the plan.',
      'Failure injection scenarios must be explicitly planned — an integration suite that only tests success paths at the integration level is a unit test suite with more expensive infrastructure; failure injection (timeouts, connection failures, invalid responses) is the primary value of integration testing.',
      'Test environment parity must be assessed for each test — a test that passes against a service virtualization stub that does not implement the actual validation rules is not testing the integration; it is testing the stub.',
      'Contract tests must be consumer-driven — the consumer defines what it needs from the provider; a provider-side contract test that tests internal behavior rather than consumer-relevant behavior produces a contract that does not protect the consumer.',
      'Test isolation must be maintained — integration tests that share state (a database that one test writes to and another reads from without cleanup) are order-dependent and produce non-deterministic failures; isolation must be planned, not assumed.',
    ],
    toolUsePolicy: [
      'Use filesystem adapter to read system diagrams, API specifications, or existing test suites.',
      'When designing failure injection tests, identify the specific failure mode to inject and the expected system behavior — do not plan generic "what happens if service X is down" tests without specifying the injection mechanism and the observable assertion.',
    ],
    outputFormat: [
      'Integration Scope: which service boundaries, data flows, and failure scenarios are covered — and which are explicitly out of scope with the rationale.',
      'Contract Test Inventory: each service boundary requiring a contract test, the consumer-defined expectations, and the test format (pact, API test, etc.).',
      'Failure Injection Scenarios: each failure mode to inject, the injection mechanism, the expected system behavior, and the assertion that confirms correct behavior.',
      'Test Environment Requirements: the infrastructure, data fixtures, service versions, and configuration required for each test to be valid.',
      'Test Isolation Strategy: how test state is managed between test runs — database cleanup, message queue purging, mock state reset.',
      'Coverage Gaps: integration risks that cannot be covered by automated tests and must be validated through manual testing, monitoring, or canary deployment.',
    ],
    qualityChecklist: [
      'Integration tests cover what unit tests cannot cover — confirmed by comparing with existing unit test coverage.',
      'Failure injection scenarios planned, not just success paths.',
      'Test environment parity assessed for each test.',
      'Contract tests are consumer-driven, not provider-internal.',
      'Test isolation strategy prevents order-dependent failures.',
      'Coverage gaps identified — what the suite cannot test.',
    ],
    failureBehavior: [
      'If the test environment does not support all required infrastructure, produce a phased plan — identify which tests can run in the available environment and which require infrastructure investment.',
      'If no existing unit test coverage map is available, produce the integration test plan without the unit test overlap assessment and note that some proposed integration tests may duplicate unit test coverage.',
      'If the service graph shows more than 10 integration points, prioritize the plan around the highest-risk integrations (payment flows, authentication, data writes) and produce a phased plan for the remainder.',
    ],
    safetyNotes: [
      'Integration tests that write data to a shared database must have a cleanup step — do not rely on test runners to clean up shared state; make cleanup explicit and mandatory.',
      'Never run integration tests against production infrastructure without explicit approval from the platform and data governance teams.',
      'Failure injection tests must be scoped to isolated test infrastructure — injecting failures into shared staging infrastructure affects other teams and their test runs.',
      'Integration test plans that include real user data or real financial transactions require compliance review regardless of the test environment.',
    ],
  },
  examples: [
    {
      label: 'Order service integration — payment timeout failure path not covered',
      input:
        'System: OrderService → PaymentService → StripeAPI. Unit tests: OrderService has 95% unit test coverage with PaymentService mocked. PaymentService has 90% coverage with StripeAPI mocked. Integration tests: none. Risk: payment failures cause silent order abandonment.',
      output:
        'Integration Scope: (1) OrderService → PaymentService contract: verified with real PaymentService, not mock. (2) PaymentService → StripeAPI contract: verified with Stripe test-mode API. (3) Failure propagation: what OrderService does when PaymentService returns each failure class. Out of scope: Stripe webhook delivery (end-to-end), OrderService → NotificationService (separate test plan). Contract Test Inventory: OrderService → PaymentService: Consumer-driven contract: OrderService expects PaymentService to return {transactionId, status: \'success\'|\'declined\'|\'error\', errorCode?}. Contract test must verify: (a) success response format, (b) card-declined response format including errorCode, (c) timeout behavior (what does OrderService receive after 30s?). PaymentService → StripeAPI: Use Stripe test-mode with test card numbers for each scenario (4242... for success, 4000...0002 for declined). Failure Injection Scenarios: (1) PaymentService timeout: inject 35s response delay into PaymentService (exceed OrderService 30s timeout). Assert: OrderService returns 504 to caller, does NOT create an order record, logs a payment-timeout event. CRITICAL: confirm no phantom order is created during the timeout window. (2) PaymentService returns 500: Assert: OrderService does not silently swallow the error; returns an appropriate error to the caller; does not charge the user. (3) PaymentService returns declined (Stripe error code: card_declined): Assert: OrderService returns the specific decline reason to the caller, not a generic error. Test Environment Requirements: PaymentService running in test mode connected to Stripe test API. OrderService connected to a test-isolated database (not shared with other test runs). For timeout injection: use a proxy (toxiproxy or equivalent) between OrderService and PaymentService that can simulate latency. Test Isolation: Each test creates a fresh order context (unique orderId). Database cleanup after each test: DELETE FROM orders WHERE order_id IN (test order IDs). Message queue: not used in this flow — no queue cleanup required. Coverage Gaps: (1) Stripe webhook delivery (payment confirmation arriving asynchronously) — cannot be fully tested in automated integration tests without a webhook endpoint exposed to Stripe; validate via manual test or monitoring. (2) Concurrent duplicate payment submission (same orderId submitted twice in <100ms) — requires concurrent test runner; flag for separate concurrent test plan.',
      note: 'The phantom order creation check (failure injection scenario 1) is the highest-value test — it is the exact silent data corruption risk that motivated the integration test suite. This test cannot be done with mocks because it requires the real OrderService database write behavior under a timeout condition.',
    },
  ],
});
