import { registerSkillSpecs } from "../../registries/index.js";

import { BLOG_DOMAIN_SKILL_SPECS } from "./blog/index.js";
import { MEDIUM_DOMAIN_SKILL_SPECS } from "./medium/index.js";
import { LINKEDIN_DOMAIN_SKILL_SPECS } from "./linkedin/index.js";
import { X_TWITTER_DOMAIN_SKILL_SPECS } from "./x-twitter/index.js";
import { FACEBOOK_DOMAIN_SKILL_SPECS } from "./facebook/index.js";
import { PINTEREST_DOMAIN_SKILL_SPECS } from "./pinterest/index.js";
import { INSTAGRAM_DOMAIN_SKILL_SPECS } from "./instagram/index.js";
import { SNAPCHAT_DOMAIN_SKILL_SPECS } from "./snapchat/index.js";
import { TIKTOK_DOMAIN_SKILL_SPECS } from "./tiktok/index.js";
import { YOUTUBE_DOMAIN_SKILL_SPECS } from "./youtube/index.js";
import { SHORT_VIDEO_DOMAIN_SKILL_SPECS } from "./short-video/index.js";
import { PODCAST_DOMAIN_SKILL_SPECS } from "./podcast/index.js";
import { NEWSLETTER_DOMAIN_SKILL_SPECS } from "./newsletter/index.js";
import { SUBSTACK_DOMAIN_SKILL_SPECS } from "./substack/index.js";
import { BOOK_DOMAIN_SKILL_SPECS } from "./book/index.js";
import { COURSE_DOMAIN_SKILL_SPECS } from "./course/index.js";
import { WEBINAR_DOMAIN_SKILL_SPECS } from "./webinar/index.js";
import { RESUME_DOMAIN_SKILL_SPECS } from "./resume/index.js";

export { defineCreatorSkillSpec } from "./creator-skill-utils.js";
export type { CreatorSkillDefinition } from "./creator-skill-utils.js";
export { BLOG_DOMAIN_SKILL_SPECS } from "./blog/index.js";
export { MEDIUM_DOMAIN_SKILL_SPECS } from "./medium/index.js";
export { LINKEDIN_DOMAIN_SKILL_SPECS } from "./linkedin/index.js";
export { X_TWITTER_DOMAIN_SKILL_SPECS } from "./x-twitter/index.js";
export { FACEBOOK_DOMAIN_SKILL_SPECS } from "./facebook/index.js";
export { PINTEREST_DOMAIN_SKILL_SPECS } from "./pinterest/index.js";
export { INSTAGRAM_DOMAIN_SKILL_SPECS } from "./instagram/index.js";
export { SNAPCHAT_DOMAIN_SKILL_SPECS } from "./snapchat/index.js";
export { TIKTOK_DOMAIN_SKILL_SPECS } from "./tiktok/index.js";
export { YOUTUBE_DOMAIN_SKILL_SPECS } from "./youtube/index.js";
export { SHORT_VIDEO_DOMAIN_SKILL_SPECS } from "./short-video/index.js";
export { PODCAST_DOMAIN_SKILL_SPECS } from "./podcast/index.js";
export { NEWSLETTER_DOMAIN_SKILL_SPECS } from "./newsletter/index.js";
export { SUBSTACK_DOMAIN_SKILL_SPECS } from "./substack/index.js";
export { BOOK_DOMAIN_SKILL_SPECS } from "./book/index.js";
export { COURSE_DOMAIN_SKILL_SPECS } from "./course/index.js";
export { WEBINAR_DOMAIN_SKILL_SPECS } from "./webinar/index.js";
export { RESUME_DOMAIN_SKILL_SPECS } from "./resume/index.js";

export const CREATOR_DOMAIN_SKILL_SPECS = [
  ...BLOG_DOMAIN_SKILL_SPECS,
  ...MEDIUM_DOMAIN_SKILL_SPECS,
  ...LINKEDIN_DOMAIN_SKILL_SPECS,
  ...X_TWITTER_DOMAIN_SKILL_SPECS,
  ...FACEBOOK_DOMAIN_SKILL_SPECS,
  ...PINTEREST_DOMAIN_SKILL_SPECS,
  ...INSTAGRAM_DOMAIN_SKILL_SPECS,
  ...SNAPCHAT_DOMAIN_SKILL_SPECS,
  ...TIKTOK_DOMAIN_SKILL_SPECS,
  ...YOUTUBE_DOMAIN_SKILL_SPECS,
  ...SHORT_VIDEO_DOMAIN_SKILL_SPECS,
  ...PODCAST_DOMAIN_SKILL_SPECS,
  ...NEWSLETTER_DOMAIN_SKILL_SPECS,
  ...SUBSTACK_DOMAIN_SKILL_SPECS,
  ...BOOK_DOMAIN_SKILL_SPECS,
  ...COURSE_DOMAIN_SKILL_SPECS,
  ...WEBINAR_DOMAIN_SKILL_SPECS,
  ...RESUME_DOMAIN_SKILL_SPECS,
] as const;

registerSkillSpecs(CREATOR_DOMAIN_SKILL_SPECS);
