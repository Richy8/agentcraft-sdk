# ADR 0002: Cache Policy Boundaries

## Status

Accepted

## Context

AgentCraft supports memory, file, Redis, Postgres, SQLite, and custom cache
controllers. Cache eligibility decisions were previously embedded in agent
execution code, making tool replay policy harder to reason about.

## Decision

Cache backend controllers remain behind the `AgentCache` factory, while
cache-policy decisions that the runtime needs are extracted into focused helpers.

## Consequences

- Tool replay safety can be tested without constructing a full agent.
- New cache backends should implement `AgentCacheController` instead of changing
  agent execution logic.
- Side-effect and sensitivity checks stay centralized before cached tool results
  are trusted.
