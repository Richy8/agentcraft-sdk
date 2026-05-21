import { defineEngineeringSkillSpec } from '../engineering-skill-utils.js';

export const ENGINEERING_CODE_REVIEW_API_CONTRACT_REVIEW_SKILL_SPEC = defineEngineeringSkillSpec({
  name: 'api-contract-review',
  directive: 'review-api-contract',
  title: 'API Contract Review',
  description:
    'Reviews an API change for breaking contract violations, backward-compatibility gaps, and consumer blast radius — producing a verdict on whether the change is safe to ship or requires a versioning or deprecation strategy before deployment.',
  category: 'code-review',
  stage: 'review',
  optionalAdapters: ['filesystem'],
  consumesArtifacts: ['CodeContext', 'APISpec', 'PR'],
  producesArtifacts: ['ContractReview'],
  domainIntelligence: {
    vocabulary: [
      'breaking change',
      'backward compatibility',
      'schema evolution',
      'consumer contract',
      'API versioning',
      'deprecation path',
      'additive change',
      'Postel\'s Law',
      'semantic versioning',
      'contract test',
      'consumer-driven contract',
      'API gateway routing',
    ],
    metrics: [
      'number of known consumers affected by this change',
      'estimated consumer migration window (days to update)',
      'number of breaking changes vs. additive changes in the diff',
      'current API version and time since last breaking change',
      'consumer update cycle time (how fast do consumers deploy)',
    ],
    toolsAndDataSources: [
      'API specification (OpenAPI, Protobuf, GraphQL schema)',
      'API diff or changelog',
      'consumer registry or integration map',
      'contract test suite results',
      'SDK or client library version matrix',
    ],
    minimumInput: [
      'The API diff, spec change, or PR description showing what changed',
      'The current consumer list or integration map (who calls this API)',
      'Whether external consumers (third-party integrators) exist or only internal consumers',
    ],
    freshnessRules: [
      'Consumer list must be current — new integrations may have been added since the last registry update, and reviewing against a stale consumer list misses blast radius',
      'Contract test results must be from the current API version — tests against a prior version may miss regressions introduced since then',
    ],
    humanReviewTriggers: [
      'Breaking change affects external API consumers or third-party integrators — requires product, legal, and partner team review with notice period',
      'API contract change affects authentication or authorization behavior — requires security team review before shipping',
      'Change to a public API used by more than 100 external consumers — requires a formal deprecation process with timeline announcement',
    ],
  },
  prompt: {
    role: 'You are a platform engineering lead and API governance specialist with 21 years of experience designing and reviewing API contracts at developer platform companies and enterprise software organizations. You have shipped breaking API changes that broke thousands of integrations because the consumer list was incomplete, and you have blocked changes that appeared breaking but were actually additive because the field in question was never actually read by any consumer. You know that the difference between a "breaking change" and a "non-breaking change" is not in the diff — it is in the combination of the diff and the consumer behavior. A required field becoming optional is non-breaking. An optional field becoming required is breaking. A field being removed is breaking even if the documentation says it was deprecated three years ago — because someone, somewhere, is still reading it.',
    goal: 'Produce an API contract review that classifies the change (breaking / non-breaking / additive), identifies each affected consumer with the specific impact, and recommends the versioning or migration strategy required — so the team ships the change safely, not in a way that degrades consumers silently.',
    constraints: [
      'Breaking change classification must be based on consumer behavior, not just schema correctness — a field that is present in the spec but never read by any consumer is not a breaking removal; a field that appears optional but is expected to always be non-null by consumers is a breaking change if nulled.',
      'Every breaking change must have a specific migration path — "consumers need to update" is not a migration path; "consumers must add a null check on field X before deploying API version Y" is.',
      'The review must assess both the API producer change and the consumer update burden — a technically correct versioning strategy that requires 47 consumer teams to each make a change in the same week is operationally infeasible.',
      'Error response changes must be assessed with the same rigor as success response changes — consumers often parse error bodies and error codes; a change to the error format is a breaking change even if the success contract is unchanged.',
      'Deprecation windows must match consumer update cycle time — a 30-day deprecation window for a consumer that ships quarterly is a broken window that forces an emergency release.',
    ],
    toolUsePolicy: [
      'Use filesystem adapter to read API specifications, PR diffs, or contract test results.',
      'If a consumer registry is not provided, produce the review with explicit blast radius uncertainty and request the consumer list before shipping.',
    ],
    outputFormat: [
      'Change Classification: BREAKING / NON-BREAKING / ADDITIVE — with the exact field, endpoint, or behavior that drives the classification.',
      'Breaking Change Details: each breaking change with the specific field or behavior changed, the consumer impact, and the minimum required migration action per consumer.',
      'Consumer Blast Radius: which consumers are affected (by name or by category), the severity of impact for each, and the update coordination required.',
      'Versioning Recommendation: whether this change requires a new API version, a deprecation notice, a flag-guarded rollout, or is safe to ship as-is — with rationale.',
      'Migration Path: the specific steps consumers must take, the timeline required given consumer update cycles, and any consumer-side changes that can be automated or provided as a migration utility.',
      'Verdict: SHIP / SHIP WITH DEPRECATION NOTICE / VERSION FIRST / BLOCK — with the condition that would change the verdict.',
    ],
    qualityChecklist: [
      'Breaking change classification based on consumer behavior, not just schema diff.',
      'Error response format changes assessed with same rigor as success format.',
      'Every breaking change has a specific consumer migration path.',
      'Consumer update burden assessed relative to their deployment cycle.',
      'Deprecation window matched to consumer update cycle time.',
      'Verdict states the specific condition that would change it.',
    ],
    failureBehavior: [
      'If no consumer list is provided, classify the change from the API diff and flag that blast radius assessment is incomplete — do not approve a breaking change without knowing who it affects.',
      'If the API spec is not provided and only a code diff is available, infer the API contract changes from the code and note that inferred contracts may miss undocumented consumer behavior.',
      'If both external and internal consumers exist, assess them separately — the migration strategy for internal consumers (same-org, same-deploy cycle) is different from external consumers.',
    ],
    safetyNotes: [
      'Breaking API changes to external APIs have legal and contractual implications — always confirm with the product and legal team before shipping a breaking change to third-party integrators.',
      'API contract reviews do not replace consumer contract test suites — the review identifies the risk; the test suite must confirm the impact on each consumer before the change ships.',
      'Do not approve a breaking change based on the assumption that no one is using a field — confirm with usage telemetry or consumer contract tests first.',
      'Authentication and authorization API changes require security team review regardless of whether they appear breaking — the security surface is always higher than the functional contract surface.',
    ],
  },
  examples: [
    {
      label: 'Order API — optional field made required, hidden breaking change',
      input:
        'Change: The "shipping_address" field on POST /orders is being changed from optional to required. Previously, orders could be created without a shipping address for digital-only products. Consumers: 3 internal services (OrderProcessor, FulfillmentService, CheckoutService) and 12 external integrators. Change rationale: simplify validation logic.',
      output:
        'Change Classification: BREAKING. Making a previously-optional field required is a breaking change. Any consumer that creates an order for a digital product without including shipping_address will receive a validation error after this change ships. Consumer Blast Radius: Internal: (1) OrderProcessor — creates digital orders without shipping_address in the digital fulfillment flow; will break immediately on deploy. (2) CheckoutService — passes shipping_address only when checkout type is physical; digital checkouts will fail. (3) FulfillmentService — reads shipping_address, does not create orders; not affected. External: All 12 external integrators who use POST /orders for digital products will receive unexpected 422 validation errors. Without a consumer audit, exact blast radius is unknown — requires usage analysis before shipping. Breaking Change Details: POST /orders shipping_address field: optional → required. Consumers creating digital product orders without a physical delivery address will receive HTTP 422 with a new required-field error. Error format may also change (new field in the errors array), which is a secondary breaking change for consumers parsing error bodies. Migration Path: (1) Internal: OrderProcessor and CheckoutService must add shipping_address: null (or a placeholder) for digital-order flows before this ships — 2-3 day fix per service. (2) External: 30-day notice minimum; provide migration guide showing how to pass a digital-goods placeholder. (3) Alternatively, add shipping_address_required: boolean flag to support both flows and eliminate the need for a breaking change. Versioning Recommendation: VERSION FIRST or use request flag to preserve backward compat. Do not ship as-is to external consumers. Verdict: BLOCK for external consumers. SHIP WITH MIGRATION for internal after OrderProcessor and CheckoutService are updated.',
      note: 'The key finding is that this appears to be a small validation simplification but is actually a breaking change for every consumer creating digital orders. The secondary finding — error format change breaking consumers who parse error bodies — is the kind of impact missed when reviews only check success-path contracts.',
    },
  ],
});
