import type { CreatorPack, CreatorPackConfig } from '../creator/types.js';
import { validateCreatorPack } from '../creator/types.js';
import {
  AudienceResearchSkill,
  BlogWriterSkill,
  BookWriterSkill,
  BrandVoiceSkill,
  ClaimRiskReviewSkill,
  ContentBriefSkill,
  ContentCalendarSkill,
  ContentPositioningSkill,
  CopyReviewSkill,
  CopywriterSkill,
  CreativeDirectionSkill,
  EditorialReviewSkill,
  ExperimentPlannerSkill,
  FactCheckSkill,
  NewsletterWriterSkill,
  PerformanceAnalysisSkill,
  PublishQaSkill,
  RepurposingSkill,
  ResearchSynthesisSkill,
  SeoReviewSkill,
  SeoStrategySkill,
  SerpBriefSkill,
  SocialWriterSkill,
  VideoIdeationSkill,
  VideoScriptwriterSkill,
} from '../skills/creator-skills.js';
import type { AgentSkill } from '../skills/types.js';

export type { CreatorPack, CreatorPackConfig } from '../creator/types.js';

function createMetadataOnlyPack(
  name: string,
  description: string,
  attachments: readonly AgentSkill[],
  config?: CreatorPackConfig
): CreatorPack {
  const skills = attachments.map((skill) => skill.name);
  const manifests = attachments.map((skill) => skill.skillMetadata?.creator).filter((item) => item !== undefined);
  return validateCreatorPack({
    type: 'creator-pack',
    name,
    description,
    attachments,
    ...(config !== undefined && { config }),
    manifest: {
      name,
      description,
      skills,
      requiredCapabilities: manifests.flatMap((manifest) => manifest.requiredCapabilities),
      optionalCapabilities: manifests.flatMap((manifest) => manifest.optionalCapabilities),
      configFields: Object.keys(config ?? {}),
      sideEffectRisk: manifests.some((manifest) => manifest.sideEffectRisk === 'external')
        ? 'external'
        : 'read',
    },
  });
}

export const CreatorPacks = {
  default(config?: CreatorPackConfig): CreatorPack {
    return createMetadataOnlyPack(
      'creator-default',
      'Safe starter pack for creator writing workflows.',
      [
        AudienceResearchSkill.create(),
        ContentPositioningSkill.create(),
        ContentBriefSkill.create(),
        BlogWriterSkill.create(),
        EditorialReviewSkill.create(),
      ],
      config
    );
  },

  blog(config?: CreatorPackConfig): CreatorPack {
    return createMetadataOnlyPack(
      'creator-blog',
      'Blog and Medium-style article workflow pack.',
      [
        AudienceResearchSkill.create(),
        ContentPositioningSkill.create(),
        ContentBriefSkill.create(),
        ResearchSynthesisSkill.create(),
        BlogWriterSkill.create(),
        EditorialReviewSkill.create(),
        FactCheckSkill.create(),
      ],
      config
    );
  },

  seo(config?: CreatorPackConfig): CreatorPack {
    return createMetadataOnlyPack(
      'creator-seo',
      'SEO strategy and SERP planning workflow pack.',
      [SeoStrategySkill.create(), SerpBriefSkill.create(), FactCheckSkill.create()],
      config
    );
  },

  social(config?: CreatorPackConfig): CreatorPack {
    return createMetadataOnlyPack(
      'creator-social',
      'Social content and repurposing workflow pack.',
      [SocialWriterSkill.create(), RepurposingSkill.create(), BrandVoiceSkill.create(), CopyReviewSkill.create()],
      config
    );
  },

  video(config?: CreatorPackConfig): CreatorPack {
    return createMetadataOnlyPack(
      'creator-video',
      'Video ideation, scripting, and creative direction workflow pack.',
      [VideoIdeationSkill.create(), VideoScriptwriterSkill.create(), CreativeDirectionSkill.create(), RepurposingSkill.create()],
      config
    );
  },

  book(config?: CreatorPackConfig): CreatorPack {
    return createMetadataOnlyPack(
      'creator-book',
      'Book and longform chapter workflow pack.',
      [BookWriterSkill.create(), ContentBriefSkill.create(), ResearchSynthesisSkill.create(), EditorialReviewSkill.create(), BrandVoiceSkill.create()],
      config
    );
  },

  copy(config?: CreatorPackConfig): CreatorPack {
    return createMetadataOnlyPack(
      'creator-copy',
      'Copywriting and conversion review workflow pack.',
      [AudienceResearchSkill.create(), ContentPositioningSkill.create(), CopywriterSkill.create(), CopyReviewSkill.create(), ClaimRiskReviewSkill.create()],
      config
    );
  },

  publishing(config?: CreatorPackConfig): CreatorPack {
    return createMetadataOnlyPack(
      'creator-publishing',
      'Publish QA and content operations workflow pack.',
      [PublishQaSkill.create(), ContentCalendarSkill.create(), SeoReviewSkill.create(), ClaimRiskReviewSkill.create()],
      config
    );
  },

  analytics(config?: CreatorPackConfig): CreatorPack {
    return createMetadataOnlyPack(
      'creator-analytics',
      'Performance analysis and experimentation workflow pack.',
      [PerformanceAnalysisSkill.create(), ExperimentPlannerSkill.create(), SeoStrategySkill.create(), ContentCalendarSkill.create()],
      config
    );
  },
} as const;
