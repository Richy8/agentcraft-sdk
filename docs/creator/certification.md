# Creator Certification

Creator certification records what is locally tested, live-tested, blocked, or intentionally gated.

## Status Labels

| Label                      | Meaning                                |
| -------------------------- | -------------------------------------- |
| `local-covered`            | Deterministic unit/fixture tests pass. |
| `live-read-certified`      | Safe live read has passed.             |
| `live-discovery-certified` | Server starts and exposes tools.       |
| `live-write-certified`     | Sandbox write and cleanup passed.      |
| `blocked-missing-key`      | Needs credentials.                     |
| `blocked-missing-sandbox`  | Needs sandbox resources.               |

## Local Certification

```sh
npm run typecheck
npm test
npm run examples:check
npm run build
npm run exports:smoke
```
