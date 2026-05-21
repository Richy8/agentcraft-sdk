import { describe, expect, it } from 'vitest';
import { CREATOR_DOMAIN_SKILL_SPECS, createSkillByName, listSkillSpecs } from '../index.js';

const plannedCreatorSkillNames = [
  'blog-topic-research',
  'blog-serp-research',
  'blog-brief',
  'blog-writer',
  'blog-seo-review',
  'blog-fact-check',
  'blog-citation',
  'blog-refresh-review',
  'medium-audience-research',
  'medium-story-angle',
  'medium-article-writer',
  'medium-title-subtitle-review',
  'medium-publication-fit-review',
  'linkedin-audience-research',
  'linkedin-ideation',
  'linkedin-post-writer',
  'linkedin-carousel-brief',
  'linkedin-hook-review',
  'linkedin-calendar',
  'linkedin-performance-review',
  'x-topic-research',
  'x-post-writer',
  'x-thread-writer',
  'x-hook-review',
  'x-community-reply-writer',
  'x-trend-risk-review',
  'facebook-audience-research',
  'facebook-post-writer',
  'facebook-group-post-writer',
  'facebook-adjacent-content-review',
  'facebook-community-engagement-planner',
  'pinterest-keyword-research',
  'pinterest-pin-title-description-writer',
  'pinterest-board-planner',
  'pinterest-visual-brief',
  'pinterest-seasonality-review',
  'instagram-caption-writer',
  'instagram-carousel-brief',
  'instagram-reel-scriptwriter',
  'instagram-hashtag-review',
  'instagram-visual-direction',
  'snapchat-story-planner',
  'snapchat-short-copywriter',
  'snapchat-ar-filter-brief',
  'snapchat-youth-safety-review',
  'tiktok-trend-research',
  'tiktok-hook-writer',
  'tiktok-scriptwriter',
  'tiktok-shot-list',
  'tiktok-retention-review',
  'tiktok-safety-review',
  'youtube-topic-research',
  'youtube-title-thumbnail-brief',
  'youtube-scriptwriter',
  'youtube-retention-review',
  'youtube-chapter-writer',
  'youtube-description-tags-writer',
  'youtube-community-post-writer',
  'short-video-ideation',
  'short-video-scriptwriter',
  'short-video-shot-list',
  'short-video-caption-writer',
  'short-video-platform-adapter',
  'podcast-topic-research',
  'podcast-outline-writer',
  'podcast-interview-question-writer',
  'podcast-show-notes-writer',
  'podcast-clip-repurposing',
  'newsletter-audience-research',
  'newsletter-issue-planner',
  'newsletter-writer',
  'newsletter-subject-line-review',
  'newsletter-sponsorship-copy-review',
  'substack-positioning',
  'substack-issue-writer',
  'substack-paid-free-strategy',
  'substack-community-thread-writer',
  'substack-retention-review',
  'book-positioning',
  'book-outline-writer',
  'book-chapter-writer',
  'book-continuity-review',
  'book-developmental-edit',
  'book-citation-review',
  'course-audience-research',
  'course-curriculum-planner',
  'course-lesson-writer',
  'course-exercise-generator',
  'course-learning-outcome-review',
  'webinar-topic-research',
  'webinar-outline-writer',
  'webinar-slide-brief',
  'webinar-promo-copywriter',
  'webinar-followup-sequence',
  'resume-role-research',
  'resume-writer',
  'resume-ats-review',
  'resume-tailoring',
  'cover-letter-writer',
  'linkedin-profile-optimizer',
] as const;

describe('full creator domain skill surface', () => {
  it('exports and registers every planned active creator skill', () => {
    const names = CREATOR_DOMAIN_SKILL_SPECS.map((spec) => spec.name);
    const registered = listSkillSpecs({ domain: 'creator' }).map((spec) => spec.name);

    expect(names).toEqual(expect.arrayContaining([...plannedCreatorSkillNames]));
    expect(registered).toEqual(expect.arrayContaining([...plannedCreatorSkillNames]));
    expect(new Set(names).size).toBe(names.length);
  });

  it('keeps generated creator prompts domain-aware and directly creatable', () => {
    for (const skillName of [
      'medium-article-writer',
      'x-thread-writer',
      'tiktok-shot-list',
      'podcast-show-notes-writer',
      'book-continuity-review',
      'cover-letter-writer',
    ]) {
      const skill = createSkillByName(skillName);
      const prompt =
        typeof skill.systemPromptExtension === 'function'
          ? skill.systemPromptExtension()
          : skill.systemPromptExtension;

      expect(skill.name).toBe(skillName);
      expect(skill.skillMetadata?.promptVersion).toBe('2026-05-18');
      expect(prompt).toContain('Tool Use Policy');
      expect(prompt).toContain('Output Format');
      expect(prompt).toContain('Failure mode to avoid');
      expect(prompt).toMatch(/Do not|platform|transcript|source/i);
    }
  });
});
