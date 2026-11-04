/**
 * Live Skills integration tests.
 *
 * Covers:
 *   A. Skill.define() — Level 1 injection (name + description in system prompt)
 *   B. Skill.define() with instructions — Level 2 tool (load_skill_instructions)
 *   C. Skill.define() with files — Level 3 tool (load_skill_file)
 *   D. Skill.from() — loads from a temp directory containing SKILL.md
 *   E. Multiple skills attached — all visible in a single agent run
 *
 * Run with:
 *   INTEGRATION_TESTS=true AGENTCRAFT_LIVE_SKILLS=true \
 *   AGENTCRAFT_LIVE_PROVIDERS=openai \
 *   npm run test:int -- src/__tests__/integration/live-skills.test.ts
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { Agent } from '../../agent/agent.js';
import { Skill } from '../../agent/skills/skill.js';

const integrationEnabled = process.env.INTEGRATION_TESTS === 'true';
const skillsEnabled = process.env.AGENTCRAFT_LIVE_SKILLS === 'true';
const openAiKey = process.env.OPENAI_API_KEY;
const openAiEnabled = parseProviderSelection(process.env.AGENTCRAFT_LIVE_PROVIDERS).has('openai');
const liveIt = integrationEnabled && skillsEnabled && openAiEnabled && openAiKey ? it : it.skip;
const liveModel = process.env.AGENTCRAFT_LIVE_OPENAI_MODEL ?? 'gpt-4o-mini';
const maxTokens = Number.parseInt(process.env.AGENTCRAFT_LIVE_SKILLS_MAX_TOKENS ?? '160', 10);

const tmpDirs: string[] = [];

afterAll(async () => {
  for (const dir of tmpDirs) {
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
});

describe('live Skills smoke tests', () => {
  // ---------------------------------------------------------------------------
  // A. Level 1 — name + description injected into system prompt
  // ---------------------------------------------------------------------------
  liveIt(
    'Skill.define() injects skill name into the agent system context (Level 1)',
    async () => {
      const skill = Skill.define({
        name: 'summarize-briefly',
        description: 'Condenses any text to one sentence without losing the core idea.',
      });

      const agent = Agent.create({
        model: `openai:${liveModel}`,
        apiKey: openAiKey!,
        temperature: 0,
        maxTokens,
        retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
      }).use(skill);

      const response = await agent.run({
        prompt:
          'List the skills you have available by name. Reply with the skill name only, nothing else.',
        temperature: 0,
        maxTokens: 48,
      });

      expect(response.content.length).toBeGreaterThan(0);
      expect(response.content.toLowerCase()).toContain('summarize-briefly');
    },
    60_000,
  );

  // ---------------------------------------------------------------------------
  // B. Level 2 — load_skill_instructions tool available and callable
  // ---------------------------------------------------------------------------
  liveIt(
    'Skill.define() with instructions exposes load_skill_instructions tool (Level 2)',
    async () => {
      const instructions = 'Always structure output as: POINT 1, POINT 2, POINT 3. Never use bullets.';

      const skill = Skill.define({
        name: 'structured-output',
        description: 'Formats any response as exactly 3 numbered points.',
        instructions,
      });

      const agent = Agent.create({
        model: `openai:${liveModel}`,
        apiKey: openAiKey!,
        temperature: 0,
        maxTokens,
        toolSelection: 'auto',
        retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
      }).use(skill);

      const response = await agent.run({
        prompt:
          'Load the instructions for the structured-output skill, then apply them to list 3 benefits of caching.',
        temperature: 0,
        maxTokens,
      });

      expect(response.content.length).toBeGreaterThan(0);
      // The skill instructions should have been loaded and applied
      const toolCallNames = response.toolCalls?.map((tc) => tc.name) ?? [];
      const skillToolExposed = response.selection?.exposedTools?.includes('load_skill_instructions');
      expect(
        toolCallNames.includes('load_skill_instructions') || skillToolExposed,
        'load_skill_instructions was either called or exposed',
      ).toBe(true);
    },
    60_000,
  );

  // ---------------------------------------------------------------------------
  // C. Level 3 — load_skill_file tool available with reference files
  // ---------------------------------------------------------------------------
  liveIt(
    'Skill.define() with files exposes load_skill_file tool (Level 3)',
    async () => {
      const skill = Skill.define({
        name: 'style-guide',
        description: 'Applies house style rules when writing copy.',
        instructions: 'Before writing, load the tone.txt reference file for tone guidelines.',
        files: {
          'tone.txt': 'Tone guidelines: conversational, concise, active voice. Avoid jargon.',
        },
      });

      const agent = Agent.create({
        model: `openai:${liveModel}`,
        apiKey: openAiKey!,
        temperature: 0,
        maxTokens,
        toolSelection: 'auto',
        retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
      }).use(skill);

      const response = await agent.run({
        prompt:
          'You have the style-guide skill. Load the tone.txt file and confirm the tone you must use.',
        temperature: 0,
        maxTokens,
      });

      expect(response.content.length).toBeGreaterThan(0);
      const toolCallNames = response.toolCalls?.map((tc) => tc.name) ?? [];
      const fileToolExposed = response.selection?.exposedTools?.includes('load_skill_file');
      expect(
        toolCallNames.includes('load_skill_file') || fileToolExposed,
        'load_skill_file was either called or exposed',
      ).toBe(true);
      // The tone content should appear in the response
      expect(response.content.toLowerCase()).toMatch(/conversational|concise|active|tone/);
    },
    60_000,
  );

  // ---------------------------------------------------------------------------
  // D. Skill.from() — loads SKILL.md from a temp directory on disk
  //    Verifies Level 1 injection (name visible in system prompt) only.
  //    Level 2 instruction loading via load_skill_instructions is tested in B.
  // ---------------------------------------------------------------------------
  liveIt(
    'Skill.from() loads a SKILL.md from disk and injects the skill name into agent context',
    async () => {
      const dir = await mkdtemp(path.join(tmpdir(), 'agentcraft-skill-'));
      tmpDirs.push(dir);

      await writeFile(
        path.join(dir, 'SKILL.md'),
        [
          '---',
          'name: haiku-writer',
          'description: Writes traditional 5-7-5 haiku poems on any topic.',
          'version: 1',
          '---',
          '',
          'When writing haiku: count syllables carefully. First line: 5. Second: 7. Third: 5.',
        ].join('\n'),
        'utf8',
      );

      const skill = Skill.from(dir);

      const agent = Agent.create({
        model: `openai:${liveModel}`,
        apiKey: openAiKey!,
        temperature: 0,
        maxTokens: 64,
        retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
      }).use(skill);

      // Level 1 only: ask the agent to name the skill — no tool call required
      const response = await agent.run({
        prompt: 'List the skills you have available by name. Reply with the name only.',
        temperature: 0,
        maxTokens: 48,
      });

      expect(response.content.length).toBeGreaterThan(0);
      expect(response.content.toLowerCase()).toContain('haiku-writer');
    },
    60_000,
  );

  // ---------------------------------------------------------------------------
  // E. Multiple skills — both visible to a single agent
  // ---------------------------------------------------------------------------
  liveIt(
    'multiple Skill.define() adapters all inject into the same agent context',
    async () => {
      const skillA = Skill.define({
        name: 'tone-formal',
        description: 'Rewrites any text in a formal, professional tone.',
      });

      const skillB = Skill.define({
        name: 'tone-casual',
        description: 'Rewrites any text in a casual, friendly tone.',
      });

      const agent = Agent.create({
        model: `openai:${liveModel}`,
        apiKey: openAiKey!,
        temperature: 0,
        maxTokens,
        retry: { maxAttempts: 1, backoff: 'fixed', initialDelay: 100, maxDelay: 100 },
      }).use(skillA).use(skillB);

      const response = await agent.run({
        prompt: 'List all the skills you have available by name, one per line.',
        temperature: 0,
        maxTokens: 80,
      });

      expect(response.content.toLowerCase()).toContain('tone-formal');
      expect(response.content.toLowerCase()).toContain('tone-casual');
    },
    60_000,
  );
});

function parseProviderSelection(value: string | undefined): Set<string> {
  if (!value || value.trim() === '') return new Set(['openai']);
  const selected = value.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean);
  return selected.includes('all') ? new Set(['openai']) : new Set(selected);
}
