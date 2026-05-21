import { describe, expect, it } from 'vitest';
import {
  CREATOR_DOMAIN_SKILL_SPECS,
  createSkillByName,
  scoreSkillSpecQuality,
} from '../index.js';
import type { AgentSkill } from '../types.js';

const representativeCreatorSkills = [
  'blog-writer',
  'book-chapter-writer',
  'linkedin-post-writer',
  'medium-article-writer',
  'newsletter-writer',
  'podcast-show-notes-writer',
  'resume-writer',
  'short-video-scriptwriter',
  'substack-issue-writer',
  'tiktok-scriptwriter',
  'youtube-scriptwriter',
] as const;

describe('skill production quality benchmark contracts', () => {
  it('covers the expanded creator surface with spec-backed skills instead of stale classes', () => {
    expect(CREATOR_DOMAIN_SKILL_SPECS.length).toBeGreaterThan(80);
    expect(new Set(CREATOR_DOMAIN_SKILL_SPECS.map((spec) => spec.name)).size).toBe(
      CREATOR_DOMAIN_SKILL_SPECS.length,
    );
    expect(CREATOR_DOMAIN_SKILL_SPECS.map((spec) => spec.name)).toEqual(
      expect.arrayContaining([...representativeCreatorSkills]),
    );
  });

  it('proves skill-enhanced prompts add domain guidance beyond a plain prompt', () => {
    for (const skillName of representativeCreatorSkills) {
      const spec = CREATOR_DOMAIN_SKILL_SPECS.find((item) => item.name === skillName)!;
      const skill = createSkillByName(skillName);
      const prompt = promptFor(skill);
      const flatPrompt = `Help me with ${spec.category}.`;

      expect(prompt.length).toBeGreaterThan(flatPrompt.length + 1_000);
      expect(prompt).toContain('## Quality Checklist');
      expect(prompt).toContain('## Safety Notes');
      expect(prompt).toContain('Failure mode to avoid');
      expect(prompt.toLowerCase()).toContain(spec.category.toLowerCase());
      expect(prompt).toMatch(/evidence|source|proof|assumption|verify/i);
    }
  });

  it('keeps creator prompt sizes within a deliberate long-form skill envelope', () => {
    for (const skillName of representativeCreatorSkills) {
      const prompt = promptFor(createSkillByName(skillName));

      expect(prompt.length).toBeGreaterThan(1_400);
      expect(prompt.length).toBeLessThanOrEqual(10_000);
    }
  });

  it('anchors high-variance creator skills to behavioral personas and platform mechanics', () => {
    const expectations = [
      ['blog-writer', ['specificity over coverage', 'reader', 'generic']],
      ['linkedin-post-writer', ['LinkedIn', 'specificity', 'professional']],
      ['tiktok-scriptwriter', ['TikTok', 'retention', 'visual']],
      ['youtube-scriptwriter', ['YouTube', 'retention', 'thumbnail']],
      ['resume-writer', ['ATS', 'achievement', 'role']],
    ] as const;

    for (const [skillName, signals] of expectations) {
      const prompt = promptFor(createSkillByName(skillName));
      for (const signal of signals) {
        expect(prompt.toLowerCase()).toContain(signal.toLowerCase());
      }
    }
  });

  it('keeps representative creator skills above the production quality threshold', () => {
    for (const skillName of representativeCreatorSkills) {
      const spec = CREATOR_DOMAIN_SKILL_SPECS.find((item) => item.name === skillName)!;
      const score = scoreSkillSpecQuality(spec);

      expect(
        score.score,
        `${spec.name} scored ${score.score}/${score.maxScore}; missing ${score.missingSignals.join(', ')}`,
      ).toBeGreaterThanOrEqual(95);
    }
  });
});

function promptFor(skill: AgentSkill): string {
  const prompt =
    typeof skill.systemPromptExtension === 'function'
      ? skill.systemPromptExtension()
      : skill.systemPromptExtension;
  if (!prompt) throw new Error(`Skill '${skill.name}' has no prompt`);
  return prompt;
}
