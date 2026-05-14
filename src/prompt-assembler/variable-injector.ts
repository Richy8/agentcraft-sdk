import { PromptAssemblyError } from './errors.js';
import type { InjectionResult } from './config-injector.js';

const VARIABLE_PATTERN = /\{\{\s*(?!config\.|include\s)([A-Za-z_][A-Za-z0-9_.-]*)\s*\}\}/g;

/**
 * Replaces {{var}} placeholders. Arrays are formatted as markdown bullet lists
 * (`- item\n- item`). Other objects are JSON-serialised.
 */
export function injectVariables(
  content: string,
  vars: Record<string, unknown> = {},
  strict = false
): InjectionResult {
  const unresolved = new Set<string>();
  let count = 0;

  const next = content.replace(VARIABLE_PATTERN, (match, name: string) => {
    if (!(name in vars)) {
      unresolved.add(name);
      return match;
    }

    count++;
    return formatVariable(vars[name]);
  });

  if (strict && unresolved.size > 0) {
    throw new PromptAssemblyError(
      `Unresolved prompt variables: ${Array.from(unresolved).join(', ')}`
    );
  }

  return { content: next, count };
}

function formatVariable(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((item) => `- ${String(item)}`).join('\n');
  }
  if (typeof value === 'string') return value;
  if (value === null || typeof value !== 'object') return String(value);
  return JSON.stringify(value);
}
