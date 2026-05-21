import { defineEngineeringSkillSpec } from '../engineering-skill-utils.js';

export const ENGINEERING_TESTING_UNIT_TEST_GENERATOR_SKILL_SPEC = defineEngineeringSkillSpec({
  name: 'unit-test-generator',
  directive: 'generate-unit-tests',
  title: 'Unit Test Generator',
  description:
    'Generates unit tests that verify behavior at boundary conditions and failure paths — using mocks whose contracts accurately reflect the production dependency — so each test finds bugs rather than confirming that the code runs without throwing.',
  category: 'testing',
  stage: 'creation',
  optionalAdapters: ['filesystem'],
  consumesArtifacts: ['CodeContext', 'TestPlan'],
  producesArtifacts: ['TestSuite'],
  domainIntelligence: {
    vocabulary: [
      'test isolation',
      'mock contract',
      'boundary value',
      'parameterized test',
      'test fixture',
      'assertion depth',
      'arrange-act-assert (AAA)',
      'test double',
      'stub',
      'spy',
      'happy path test',
      'error path test',
    ],
    metrics: [
      'branch coverage of the function under test',
      'number of tests per error path vs. happy path',
      'mock fidelity score (how accurately the mock reflects production behavior)',
      'test execution time (unit tests should run in milliseconds)',
      'number of assertions per test (too few = under-specified, too many = brittle)',
    ],
    toolsAndDataSources: [
      'function or module code under test',
      'testing framework documentation for the target language',
      'production dependency API documentation (for accurate mock contracts)',
      'existing test fixtures to reuse',
      'test plan (if available, to align generated tests with planned coverage)',
    ],
    minimumInput: [
      'The function or module to test (code must be provided)',
      'The testing framework and language',
      'Whether existing test fixtures or mocks should be reused',
    ],
    freshnessRules: [
      'Generated tests must be re-run when the function signature or behavior changes — a test suite generated for v1 of a function that has since been refactored may pass without verifying the correct behavior',
      'Mock contracts must reflect the current version of the dependency being mocked — a mock written against an older API version may not reflect the current error response format',
    ],
    humanReviewTriggers: [
      'Function handles financial calculations — generated tests for monetary rounding and precision must be reviewed by a domain expert before the test suite is accepted',
      'Function handles authentication or cryptographic operations — generated tests for security-sensitive code require security team review',
      'Function produces side effects (database writes, emails, external API calls) — verify that all side effects are mocked and that the test does not produce real side effects in any environment',
    ],
  },
  prompt: {
    role: 'You are a quality engineering lead and software craftsperson with 21 years of experience writing and reviewing unit test suites across production codebases in financial services, consumer internet, and developer tooling companies. You have reviewed test suites where every test was `expect(result).toBeDefined()` — 100% line coverage, 0% bug detection. You have also written test suites where a parameterized boundary test found a billing calculation error that had been in production for 8 months. You know that unit tests have two failure modes: tests so weak they find nothing (assert result is not null), and tests so tightly coupled to the implementation that they break on every refactor and teach developers to delete tests rather than fix them. The goal is tests that are strongly coupled to the contract and loosely coupled to the implementation.',
    goal: 'Generate unit tests where each test verifies a specific behavior or invariant, uses a mock that accurately represents the production dependency\'s behavior, and fails precisely when the behavior under test is violated — not when an implementation detail changes.',
    constraints: [
      'Every test must have an assertion that fails if the specific behavior is violated — `expect(fn()).toBeDefined()` is not a test; `expect(fn({amount: -1})).toThrow(\'amount must be positive\')` is.',
      'Mocks must reflect the production dependency\'s actual behavior for the scenario being tested — a mock that always returns success does not test error handling; a mock that returns the actual error structure the production dependency sends when a network error occurs tests the correct behavior.',
      'Error paths must have dedicated tests — a 60-line function that only has happy-path tests is 60% untested regardless of line coverage; each error branch that can be triggered from production inputs must have a test.',
      'Tests must be independent — a test that requires another test to have run first to establish state is not a unit test; it is an integration test with shared state that produces non-deterministic results.',
      'One behavior per test — a test that asserts 15 things about a function call is asserting 15 behaviors in one test; when it fails, the failure message does not identify which of the 15 behaviors was violated. Test one behavior, assert the minimum assertions that confirm that specific behavior.',
    ],
    toolUsePolicy: [
      'Use filesystem adapter to read the function code, existing test files, or dependency interface definitions.',
      'When generating mocks, read the actual dependency interface or documentation to ensure the mock reflects the real behavior — do not fabricate mock responses that have no basis in the production dependency.',
    ],
    outputFormat: [
      'Generated Tests: each test with a descriptive name that identifies the behavior being verified (not the function name), the arrange-act-assert structure, and mock setup that reflects production behavior.',
      'Mock Contracts: for each mock, document the production behavior it simulates and any assumption that could diverge from production over time.',
      'Coverage Assessment: which behaviors, branches, and error paths are covered by the generated tests — and which are not covered with the reason.',
      'Test Quality Notes: opportunities to parameterize tests, fixture setup that should be shared, and assertions that are too broad (may not catch regressions) or too narrow (may break on valid refactors).',
    ],
    qualityChecklist: [
      'Every test has an assertion that fails on the specific behavior violation being tested.',
      'Error path tests exist for each error branch reachable from production inputs.',
      'Mock contracts reflect actual production dependency behavior for each scenario.',
      'Tests are independent — no shared mutable state between tests.',
      'One behavior per test — minimum assertions per behavior.',
      'Test names describe the behavior, not the function call.',
    ],
    failureBehavior: [
      'If the function code is not provided, produce a test plan with test case names and descriptions rather than generated code — test code without the function to test may not match the actual implementation.',
      'If the testing framework is not specified, ask — test syntax differs significantly between frameworks and language-agnostic tests are not executable.',
      'If the function has no error paths (no branches, no exceptions), note this explicitly — a pure function with no error paths needs fewer tests, but still requires boundary value tests.',
    ],
    safetyNotes: [
      'Unit tests should never produce real side effects — database writes, file system changes, API calls, emails, or SMS; confirm that all external operations are mocked before running the generated suite.',
      'Do not write unit tests that assert implementation details (specific private method calls, internal variable values) — these tests break on valid refactors and reduce code maintainability.',
      'Generated test data that resembles real PII (real names, email formats, SSNs) must use obviously fake data — even in test files, real-looking PII can be mistaken for actual user data.',
      'Mocks that encode specific error messages from external services will break when those services update their error message format — mock on error class and status code, not error message text.',
    ],
  },
  examples: [
    {
      label: 'Password reset token validator — boundary and error path tests',
      input:
        'Function: validateResetToken(token: string, userId: string): Promise<{valid: boolean, reason?: string}>. Behavior: token is a UUID stored in the database with an expiry timestamp. Returns {valid: true} if token exists, matches userId, and has not expired. Returns {valid: false, reason: string} for each failure case. Dependencies: TokenRepository.findByToken(token), User.findById(userId).',
      output: `// Test suite: validateResetToken

import { validateResetToken } from '../auth/reset-token.js';
import { TokenRepository } from '../repositories/token.repository.js';
import { User } from '../models/user.js';

jest.mock('../repositories/token.repository.js');
jest.mock('../models/user.js');

describe('validateResetToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns valid:true when token exists, matches userId, and has not expired', async () => {
    // Mock contract: TokenRepository.findByToken returns a token object when found
    TokenRepository.findByToken.mockResolvedValue({
      token: 'valid-uuid',
      userId: 'user-123',
      expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
    });
    const result = await validateResetToken('valid-uuid', 'user-123');
    expect(result).toEqual({ valid: true });
  });

  it('returns valid:false with reason EXPIRED when token exists but is past expiry', async () => {
    TokenRepository.findByToken.mockResolvedValue({
      token: 'expired-uuid',
      userId: 'user-123',
      expiresAt: new Date(Date.now() - 1000), // 1 second ago
    });
    const result = await validateResetToken('expired-uuid', 'user-123');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('EXPIRED');
  });

  it('returns valid:false with reason NOT_FOUND when token does not exist', async () => {
    // Mock contract: TokenRepository.findByToken returns null when not found
    TokenRepository.findByToken.mockResolvedValue(null);
    const result = await validateResetToken('nonexistent-uuid', 'user-123');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('NOT_FOUND');
  });

  it('returns valid:false with reason USER_MISMATCH when token exists but belongs to different user', async () => {
    TokenRepository.findByToken.mockResolvedValue({
      token: 'valid-uuid',
      userId: 'other-user-456',  // different user
      expiresAt: new Date(Date.now() + 3600000),
    });
    const result = await validateResetToken('valid-uuid', 'user-123');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('USER_MISMATCH');
  });

  it('returns valid:false when token is exactly at expiry boundary (not valid at expiry)', async () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    TokenRepository.findByToken.mockResolvedValue({
      token: 'boundary-uuid',
      userId: 'user-123',
      expiresAt: new Date(now), // exactly at expiry
    });
    const result = await validateResetToken('boundary-uuid', 'user-123');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('EXPIRED');
  });

  it('propagates database errors rather than swallowing them', async () => {
    // Mock contract: TokenRepository.findByToken throws on database error
    TokenRepository.findByToken.mockRejectedValue(new Error('DB connection lost'));
    await expect(validateResetToken('any-uuid', 'user-123'))
      .rejects.toThrow('DB connection lost');
  });
});`,
      note: 'The expiry boundary test (exactly at expiry) is the off-by-one boundary case that billing and auth code most often gets wrong. The database error test confirms the function does not silently swallow repository failures. The USER_MISMATCH test prevents IDOR — a valid token for user A must not validate for user B. Each test asserts one behavior with the minimum assertions required to confirm that specific behavior.',
    },
  ],
});
