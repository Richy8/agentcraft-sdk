import { SkillNotAttachedError } from '../../errors/index.js';
import type { AgentAdapter } from '../adapters/types.js';
import type { AgentSkill } from '../skills/types.js';

export function preprocessDirectives(
  prompt: string,
  attachedAdapters: AgentAdapter[]
): { processedPrompt: string; additionalSystemContent: string } {
  const directiveMap = new Map<string, AgentSkill>();
  for (const adapter of attachedAdapters) {
    if (isAgentSkill(adapter) && adapter.directive) {
      directiveMap.set(adapter.directive, adapter as AgentSkill);
    }
  }

  let processedPrompt = prompt;
  let additionalSystem = '';
  const directivePattern = /\/([a-z][a-z0-9-_]*)/gi;
  const closingTags: string[] = [];

  for (const match of [...prompt.matchAll(directivePattern)]) {
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
      typeof skill.systemPromptExtension === 'function'
        ? skill.systemPromptExtension()
        : (skill.systemPromptExtension ?? '');
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
