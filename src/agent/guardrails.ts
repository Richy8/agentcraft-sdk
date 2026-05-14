import type { ToolGuardrail } from './adapters/tool-policy.js';

const SECRET_PATTERNS = [
  /sk-[a-zA-Z0-9_-]{8,}/,
  /Bearer\s+[a-zA-Z0-9._-]+/,
  /api[_-]?key\s*[:=]/i,
  /password\s*[:=]/i,
  /secret\s*[:=]/i,
];

const PROMPT_INJECTION_PATTERNS = [
  /ignore (all )?(previous|prior|above) instructions/i,
  /disregard (all )?(previous|prior|above) instructions/i,
  /reveal (the )?(system|developer) prompt/i,
  /you are now/i,
];

export const blockSecretsGuardrail: ToolGuardrail = ({ args, result }) => {
  const text = stringify(args ?? result);
  return {
    allowed: !SECRET_PATTERNS.some((pattern) => pattern.test(text)),
    reason: 'possible secret detected',
  };
};

export const blockPromptInjectionGuardrail: ToolGuardrail = ({ args, result }) => {
  const text = stringify(args ?? result);
  return {
    allowed: !PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(text)),
    reason: 'possible prompt injection detected',
  };
};

export const blockUnsafeUrlGuardrail: ToolGuardrail = ({ args, result }) => {
  const text = stringify(args ?? result);
  const urls = text.match(/https?:\/\/[^\s"'<>]+/gi) ?? [];
  const unsafe = urls.some((url) => {
    try {
      const parsed = new URL(url);
      return ['localhost', '127.0.0.1', '0.0.0.0'].includes(parsed.hostname) || parsed.hostname.endsWith('.local');
    } catch {
      return false;
    }
  });
  return { allowed: !unsafe, reason: 'unsafe local URL detected' };
};

export const blockDestructiveActionGuardrail: ToolGuardrail = ({ tool }) => {
  return {
    allowed: tool.security?.sideEffect !== 'write' || tool.security.requiresConfirmation === true,
    reason: 'write-capable tools must require confirmation',
  };
};

export const blockPiiGuardrail: ToolGuardrail = ({ args, result }) => {
  const text = stringify(args ?? result);
  const hasPii =
    /\b\d{3}-\d{2}-\d{4}\b/.test(text) ||
    /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(text) ||
    /\b(?:\+?\d[\d\s().-]{8,}\d)\b/.test(text);
  return { allowed: !hasPii, reason: 'possible PII detected' };
};

function stringify(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
