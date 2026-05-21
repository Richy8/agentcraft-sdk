import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  BLOG_DOMAIN_SKILL_SPECS,
  CREATOR_DOMAIN_SKILL_SPECS,
  DOMAIN_SKILL_ARCHITECTURE_CATALOG,
  createSkillByName,
  listSkillSpecs,
} from '../index.js';
import { CREATOR_DOMAIN_SKILL_EVAL_FIXTURES } from './fixtures/creator-domain-skills-eval.js';

const expectedNames = [
  'blog-research',
  'blog-brief',
  'blog-writer',
  'blog-seo-review',
  'blog-fact-check',
  'blog-citation',
  'linkedin-audience-research',
  'linkedin-ideation',
  'linkedin-post-writer',
  'linkedin-hook-review',
  'linkedin-calendar',
  'youtube-topic-research',
  'youtube-scriptwriter',
  'youtube-retention-review',
  'youtube-thumbnail-brief',
  'resume-role-research',
  'resume-writer',
  'resume-ats-review',
  'resume-tailoring',
] as const;

describe('creator domain routine skills', () => {
  it('registers routine-specific creator skill specs with domain intelligence', () => {
    expect(CREATOR_DOMAIN_SKILL_SPECS.map((spec) => spec.name)).toEqual(expect.arrayContaining([...expectedNames]));
    expect(CREATOR_DOMAIN_SKILL_SPECS.length).toBeGreaterThan(expectedNames.length);
    expect(listSkillSpecs({ domain: 'creator' }).length).toBeGreaterThanOrEqual(CREATOR_DOMAIN_SKILL_SPECS.length);
    expect(createSkillByName('resume-writer').name).toBe('resume-writer');

    for (const spec of CREATOR_DOMAIN_SKILL_SPECS) {
      expect(spec.domain).toBe('creator');
      expect(spec.category).toBeTruthy();
      expect(spec.domainIntelligence?.vocabulary?.length).toBeGreaterThan(0);
      expect(spec.domainIntelligence?.artifacts?.produces?.length).toBeGreaterThan(0);
      expect(spec.domainIntelligence?.antiStuffingNotes?.length ?? 0).toBeGreaterThan(0);
    }
  });

  it('creates direct skills through the registry with structured production prompts', () => {
    for (const skillName of expectedNames) {
      const skill = createSkillByName(skillName);
      const prompt =
        typeof skill.systemPromptExtension === 'function'
          ? skill.systemPromptExtension()
          : skill.systemPromptExtension;

      expect(skill.name).toBe(skillName);
      expect(skill.skillMetadata?.promptVersion).toBe('2026-05-18');
      expect(prompt).toContain('## Tool Use Policy');
      expect(prompt).toContain('## Output Format');
      expect(prompt).toContain('Failure mode to avoid');
      expect(prompt).toContain('Do not');
    }
  });

  it('keeps researched prompt notes and eval fixtures tied to representative skills', () => {
    expect(CREATOR_DOMAIN_SKILL_EVAL_FIXTURES.map((fixture) => fixture.skill)).toEqual(
      expect.arrayContaining([...expectedNames]),
    );

    for (const fixture of CREATOR_DOMAIN_SKILL_EVAL_FIXTURES) {
      const skill = createSkillByName(fixture.skill);
      const prompt =
        typeof skill.systemPromptExtension === 'function'
          ? skill.systemPromptExtension()
          : skill.systemPromptExtension;

      for (const signal of fixture.expectedSignals) {
        expect(prompt.toLowerCase()).toContain(signal.toLowerCase());
      }
    }
  });

  it('keeps existing blog-writer compatibility while adding adjacent blog specs', () => {
    expect(BLOG_DOMAIN_SKILL_SPECS.map((spec) => spec.name)).toEqual(expect.arrayContaining([
      'blog-research',
      'blog-topic-research',
      'blog-serp-research',
      'blog-brief',
      'blog-seo-review',
      'blog-writer',
      'blog-fact-check',
      'blog-citation',
      'blog-refresh-review',
    ]));
  });

  it('keeps domain architecture modular instead of recreating prompt catalog dumps', () => {
    const domainFiles = listFiles(join(process.cwd(), 'src/agent/skills/domains'));
    const primitiveFiles = listFiles(join(process.cwd(), 'src/agent/skills/primitives'));
    const primitiveFactory = readFileSync(join(process.cwd(), 'src/agent/skills/primitives/primitive-skill-factory.ts'), 'utf8');
    const requiredTopLevel = [
      'core/prompt-template.ts',
      'core/define-skill.ts',
      'registries/skill-registry.ts',
      'registries/primitive.registry.ts',
      'registries/domain.registry.ts',
      'registries/pack.registry.ts',
      'domains/__catalog__/domain-catalog.ts',
      'domains/__catalog__/domains/creator.catalog.ts',
      'domains/__catalog__/domains/brand.catalog.ts',
      'domains/__catalog__/domains/marketing.catalog.ts',
      'domains/__shared__/routine-skill-factory.ts',
      'packs/creator/blog.pack.ts',
      'packs/brand/research.pack.ts',
      'packs/marketing/seo.pack.ts',
      'packs/finance/stock-research.pack.ts',
      'packs/product/prd.pack.ts',
      'packs/engineering/code-review.pack.ts',
    ];

    expect(domainFiles.filter((file) => file.endsWith('.skills.ts'))).toEqual([]);
    expect(domainFiles.filter((file) => file.endsWith('.skill.ts')).length).toBeGreaterThanOrEqual(37);
    expect(primitiveFiles.filter((file) => file.endsWith('.skill.ts')).length).toBeGreaterThanOrEqual(16);
    const skillsRoot = join(process.cwd(), 'src/agent/skills');
    expect(
      listFiles(skillsRoot).filter((file) => dirname(file) === skillsRoot && file.endsWith('.skill.ts')),
    ).toEqual([]);
    expect(primitiveFactory).toContain('createBuiltInSkill');
    expect(primitiveFactory).not.toContain('export const SKILL_SPECS =');
    for (const required of requiredTopLevel) {
      expect(existsSync(join(process.cwd(), 'src/agent/skills', required))).toBe(true);
    }
    expect(existsSync(join(process.cwd(), 'src/agent/skills/domains/domain-catalog.ts'))).toBe(false);
    expect(existsSync(join(process.cwd(), 'src/agent/skills/domains/routine-domain-skill-utils.ts'))).toBe(false);
    expect(existsSync(join(process.cwd(), 'src/agent/skills/domains/industry-skill-utils.ts'))).toBe(false);
    expect(existsSync(join(process.cwd(), 'src/agent/skills/domains/industry-pack-skills.ts'))).toBe(false);
    expect(readFileSync(join(process.cwd(), 'src/agent/skills/domains/__catalog__/domain-catalog.ts'), 'utf8')).toContain(
      '...CREATOR_DOMAIN_SKILL_CATEGORY_PLANS',
    );
    expect(DOMAIN_SKILL_ARCHITECTURE_CATALOG.map((entry) => entry.domain)).toEqual(
      expect.arrayContaining([
        'creator',
        'brand',
        'marketing',
        'business',
        'personal-productivity',
        'legal',
        'healthcare',
        'finance',
        'engineering',
        'support',
      ]),
    );
    expect(DOMAIN_SKILL_ARCHITECTURE_CATALOG.map((entry) => entry.domain)).not.toEqual(
      expect.arrayContaining([
        'agriculture',
        'tax-accounting',
        'banking-operations',
        'education',
        'hr',
        'insurance',
        'operations',
        'ecommerce',
        'security',
        'public-sector',
        'nonprofit',
        'real-estate',
        'travel-hospitality',
        'construction-architecture',
        'energy-utilities',
        'science-rd',
        'manufacturing',
        'logistics-supply-chain',
        'local-services',
        'restaurants-food-service',
        'sports-fitness',
        'beauty-fashion-lifestyle',
        'media-production',
        'audience',
      ]),
    );
    expect(
      DOMAIN_SKILL_ARCHITECTURE_CATALOG.filter((entry) => entry.domain === 'creator').map((entry) => entry.category),
    ).not.toEqual(
      expect.arrayContaining(['community', 'legacy', 'strategy', 'threads', 'reddit', 'review', 'operations']),
    );
    for (const entry of DOMAIN_SKILL_ARCHITECTURE_CATALOG) {
      expect(existsSync(join(process.cwd(), 'src/agent/skills/domains', entry.domain, entry.category))).toBe(true);
      expect(existsSync(join(process.cwd(), 'src/agent/skills/domains', entry.domain, entry.category, 'index.ts'))).toBe(
        true,
      );
    }
  });
});

function listFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) return listFiles(fullPath);
    return fullPath;
  });
}
