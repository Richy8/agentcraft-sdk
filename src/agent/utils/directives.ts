import { SkillNotAttachedError } from '../../errors/index.js';
import type { AgentAdapter } from '../adapters/types.js';
import type { AgentSkill } from '../skills/types.js';

export function preprocessDirectives(
  prompt: string,
  attachedAdapters: AgentAdapter[],
  options: {
    promptForSkill?: (skill: AgentSkill) => string | undefined;
  } = {},
): { processedPrompt: string; additionalSystemContent: string } {
  const directiveMap = new Map<string, AgentSkill>();
  for (const adapter of attachedAdapters) {
    if (isAgentSkill(adapter) && adapter.directive) {
      directiveMap.set(adapter.directive, adapter as AgentSkill);
    }
  }

  let processedPrompt = prompt;
  let additionalSystem = '';
  // Directives are explicit skill commands (`/write-blog`), not incidental
  // one-letter slash text such as "A/B test" or URL/path fragments.
  const directivePattern = /\/([a-z][a-z0-9-_]+)\b/gi;
  const closingTags: string[] = [];

  for (const match of [...prompt.matchAll(directivePattern)]) {
    if (isUntrustedDirectiveLine(prompt, match.index ?? 0)) continue;
    const directive = match[1]!.toLowerCase();
    const skill = directiveMap.get(directive);

    if (!skill) {
      throw new SkillNotAttachedError(
        `Directive "/${directive}" was used but no attached skill handles it. Did you forget to call .use(YourSkill.create())?`
      );
    }

    const tag = directive.toUpperCase().replace(/-/g, '_');
    processedPrompt = processedPrompt.replace(match[0], `[APPLY_${tag}_START]`);
    closingTags.unshift(`[APPLY_${tag}_END]`);

    const extension =
      options.promptForSkill?.(skill) ??
      (typeof skill.systemPromptExtension === 'function'
        ? skill.systemPromptExtension()
        : (skill.systemPromptExtension ?? ''));
    additionalSystem +=
      `\nWhen you see [APPLY_${tag}_START]...[APPLY_${tag}_END] sections, ` +
      `apply the following rules strictly within those boundaries:\n${extension}\n`;
  }

  if (closingTags.length > 0) {
    processedPrompt = `${processedPrompt.trimEnd()}\n${closingTags.join('\n')}`;
  }

  return { processedPrompt, additionalSystemContent: additionalSystem };
}

function isAgentSkill(adapter: AgentAdapter): adapter is AgentSkill {
  return 'type' in adapter && adapter.type === 'skill';
}

function isUntrustedDirectiveLine(prompt: string, matchIndex: number): boolean {
  const lineStart = prompt.lastIndexOf('\n', matchIndex) + 1;
  const lineEnd = prompt.indexOf('\n', matchIndex);
  const line = prompt.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
  return /^\s*(retrieved|external|tool output|page content|source)\b/i.test(line);
}
