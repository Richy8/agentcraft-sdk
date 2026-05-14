# Security Policy

## Supported Versions

AgentCraft is pre-1.0. Security fixes are provided for the latest published
`0.x` version only.

| Version | Supported |
| ------- | --------- |
| 0.2.x   | Yes       |
| < 0.2   | No        |

## Reporting a Vulnerability

Please do not open public GitHub issues for suspected vulnerabilities.

Use GitHub private vulnerability reporting:

1. Go to the repository Security tab.
2. Select "Report a vulnerability".
3. Include affected versions, reproduction steps, impact, and any safe proof of
   concept.

If private vulnerability reporting is unavailable, contact
security@agentcraft.dev with the same details.

## Response Timeline

- Acknowledgement target: within 2 business days.
- Initial triage target: within 5 business days.
- Patch target: as soon as practical based on severity and exploitability.
- Disclosure: coordinated after a fix is available, unless active exploitation
  requires faster public guidance.

## Out of Scope

The following are not considered security vulnerabilities by themselves:

- Pricing estimator inaccuracies without an exploitable security impact.
- Provider model quality issues or hallucinations.
- Prompt outputs that are undesirable but do not bypass configured policies.
- Denial-of-wallet scenarios caused by intentionally disabled budgets or cache.
- Reports requiring access to API keys, tokens, or accounts you do not own.

Security-sensitive reports involving prompt injection, tool authorization,
secret leakage, unsafe write actions, or cross-tenant data exposure are in scope.
