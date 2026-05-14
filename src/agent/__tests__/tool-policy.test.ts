import { describe, expect, it, vi } from 'vitest';
import { mergeToolPolicies } from '../adapters/tool-policy.js';

describe('mergeToolPolicies', () => {
  it('deduplicates array fields across repeated merges', () => {
    const guardrail = vi.fn(() => ({ allowed: true }));
    const secretPattern = /token/i;
    const first = mergeToolPolicies(
      {
        approvedTools: ['read'],
        inputGuardrails: [guardrail],
        outputGuardrails: [guardrail],
        secretPatterns: [secretPattern],
      },
      {
        approvedTools: ['read', 'write'],
        inputGuardrails: [guardrail],
        outputGuardrails: [guardrail],
        secretPatterns: [/token/i],
      },
    );
    const second = mergeToolPolicies(first, {
      approvedTools: ['read'],
      inputGuardrails: [guardrail],
      outputGuardrails: [guardrail],
      secretPatterns: [secretPattern],
    });

    expect(second?.approvedTools).toEqual(['read', 'write']);
    expect(second?.inputGuardrails).toHaveLength(1);
    expect(second?.outputGuardrails).toHaveLength(1);
    expect(second?.secretPatterns).toHaveLength(1);
  });
});
