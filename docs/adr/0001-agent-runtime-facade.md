# ADR 0001: Agent as Runtime Facade

## Status

Accepted

## Context

`Agent` is the primary public entry point for running prompts, attaching skills,
tools, memory, cache, budgets, and observability. As features expanded, runtime
coordination and implementation details began to live in the same class.

## Decision

Keep `Agent` as the stable public facade, but move reusable runtime concerns into
focused internal modules and services. Public behavior should remain available
through `Agent.create()`, `.use()`, `.run()`, and `.stream()`.

## Consequences

- Public API stability is preserved while internals become easier to test.
- New runtime behavior should be added behind focused helpers before being wired
  into `Agent`.
- Refactors must be protected by characterization tests around run, stream, skill,
  cache, memory, budget, and tool behavior.
