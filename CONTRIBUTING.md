# Contributing to AgentCraft

Thanks for helping improve AgentCraft. This project aims to stay small enough to understand and strong enough to trust in production.

## Prerequisites

- Node.js 20 or newer.
- npm with lockfile installs.
- A local clone of the repository.

Install dependencies:

```sh
npm ci
```

## Local Checks

Run unit tests. These are mocked and do not require API keys:

```sh
npm test
```

Run the TypeScript checker:

```sh
npm run typecheck
```

Run the full release gate before opening a pull request:

```sh
npm run release:check
```

## Live Integration Tests

Live tests are opt-in because they call paid provider APIs.

1. Copy `.env.example` to `.env`.
2. Add the provider keys needed for the test you are running.
3. Enable the integration gate explicitly.

```sh
INTEGRATION_TESTS=true npm run test:int:light
```

Use the light test first. Full live tests can call several providers, adapters, and MCPs.

## Coding Conventions

- Follow the static factory style already used in the public API: `Agent.create()`, `AgentWorkspace.create()`, `AgentWorkflow.create()`. Do not introduce public constructors that require `new`.
- Keep source imports ESM-compatible with `.js` extensions.
- Prefer existing helpers, adapters, skills, and local patterns before adding a new abstraction.
- Add comments only when they explain intent, risk, or a non-obvious tradeoff.
- Treat prompt, file, browser, MCP, retrieval, and tool inputs as untrusted.
- Keep docs config tables to four columns.
- Use `ts` for TypeScript code fences in docs, not `typescript`.

## Pull Request Process

1. Fork the repository.
2. Create a focused branch.
3. Implement the change with tests and docs where appropriate.
4. Run `npm run release:check`.
5. Open a pull request against `main`.

## Commit Style

Use present-tense imperative commit messages:

- `Add workspace cache propagation`
- `Fix artifact registry cleanup`
- `Remove stale example import`

Avoid past-tense messages such as `Added` or `Fixed`.

## Questions

Use GitHub Discussions for design questions, usage help, and roadmap proposals:

https://github.com/agentcraft-ai/agentcraft/discussions
