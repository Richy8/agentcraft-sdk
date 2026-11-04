/**
 * Directive preprocessing — stub retained for compatibility.
 * The trait system has been removed; this module no longer processes
 * slash-command directives and simply returns the prompt unchanged.
 */
export function preprocessDirectives(
  prompt: string,
  _attachedAdapters: readonly object[],
  _options: object = {},
): { processedPrompt: string; additionalSystemContent: string } {
  return { processedPrompt: prompt, additionalSystemContent: '' };
}
