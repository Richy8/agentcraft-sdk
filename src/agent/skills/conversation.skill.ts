import type { AgentRunParams } from '../types.js';
import { defineSkill } from './types.js';
import { SKILL_SPECS, skillMetadata } from './catalog.js';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ConversationSkillOptions {
  maxHistory?: number;
}

export class ConversationSkill {
  static readonly skillName = 'conversation';

  static create(options: ConversationSkillOptions = {}) {
    const history = new Map<string, Message[]>();
    let warned = false;
    let lastSessionId = 'default';
    const maxHistory = options.maxHistory ?? 20;

    return defineSkill({
      name: SKILL_SPECS.conversation.name,
      description: SKILL_SPECS.conversation.description,
      directive: SKILL_SPECS.conversation.directive,
      requires: SKILL_SPECS.conversation.requires,
      metadata: skillMetadata(SKILL_SPECS.conversation),
      prompt: SKILL_SPECS.conversation.prompt,
      onBeforeRun: (params: AgentRunParams) => {
        if (!warned) {
          console.warn('[agentcraft:conversation] No persistent conversation adapter detected; using in-process history.');
          warned = true;
        }
        const sessionId = String(params.vars?.sessionId ?? 'default');
        lastSessionId = sessionId;
        const turns = history.get(sessionId) ?? [];
        history.set(sessionId, [...turns, { role: 'user' as const, content: params.prompt ?? '' }].slice(-maxHistory));
        if (turns.length === 0) return params;

        const context = turns
          .map((message) => `${message.role.toUpperCase()}: ${message.content}`)
          .join('\n');
        return {
          ...params,
          system: [params.system, `Prior conversation history for this session:\n${context}`].filter(Boolean).join('\n\n'),
        };
      },
      onAfterRun: (response) => {
        const turns = history.get(lastSessionId) ?? [];
        history.set(lastSessionId, [...turns, { role: 'assistant' as const, content: response.content }].slice(-maxHistory));
        return response;
      },
      onAfterStream: (_chunks, response) => {
        const turns = history.get(lastSessionId) ?? [];
        history.set(lastSessionId, [...turns, { role: 'assistant' as const, content: response.content }].slice(-maxHistory));
        return response;
      },
    });
  }
}
