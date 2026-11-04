# ADR 0003: Shared Tool Validation and Secret Patterns

## Status

Accepted

## Context

Tool argument validation and secret detection were needed by multiple layers:
provider tool loops, adapter-created tools, guardrails, and policy redaction.
Duplicated logic increases the chance that one layer accepts input another layer
rejects.

## Decision

Use shared tool-argument validation and shared secret-pattern definitions. Layers
may still choose their own error type or enforcement behavior, but the base
schema and detection rules should come from one place.

## Consequences

- Provider and adapter tool validation stay consistent.
- Redaction and guardrail detection can evolve together.
- Policy-specific decisions remain outside the shared utilities.
