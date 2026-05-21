
import { BLOG_BRIEF_SKILL_SPEC } from './blog-brief.skill.js';
import { BLOG_CITATION_SKILL_SPEC } from './blog-citation.skill.js';
import { BLOG_FACT_CHECK_SKILL_SPEC } from './blog-fact-check.skill.js';
import { BLOG_REFRESH_REVIEW_SKILL_SPEC } from './blog-refresh-review.skill.js';
import { BLOG_RESEARCH_SKILL_SPEC } from './blog-research.skill.js';
import { BLOG_SEO_REVIEW_SKILL_SPEC } from './blog-seo-review.skill.js';
import { BLOG_SERP_RESEARCH_SKILL_SPEC } from './blog-serp-research.skill.js';
import { BLOG_TOPIC_RESEARCH_SKILL_SPEC } from './blog-topic-research.skill.js';
import { BLOG_WRITER_SKILL_SPEC } from './blog-writer.skill.js';

export const BLOG_DOMAIN_SKILL_SPECS = [
  BLOG_BRIEF_SKILL_SPEC,
  BLOG_CITATION_SKILL_SPEC,
  BLOG_FACT_CHECK_SKILL_SPEC,
  BLOG_REFRESH_REVIEW_SKILL_SPEC,
  BLOG_RESEARCH_SKILL_SPEC,
  BLOG_SEO_REVIEW_SKILL_SPEC,
  BLOG_SERP_RESEARCH_SKILL_SPEC,
  BLOG_TOPIC_RESEARCH_SKILL_SPEC,
  BLOG_WRITER_SKILL_SPEC,
] as const;
