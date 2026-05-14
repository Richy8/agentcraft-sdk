# AgentCraft Creator Certification

Generated: 2026-05-11

## Status Labels

- `local-covered`: deterministic mocked or fixture-backed tests pass.
- `live-read-certified`: safe live read test has passed with configured credentials.
- `live-discovery-certified`: live integration starts and discovers tools.
- `live-write-certified`: write path passed in a sandbox with cleanup.
- `blocked-missing-key`: live key is unavailable.
- `blocked-missing-sandbox`: provider needs a safe sandbox account.
- `blocked-provider-limitation`: provider API does not support the target behavior.

## Current Creator Coverage

- Creator skill catalog: `local-covered`.
- Creator packs: `local-covered`.
- Artifact store: `local-covered`.
- Citation manager: `local-covered`.
- Link checker: `local-covered`.
- SEO adapter contract: `local-covered`.
- Creator resources adapter: `local-covered`.
- Durable creator memory store: `local-covered`.
- Publishing adapter safety: `local-covered`; live writes remain blocked until sandbox fixtures exist.
- Analytics adapter contract: `local-covered`; live analytics remains blocked until sandbox accounts exist.
- Analytics history store: `local-covered`.
- Tavily live research smoke: implemented and env-gated; latest local check skipped because no configured `TAVILY_API_KEY` was available to the integration runner.
- External local skill loading: `local-covered`.
- External GitHub skill loading: implemented with pinned refs; live network test is opt-in.

## Release Gate

The local certification suite is the standard unit, example, build, and export smoke suite:

```sh
npm run typecheck
npm test
npm run examples:check
npm run build
npm run exports:smoke
```
