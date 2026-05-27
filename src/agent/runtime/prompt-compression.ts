import type { PromptCompressionMode } from '../types.js';

export function compressPromptSystem(
  system: string,
  mode: PromptCompressionMode
): string {
  if (mode === 'none') return system;
  const minified = minifyLines(system);
  if (mode === 'aggressive') return minified.replace(/\n{2,}/g, '\n');
  return minified;
}

function minifyLines(value: string): string {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .replace(/[ \t]{2,}/g, ' ');
}
