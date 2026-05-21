import type { DomainSkillCategoryPlan } from '../types.js';

export const CREATOR_DOMAIN_SKILL_CATEGORY_PLANS = [
  {
    domain: 'creator',
    category: 'blog',
    title: 'Creator',
    plannedSkills: ['blog-topic-research', 'blog-research', 'blog-serp-research', 'blog-brief', 'blog-writer', 'blog-seo-review', 'blog-fact-check', 'blog-citation', 'blog-refresh-review'],
  },
  {
    domain: 'creator',
    category: 'medium',
    title: 'Creator',
    plannedSkills: ['medium-audience-research', 'medium-story-angle', 'medium-article-writer', 'medium-title-subtitle-review', 'medium-publication-fit-review'],
  },
  {
    domain: 'creator',
    category: 'linkedin',
    title: 'Creator',
    plannedSkills: ['linkedin-audience-research', 'linkedin-ideation', 'linkedin-post-writer', 'linkedin-carousel-brief', 'linkedin-hook-review', 'linkedin-calendar', 'linkedin-performance-review'],
  },
  {
    domain: 'creator',
    category: 'x-twitter',
    title: 'Creator',
    plannedSkills: ['x-topic-research', 'x-post-writer', 'x-thread-writer', 'x-hook-review', 'x-community-reply-writer', 'x-trend-risk-review'],
  },
  {
    domain: 'creator',
    category: 'facebook',
    title: 'Creator',
    plannedSkills: ['facebook-audience-research', 'facebook-post-writer', 'facebook-group-post-writer', 'facebook-adjacent-content-review', 'facebook-community-engagement-planner'],
  },
  {
    domain: 'creator',
    category: 'pinterest',
    title: 'Creator',
    plannedSkills: ['pinterest-keyword-research', 'pinterest-pin-title-description-writer', 'pinterest-board-planner', 'pinterest-visual-brief', 'pinterest-seasonality-review'],
  },
  {
    domain: 'creator',
    category: 'instagram',
    title: 'Creator',
    plannedSkills: ['instagram-caption-writer', 'instagram-carousel-brief', 'instagram-reel-scriptwriter', 'instagram-hashtag-review', 'instagram-visual-direction'],
  },
  {
    domain: 'creator',
    category: 'snapchat',
    title: 'Creator',
    plannedSkills: ['snapchat-story-planner', 'snapchat-short-copywriter', 'snapchat-ar-filter-brief', 'snapchat-youth-safety-review'],
  },
  {
    domain: 'creator',
    category: 'tiktok',
    title: 'Creator',
    plannedSkills: ['tiktok-trend-research', 'tiktok-hook-writer', 'tiktok-scriptwriter', 'tiktok-shot-list', 'tiktok-retention-review', 'tiktok-safety-review'],
  },
  {
    domain: 'creator',
    category: 'youtube',
    title: 'Creator',
    plannedSkills: ['youtube-topic-research', 'youtube-title-thumbnail-brief', 'youtube-thumbnail-brief', 'youtube-scriptwriter', 'youtube-retention-review', 'youtube-chapter-writer', 'youtube-description-tags-writer', 'youtube-community-post-writer'],
  },
  {
    domain: 'creator',
    category: 'short-video',
    title: 'Creator',
    plannedSkills: ['short-video-ideation', 'short-video-scriptwriter', 'short-video-shot-list', 'short-video-caption-writer', 'short-video-platform-adapter'],
  },
  {
    domain: 'creator',
    category: 'podcast',
    title: 'Creator',
    plannedSkills: ['podcast-topic-research', 'podcast-outline-writer', 'podcast-interview-question-writer', 'podcast-show-notes-writer', 'podcast-clip-repurposing'],
  },
  {
    domain: 'creator',
    category: 'newsletter',
    title: 'Creator',
    plannedSkills: ['newsletter-audience-research', 'newsletter-issue-planner', 'newsletter-writer', 'newsletter-subject-line-review', 'newsletter-sponsorship-copy-review'],
  },
  {
    domain: 'creator',
    category: 'substack',
    title: 'Creator',
    plannedSkills: ['substack-positioning', 'substack-issue-writer', 'substack-paid-free-strategy', 'substack-community-thread-writer', 'substack-retention-review'],
  },
  {
    domain: 'creator',
    category: 'book',
    title: 'Creator',
    plannedSkills: ['book-positioning', 'book-outline-writer', 'book-chapter-writer', 'book-continuity-review', 'book-developmental-edit', 'book-citation-review'],
  },
  {
    domain: 'creator',
    category: 'course',
    title: 'Creator',
    plannedSkills: ['course-audience-research', 'course-curriculum-planner', 'course-lesson-writer', 'course-exercise-generator', 'course-learning-outcome-review'],
  },
  {
    domain: 'creator',
    category: 'webinar',
    title: 'Creator',
    plannedSkills: ['webinar-topic-research', 'webinar-outline-writer', 'webinar-slide-brief', 'webinar-promo-copywriter', 'webinar-followup-sequence'],
  },
  {
    domain: 'creator',
    category: 'resume',
    title: 'Creator',
    plannedSkills: ['resume-role-research', 'resume-writer', 'resume-ats-review', 'resume-tailoring', 'cover-letter-writer', 'linkedin-profile-optimizer'],
  },
] as const satisfies readonly DomainSkillCategoryPlan[];
