import { describe, expect, it } from 'vitest';
import { preprocessDirectives } from '../../utils/directives.js';
import {
  CREATOR_DOMAIN_SKILL_SPECS,
  CreatorPacks,
  createSkillByName,
  inspectSkillByName,
  listSkillInspections,
} from '../index.js';

describe('creator skills', () => {
  it('registers creator domain skills through the unified registry', () => {
    expect(CREATOR_DOMAIN_SKILL_SPECS.length).toBeGreaterThan(80);
    expect(new Set(CREATOR_DOMAIN_SKILL_SPECS.map((spec) => spec.name)).size).toBe(
      CREATOR_DOMAIN_SKILL_SPECS.length,
    );

    const blogWriter = createSkillByName('blog-writer');
    const prompt =
      typeof blogWriter.systemPromptExtension === 'function'
        ? blogWriter.systemPromptExtension()
        : blogWriter.systemPromptExtension;

    expect(blogWriter.name).toBe('blog-writer');
    expect(blogWriter.skillMetadata?.domain).toBe('creator');
    expect(blogWriter.skillMetadata?.category).toBe('blog');
    expect(blogWriter.skillMetadata?.domainIntelligence?.vocabulary.length).toBeGreaterThan(0);
    expect(prompt).toContain('## Tool Use Policy');
    expect(prompt).toContain('## Output Format');
    expect(prompt).toContain('Failure mode to avoid');
  });

  it('exposes sanitized creator skill inspection without raw prompt leakage', () => {
    const inspection = inspectSkillByName('blog-writer');
    const allCreatorInspections = listSkillInspections({ domain: 'creator' });

    expect(allCreatorInspections.map((item) => item.name)).toContain('youtube-thumbnail-brief');
    expect(inspection.domain).toBe('creator');
    expect(inspection.category).toBe('blog');
    expect(inspection.capabilityHints?.minimumInput.length).toBeGreaterThan(0);
    expect(inspection.capabilityHints?.toolsAndDataSources.length).toBeGreaterThan(0);
    expect(JSON.stringify(inspection)).not.toContain('## Role');
    expect(JSON.stringify(inspection)).not.toContain('domainIntelligence');
  });

  it('lets packs expose direct skills without stale creator classes', () => {
    const blog = CreatorPacks.blog();
    const youtube = CreatorPacks.youtube();

    expect(blog.manifest.skills).toContain('blog-research');
    expect(blog.manifest.skills).toContain('blog-writer');
    expect(blog.blogWriter.create().name).toBe('blog-writer');
    expect(blog.blogResearch.create().skillMetadata?.requiredAdapters).toContain('tavily');
    expect(youtube.manifest.skills).toContain('youtube-thumbnail-brief');
    expect(youtube.youtubeThumbnailBrief.create().name).toBe('youtube-thumbnail-brief');
  });

  it('preserves directive preprocessing for direct registry-created skills', () => {
    const blogWriter = createSkillByName('blog-writer');
    const result = preprocessDirectives('/write-blog Write a Medium article.', [blogWriter]);

    expect(result.processedPrompt).toContain('[APPLY_WRITE_BLOG_START]');
    expect(result.processedPrompt).toContain('[APPLY_WRITE_BLOG_END]');
    expect(() => preprocessDirectives('/missing nope', [blogWriter])).toThrow('no attached skill handles it');
  });
});
